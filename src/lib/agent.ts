import "server-only";

import crypto from "node:crypto";
import { LLM_MODEL, formatAmount, toStroops, txExplorer } from "./config";
import { getCatalog } from "./catalog";
import { createNoirClient, authorizeNoirPayment } from "./noir";
import { createVeloCheckout } from "./velo";
import {
  appendAudit,
  mutateState,
  readState,
  readWalletSecrets,
} from "./store";
import type {
  PactumState,
  Service,
  SpendingPolicy,
  Transaction,
  TransactionStep,
} from "./types";

export interface AgentDecision {
  service: Service;
  rationale: string;
  source: "llm" | "planner";
  requestedCap: number | null;
  considered: number;
  rejected: { serviceId: string; reason: string }[];
}

export interface AgentRunOutcome {
  transaction: Transaction;
  state: PactumState;
}

const CAP_PATTERN =
  /(?:under|below|max(?:imum)?|up to|limit(?: of)?|cap(?: of)?|spend(?: up to)?)\s*\$?\s*(\d+(?:\.\d+)?)/i;
const BUDGET_PATTERN =
  /(?:budget(?: of)?|total(?: budget)?)\s*\$?\s*(\d+(?:\.\d+)?)/i;

function extractCap(prompt: string): number | null {
  const match = prompt.match(CAP_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extractBudget(prompt: string): number | null {
  const match = prompt.match(BUDGET_PATTERN);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function committedSpend(state: PactumState): number {
  return state.transactions
    .filter((tx) =>
      ["settled", "awaiting_payment", "settling", "policy_passed"].includes(
        tx.status,
      ),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function remainingBudget(state: PactumState): number {
  return Math.max(0, state.policy.totalBudget - committedSpend(state));
}

const REFUSAL_LABELS: Record<string, string> = {
  no_agent: "no active agent policy is registered for this device",
  wrong_agent: "the policy is bound to a different agent key",
  wrong_asset: "the policy does not allow this asset",
  invalid_amount: "the amount is invalid",
  over_limit: "the amount is over the on-chain per-payment limit",
  expired: "the policy has expired",
  insufficient_escrow: "the escrow balance is insufficient",
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "onto", "over", "under",
  "this", "that", "these", "those", "then", "than", "there", "here",
  "one", "two", "three", "try", "buy", "get", "use", "need", "want",
  "please", "can", "could", "would", "should", "our", "your", "their",
  "its", "his", "her", "them", "they", "you", "we", "all", "any",
  "about", "around", "some", "just", "also", "via", "per", "out",
]);

function keywords(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function scoreService(service: Service, prompt: string): number {
  const words = keywords(prompt);
  const haystack = [
    service.name,
    service.category,
    service.description,
    ...service.tags,
  ]
    .join(" ")
    .toLowerCase();
  const haystackWords = new Set(
    haystack
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
  const categoryWords = new Set(
    service.category
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
  let score = 0;
  for (const word of words) {
    if (haystackWords.has(word)) score += 3;
    if (
      service.tags.some(
        (tag) =>
          tag === word ||
          (word.length > 3 && tag.startsWith(word)) ||
          (tag.length > 3 && word.startsWith(tag)),
      )
    ) {
      score += 4;
    }
    if (categoryWords.has(word)) score += 5;
  }
  if (/(cheap|affordable|low.?cost|budget)/i.test(prompt)) {
    score += Math.max(0, 20 - service.price * 3);
  }
  if (/(best|premium|powerful|fastest|top)/i.test(prompt)) {
    score += service.price;
  }
  return score;
}

function choosePlannerDecision(
  prompt: string,
  services: Service[],
  policy: SpendingPolicy,
  state: PactumState,
): AgentDecision {
  const requestedCap = extractCap(prompt);
  const requestedBudget = extractBudget(prompt);
  const effectiveCap = Math.min(
    policy.perTxCap,
    requestedCap ?? Number.POSITIVE_INFINITY,
  );
  const effectiveBudget = Math.min(
    remainingBudget(state),
    requestedBudget ?? Number.POSITIVE_INFINITY,
  );

  const scored = services
    .filter((service) => policy.allowedServiceIds.includes(service.id))
    .map((service) => ({
      service,
      score: scoreService(service, prompt),
      withinCap: service.price <= effectiveCap + 1e-9,
      withinBudget: service.price <= effectiveBudget + 1e-9,
      merchantAllowed: policy.allowedMerchants.includes(service.merchant),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.service.price - b.service.price;
    });

  // Respect the operator's intent: if any service matches the request, only
  // those are candidates. This prevents the agent from silently substituting
  // an unrelated cheap service when the requested one is over the cap.
  const intentMatches = scored.filter((entry) => entry.score > 0);
  const candidates = intentMatches.length > 0 ? intentMatches : scored;

  const viable = candidates.filter(
    (entry) => entry.withinCap && entry.withinBudget && entry.merchantAllowed,
  );
  const selected = viable[0]?.service ?? candidates[0]?.service ?? services[0];
  const rejected = scored
    .filter((entry) => entry.service.id !== selected.id)
    .slice(0, 3)
    .map((entry) => ({
      serviceId: entry.service.id,
      reason: !entry.withinCap
        ? `over the ${effectiveCap.toFixed(2)} USDC cap`
        : !entry.withinBudget
          ? "over the remaining budget"
          : !entry.merchantAllowed
            ? "merchant not approved"
            : "lower fit for the request",
    }));

  const capLabel = Number.isFinite(effectiveCap)
    ? `${effectiveCap.toFixed(2)} USDC`
    : "the policy cap";
  const alternatives = viable
    .slice(1, 3)
    .map((entry) => `${entry.service.name} at ${entry.service.price.toFixed(2)} USDC`);
  const rationale =
    viable.length > 0
      ? `${selected.name} is the best fit for the request at ${formatAmount(selected.price)} — inside ${capLabel} and within the remaining ${formatAmount(effectiveBudget)} budget.${alternatives.length ? ` Compared against ${alternatives.join(" and ")}.` : ""}`
      : `${selected.name} is the closest catalog match at ${formatAmount(selected.price)}. The policy preflight will decide whether it can be purchased.`;

  return {
    service: selected,
    rationale,
    source: "planner",
    requestedCap,
    considered: scored.length,
    rejected,
  };
}

interface LlmChoice {
  serviceId?: string;
  rationale?: string;
}

async function maybeLlmDecision(
  prompt: string,
  services: Service[],
  policy: SpendingPolicy,
  state: PactumState,
): Promise<AgentDecision | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const catalog = services.map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    price: service.price,
    rail: service.rail,
    tags: service.tags,
  }));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are PACTUM's procurement planner. Choose exactly one service from the provided catalog that best satisfies the user's request. Respect the per-transaction cap and the allowed service list. Never invent a service or a price. Return JSON only: {\"serviceId\": string, \"rationale\": string}. The rationale must be one or two sentences and mention the price and why it fits.",
          },
          {
            role: "user",
            content: JSON.stringify({
              request: prompt,
              policy: {
                perTransactionCap: policy.perTxCap,
                remainingBudget: remainingBudget(state),
                currency: policy.asset,
                allowedServiceIds: policy.allowedServiceIds,
              },
              catalog,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as LlmChoice;
    const service = services.find((item) => item.id === parsed.serviceId);
    if (!service) return null;
    const planner = choosePlannerDecision(prompt, services, policy, state);
    return {
      service,
      rationale: parsed.rationale?.slice(0, 420) || planner.rationale,
      source: "llm",
      requestedCap: extractCap(prompt),
      considered: services.length,
      rejected: planner.rejected.filter((item) => item.serviceId !== service.id),
    };
  } catch {
    return null;
  }
}

function step(
  id: string,
  label: string,
  detail: string,
  status: TransactionStep["status"] = "complete",
): TransactionStep {
  return {
    id,
    label,
    detail,
    status,
    at: status === "complete" ? new Date().toISOString() : undefined,
  };
}

function localPolicyChecks(
  state: PactumState,
  service: Service,
): { ok: boolean; checks: string[]; failure?: string } {
  const policy = state.policy;
  const checks: string[] = [];
  const remaining = remainingBudget(state);

  if (service.price > policy.perTxCap) {
    return {
      ok: false,
      checks,
      failure: `${formatAmount(service.price)} exceeds the ${formatAmount(policy.perTxCap)} per-payment cap.`,
    };
  }
  checks.push(
    `Amount ${formatAmount(service.price)} ≤ ${formatAmount(policy.perTxCap)} per-payment cap`,
  );

  if (service.price > remaining) {
    return {
      ok: false,
      checks,
      failure: `Only ${formatAmount(remaining)} remains in the ${formatAmount(policy.totalBudget)} budget.`,
    };
  }
  checks.push(`${formatAmount(remaining - service.price)} budget remains after this payment`);

  if (!policy.allowedMerchants.includes(service.merchant)) {
    return {
      ok: false,
      checks,
      failure: `Merchant ${service.merchantName} is not on the approved merchant list.`,
    };
  }
  checks.push(`Merchant ${service.merchantName} is approved`);

  if (!policy.allowedServiceIds.includes(service.id)) {
    return {
      ok: false,
      checks,
      failure: `${service.name} is not an approved service category.`,
    };
  }
  checks.push("Service category is approved");

  if (policy.expiresAt && Date.parse(policy.expiresAt) < Date.now()) {
    return {
      ok: false,
      checks,
      failure: "The spending policy expired. Publish a new policy before spending.",
    };
  }
  checks.push("Policy is active and unexpired");

  if (state.mode === "live" && state.identity.policyOnchain) {
    checks.push("Policy is published on Noir AgentRegistry");
  }

  return { ok: true, checks };
}

function newTransaction(
  state: PactumState,
  decision: AgentDecision,
  prompt: string,
  policyChecks: string[],
): Transaction {
  const now = new Date().toISOString();
  const service = decision.service;
  const steps: TransactionStep[] = [
    step(
      "intent",
      "Intent parsed",
      `Request understood as a purchase of ${service.category.toLowerCase()}.`,
    ),
    step(
      "discover",
      "Marketplace scanned",
      `${decision.considered} approved services compared; ${decision.rejected.length ? `${decision.rejected.length} alternatives rejected.` : "best fit selected."}`,
    ),
    step("evaluate", "Service selected", decision.rationale),
    step(
      "policy",
      "Policy preflight",
      policyChecks.join(" · "),
    ),
  ];

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    serviceId: service.id,
    serviceName: service.name,
    category: service.category,
    merchant: service.merchant,
    merchantName: service.merchantName,
    amount: service.price,
    asset: state.identity.assetCode || policyAsset(state),
    rail: service.rail,
    status: "planning",
    prompt,
    rationale: decision.rationale,
    steps,
    policyChecks,
    noirTxHash: null,
    noirClaimTxHash: null,
    veloPaymentIntentId: null,
    veloCheckoutUrl: null,
    stellarTxHash: null,
    explorerUrl: null,
    error: null,
    simulated: state.mode === "sandbox",
  };
}

function policyAsset(state: PactumState): string {
  return state.policy.asset || "USDC";
}

function randomHash(): string {
  return crypto.randomBytes(32).toString("hex");
}

function replaceStep(
  tx: Transaction,
  id: string,
  update: Partial<TransactionStep>,
) {
  const index = tx.steps.findIndex((item) => item.id === id);
  if (index >= 0) {
    tx.steps[index] = { ...tx.steps[index], ...update };
  } else {
    tx.steps.push({
      id,
      label: id,
      detail: "",
      status: "pending",
      ...update,
    });
  }
}

let agentLock = false;

export async function runAgent(prompt: string): Promise<AgentRunOutcome> {
  if (agentLock) {
    throw new Error(
      "PACTUM is already executing a payment. Wait for the current run to finish.",
    );
  }
  agentLock = true;

  try {
    let state = readState();
    const services = getCatalog(state.identity.merchantAddress);

    const decision =
      (await maybeLlmDecision(prompt, services, state.policy, state)) ??
      choosePlannerDecision(prompt, services, state.policy, state);

    const preflight = localPolicyChecks(state, decision.service);

    if (!preflight.ok) {
      const tx = newTransaction(state, decision, prompt, preflight.checks);
      tx.status = "blocked";
      let failure = preflight.failure ?? "Policy blocked the payment.";

      // In live mode, ask the deployed predicate to confirm the refusal so the
      // trace shows the on-chain guardrail, not just the local preflight.
      if (state.mode === "live" && state.identity.policyOnchain) {
        try {
          const check = await createNoirClient().checkPayment({
            deviceHash: state.identity.deviceHash,
            agent: state.identity.agentAddress,
            asset: state.identity.assetSac,
            amount: toStroops(decision.service.price),
          });
          const reason = check.ok
            ? "the on-chain policy would allow this amount; the local policy is stricter"
            : REFUSAL_LABELS[check.reason ?? ""] ??
              `the on-chain predicate returned ${check.reason ?? "false"}`;
          const note = check.ok
            ? `Noir AgentRegistry.check_payment: ${reason}.`
            : `Noir AgentRegistry.check_payment refused: ${reason}.`;
          failure = `${failure} ${note}`;
          tx.steps.push({
            id: "noir-check",
            label: "Noir on-chain check",
            detail: note,
            status: check.ok ? "complete" : "blocked",
            at: new Date().toISOString(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          tx.steps.push({
            id: "noir-check",
            label: "Noir on-chain check",
            detail: `On-chain confirmation unavailable: ${message.slice(0, 160)}. The local block stands.`,
            status: "blocked",
            at: new Date().toISOString(),
          });
        }
      }

      tx.error = failure;
      replaceStep(tx, "policy", {
        label: "Policy blocked the payment",
        detail: failure,
        status: "blocked",
        at: new Date().toISOString(),
      });
      tx.steps.push(
        step("execution", "Execution stopped", "No funds moved.", "blocked"),
      );
      tx.updatedAt = new Date().toISOString();

      const committed = await mutateState((mutable) => {
        mutable.transactions.unshift(tx);
        appendAudit(mutable, {
          kind: "policy",
          title: "Payment blocked by policy",
          detail: `${decision.service.name} · ${preflight.failure}`,
          level: "warn",
        });
        return mutable;
      });
      return { transaction: tx, state: committed.result };
    }

    const tx = newTransaction(state, decision, prompt, preflight.checks);
    tx.status = "policy_passed";
    tx.steps.push(
      step(
        "authorize",
        "Agent authorization",
        state.mode === "live"
          ? "PACTUM is asking the deployed Noir AgentRegistry to verify the policy."
          : "Sandbox policy engine approved the spend.",
        state.mode === "live" ? "running" : "complete",
      ),
    );
    tx.updatedAt = new Date().toISOString();

    await mutateState((mutable) => {
      mutable.transactions.unshift(tx);
      appendAudit(mutable, {
        kind: "agent",
        title: "Agent selected a service",
        detail: `${decision.service.name} for ${formatAmount(decision.service.price)} via the ${decision.service.rail} rail.`,
        level: "info",
      });
    });

    // Live Noir preflight: the contract's own predicate is the source of truth.
    if (state.mode === "live") {
      try {
        const noir = createNoirClient();
        const check = await noir.checkPayment({
          deviceHash: state.identity.deviceHash,
          agent: state.identity.agentAddress,
          asset: state.identity.assetSac,
          amount: toStroops(tx.amount),
        });
        if (!check.ok) {
          throw new Error(`Noir policy refused the payment (${check.reason}).`);
        }
        replaceStep(tx, "authorize", {
          detail:
            "Noir AgentRegistry.check_payment returned true for this agent, asset and amount.",
          status: "complete",
          at: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        tx.status = "blocked";
        tx.error = message;
        replaceStep(tx, "authorize", {
          detail: message,
          status: "blocked",
          at: new Date().toISOString(),
        });
        tx.steps.push(
          step("execution", "Execution stopped", "No funds moved.", "blocked"),
        );
        tx.updatedAt = new Date().toISOString();
        const committed = await mutateState((mutable) => {
          const index = mutable.transactions.findIndex((item) => item.id === tx.id);
          if (index >= 0) mutable.transactions[index] = tx;
          appendAudit(mutable, {
            kind: "noir",
            title: "Noir refused authorization",
            detail: message.slice(0, 280),
            level: "error",
          });
          return mutable;
        });
        return { transaction: tx, state: committed.result };
      }
    } else {
      replaceStep(tx, "authorize", {
        detail:
          "Sandbox preflight passed: agent key, asset, cap and merchant allowlist all match.",
        status: "complete",
        at: new Date().toISOString(),
      });
    }

    if (state.policy.autoApprove === false) {
      tx.status = "policy_passed";
      tx.steps.push(
        step(
          "execution",
          "Awaiting human approval",
          "Auto-approve is off. Approve this payment to continue.",
          "pending",
        ),
      );
      tx.updatedAt = new Date().toISOString();
      const committed = await mutateState((mutable) => {
        const index = mutable.transactions.findIndex((item) => item.id === tx.id);
        if (index >= 0) mutable.transactions[index] = tx;
        appendAudit(mutable, {
          kind: "policy",
          title: "Approval requested",
          detail: `${decision.service.name} is ready to execute and is waiting for the operator.`,
          level: "info",
        });
        return mutable;
      });
      return { transaction: tx, state: committed.result };
    }

    // ── Execute on the selected rail ─────────────────────────────────
    if (decision.service.rail === "noir") {
      tx.status = "settling";
      replaceStep(tx, "authorize", {
        detail: "Agent authorization verified. Executing the escrow payment.",
        status: "complete",
        at: new Date().toISOString(),
      });
      tx.steps.push(
        step(
          "settle",
          "Noir escrow authorization",
          state.mode === "live"
            ? "Submitting payment_escrow.authorize() to Stellar Testnet."
            : "Simulating the escrow authorization.",
          "running",
        ),
      );
      tx.updatedAt = new Date().toISOString();

      try {
        if (state.mode === "live") {
          const secrets = readWalletSecrets();
          if (!secrets) throw new Error("Live wallet secrets are missing. Re-run setup.");
          const result = await authorizeNoirPayment(
            state,
            { merchant: decision.service.merchant, amount: tx.amount },
            secrets,
          );
          tx.noirTxHash = result.noirTxHash;
          tx.noirClaimTxHash = result.noirClaimTxHash;
          tx.stellarTxHash = result.noirClaimTxHash;
          tx.explorerUrl = result.claimExplorerUrl;
          tx.status = "settled";
          replaceStep(tx, "settle", {
            label: "Noir escrow settled",
            detail:
              "PaymentEscrow.authorize() debited the escrow and the merchant claim settled the funds on Stellar Testnet.",
            status: "complete",
            at: new Date().toISOString(),
            txHash: result.noirClaimTxHash,
            explorerUrl: result.claimExplorerUrl,
          });
          tx.steps.push(
            step(
              "claim",
              "Merchant claim confirmed",
              `Pending merchant balance moved from ${Number(result.pendingBefore) / 10_000_000} to ${Number(result.pendingAfter) / 10_000_000} ${tx.asset}.`,
              "complete",
            ),
          );
          tx.steps[tx.steps.length - 1].txHash = result.noirTxHash;
          tx.steps[tx.steps.length - 1].explorerUrl = result.explorerUrl;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 900));
          const authorizeHash = randomHash();
          const claimHash = randomHash();
          tx.noirTxHash = authorizeHash;
          tx.noirClaimTxHash = claimHash;
          tx.stellarTxHash = claimHash;
          tx.explorerUrl = txExplorer(claimHash);
          tx.status = "settled";
          replaceStep(tx, "settle", {
            label: "Noir escrow settled (sandbox)",
            detail:
              "Sandbox escrow authorization and merchant claim completed. Initialize the live vault for a real Testnet hash.",
            status: "complete",
            at: new Date().toISOString(),
            txHash: claimHash,
            explorerUrl: tx.explorerUrl,
          });
        }

        tx.updatedAt = new Date().toISOString();
        const committed = await mutateState((mutable) => {
          const index = mutable.transactions.findIndex((item) => item.id === tx.id);
          if (index >= 0) mutable.transactions[index] = tx;
          mutable.identity.escrowBalance = Math.max(
            0,
            mutable.identity.escrowBalance - tx.amount,
          );
          appendAudit(mutable, {
            kind: "stellar",
            title: "Autonomous payment settled",
            detail: `${tx.serviceName} · ${formatAmount(tx.amount)} paid to ${tx.merchantName} through the Noir escrow rail.`,
            txHash: tx.stellarTxHash ?? null,
            explorerUrl: tx.explorerUrl ?? null,
            level: "success",
          });
          return mutable;
        });
        return { transaction: tx, state: committed.result };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        tx.status = "failed";
        tx.error = message;
        replaceStep(tx, "settle", {
          detail: message,
          status: "failed",
          at: new Date().toISOString(),
        });
        tx.updatedAt = new Date().toISOString();
        const committed = await mutateState((mutable) => {
          const index = mutable.transactions.findIndex((item) => item.id === tx.id);
          if (index >= 0) mutable.transactions[index] = tx;
          appendAudit(mutable, {
            kind: "noir",
            title: "Escrow payment failed",
            detail: message.slice(0, 280),
            level: "error",
          });
          return mutable;
        });
        return { transaction: tx, state: committed.result };
      }
    }

    // ── Velo checkout rail ───────────────────────────────────────────
    tx.status = "settling";
    tx.steps.push(
      step(
        "settle",
        "Velo payment intent",
        "Creating a Velo checkout session for the merchant payment.",
        "running",
      ),
    );
    tx.updatedAt = new Date().toISOString();

    try {
      const checkout = await createVeloCheckout({
        transactionId: tx.id,
        amount: tx.amount,
        description: `PACTUM · ${tx.serviceName} (${tx.category})`,
        asset: "USDC",
      });
      tx.veloPaymentIntentId = checkout.paymentIntentId;
      tx.veloCheckoutUrl = checkout.checkoutUrl;
      tx.status = "awaiting_payment";
      tx.simulated = checkout.sandbox;
      replaceStep(tx, "settle", {
        label: checkout.sandbox
          ? "Velo sandbox checkout ready"
          : "Velo checkout ready",
        detail: checkout.sandbox
          ? "No VELO_API_KEY is configured. Complete the sandbox checkout to settle the payment."
          : "Velo created a hosted Stellar Testnet checkout. Complete it with the payer wallet to settle.",
        status: "running",
        at: new Date().toISOString(),
      });

      tx.updatedAt = new Date().toISOString();
      const committed = await mutateState((mutable) => {
        const index = mutable.transactions.findIndex((item) => item.id === tx.id);
        if (index >= 0) mutable.transactions[index] = tx;
        mutable.velo.lastPaymentIntentId = checkout.paymentIntentId;
        mutable.velo.lastCheckoutUrl = checkout.checkoutUrl;
        mutable.velo.lastSessionAt = new Date().toISOString();
        mutable.velo.configured = !checkout.sandbox;
        appendAudit(mutable, {
          kind: "velo",
          title: checkout.sandbox
            ? "Velo sandbox checkout created"
            : "Velo checkout session created",
          detail: `${tx.serviceName} · ${formatAmount(tx.amount)} · ${checkout.paymentIntentId}`,
          level: "info",
        });
        return mutable;
      });
      return { transaction: tx, state: committed.result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      tx.status = "failed";
      tx.error = message;
      replaceStep(tx, "settle", {
        detail: message,
        status: "failed",
        at: new Date().toISOString(),
      });
      tx.updatedAt = new Date().toISOString();
      const committed = await mutateState((mutable) => {
        const index = mutable.transactions.findIndex((item) => item.id === tx.id);
        if (index >= 0) mutable.transactions[index] = tx;
        appendAudit(mutable, {
          kind: "velo",
          title: "Velo checkout failed",
          detail: message.slice(0, 280),
          level: "error",
        });
        return mutable;
      });
      return { transaction: tx, state: committed.result };
    }
  } finally {
    agentLock = false;
  }
}

export async function settleSandboxVelo(
  transactionId: string,
): Promise<PactumState> {
  const committed = await mutateState((state) => {
    const tx = state.transactions.find((item) => item.id === transactionId);
    if (!tx) throw new Error("Transaction not found");
    if (tx.status !== "awaiting_payment") {
      throw new Error("Only payments awaiting checkout can be settled.");
    }
    const hash = randomHash();
    tx.status = "settled";
    tx.stellarTxHash = hash;
    tx.explorerUrl = txExplorer(hash);
    tx.simulated = true;
    replaceStep(tx, "settle", {
      label: "Velo sandbox checkout completed",
      detail:
        "The sandbox checkout was completed and the payment is marked settled.",
      status: "complete",
      at: new Date().toISOString(),
      txHash: hash,
      explorerUrl: tx.explorerUrl,
    });
    tx.updatedAt = new Date().toISOString();
    appendAudit(state, {
      kind: "velo",
      title: "Velo sandbox payment settled",
      detail: `${tx.serviceName} · ${formatAmount(tx.amount)}`,
      txHash: hash,
      explorerUrl: tx.explorerUrl,
      level: "success",
    });
    return state;
  });
  return committed.result;
}


