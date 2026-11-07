import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Keypair } from "@stellar/stellar-sdk";
import { DEMO_ASSET_CODE, XLM_SAC } from "./config";
import type {
  AuditEvent,
  PactumState,
  SpendingPolicy,
  Transaction,
} from "./types";

const DATA_DIR = process.env.PACTUM_DATA_DIR?.trim()
  ? path.resolve(process.env.PACTUM_DATA_DIR.trim())
  : path.join(process.cwd(), ".data");
const STATE_FILE = path.join(DATA_DIR, "pactum-state.json");
const WALLET_FILE = path.join(DATA_DIR, "wallet.json");

export interface WalletSecrets {
  ownerSecret: string;
  agentSecret: string;
  merchantSecret: string;
  issuerSecret: string;
  ownerAddress: string;
  agentAddress: string;
  merchantAddress: string;
  issuerAddress: string;
  assetCode: string;
  assetIssuer: string;
  assetSac: string;
  deviceHash: string;
  createdAt: string;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function randomHash(): string {
  return crypto.randomBytes(32).toString("hex");
}

function nowMinus(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function defaultPolicy(merchant: string): SpendingPolicy {
  return {
    totalBudget: 500,
    perTxCap: 5,
    asset: DEMO_ASSET_CODE,
    allowedMerchants: [merchant],
    allowedServiceIds: [
      "nebula-ai",
      "vectorly",
      "axiom-cloud",
      "ledgerdb",
      "nameforge",
      "horizon-gpu",
    ],
    autoApprove: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    onchainTxHash: null,
  };
}

function seedTransaction(
  partial: Pick<
    Transaction,
    | "serviceId"
    | "serviceName"
    | "category"
    | "merchantName"
    | "amount"
    | "rail"
    | "status"
    | "prompt"
    | "rationale"
    | "createdAt"
  > & { merchant: string; hash?: string | null },
): Transaction {
  const id = crypto.randomUUID();
  const settled = partial.status === "settled";
  const hash = partial.hash ?? (settled ? randomHash() : null);
  return {
    id,
    createdAt: partial.createdAt,
    updatedAt: partial.createdAt,
    serviceId: partial.serviceId,
    serviceName: partial.serviceName,
    category: partial.category,
    merchant: partial.merchant,
    merchantName: partial.merchantName,
    amount: partial.amount,
    asset: DEMO_ASSET_CODE,
    rail: partial.rail,
    status: partial.status,
    prompt: partial.prompt,
    rationale: partial.rationale,
    policyChecks: [
      "Agent key authorized in Noir AgentRegistry",
      `Amount ${partial.amount.toFixed(2)} USDC is within the 10.00 USDC per-payment cap`,
      "Merchant is on the approved list",
      "Escrow balance covers the payment",
    ],
    steps: [
      {
        id: "discover",
        label: "Discovered service",
        detail: `Matched ${partial.serviceName} from the approved catalog.`,
        status: "complete",
        at: partial.createdAt,
      },
      {
        id: "evaluate",
        label: "Evaluated options",
        detail: partial.rationale,
        status: "complete",
        at: partial.createdAt,
      },
      {
        id: "noir",
        label: "Noir policy check",
        detail: "AgentRegistry.check_payment returned true.",
        status: "complete",
        at: partial.createdAt,
      },
      {
        id: "settle",
        label:
          partial.rail === "noir"
            ? "Escrow authorization + merchant claim"
            : "Velo checkout workflow",
        detail:
          partial.status === "settled"
            ? "Settlement confirmed on Stellar Testnet."
            : "Waiting for the final settlement event.",
        status: settled ? "complete" : "running",
        at: settled ? partial.createdAt : undefined,
        txHash: hash ?? undefined,
      },
    ],
    noirTxHash: partial.rail === "noir" ? hash : null,
    noirClaimTxHash: partial.rail === "noir" ? hash : null,
    veloPaymentIntentId:
      partial.rail === "velo" ? `pi_demo_${id.slice(0, 8)}` : null,
    veloCheckoutUrl: null,
    stellarTxHash: hash,
    explorerUrl: hash
      ? `https://stellar.expert/explorer/testnet/tx/${hash}`
      : null,
    simulated: true,
  };
}

export function createSandboxState(): PactumState {
  const owner = Keypair.random();
  const agent = Keypair.random();
  const merchant = Keypair.random();
  const created = new Date().toISOString();
  const transactions: Transaction[] = [
    seedTransaction({
      serviceId: "nebula-ai",
      serviceName: "Nebula AI",
      category: "AI Inference API",
      merchantName: "Nebula Labs",
      merchant: merchant.publicKey(),
      amount: 2,
      rail: "noir",
      status: "settled",
      prompt: "Buy an affordable AI API subscription for my project.",
      rationale:
        "Nebula AI matched the requested capability at 2.00 USDC — the best value inside the 10.00 USDC per-payment policy.",
      createdAt: nowMinus(31),
    }),
    seedTransaction({
      serviceId: "axiom-cloud",
      serviceName: "Axiom Cloud",
      category: "Cloud Hosting",
      merchantName: "Axiom Infrastructure",
      merchant: merchant.publicKey(),
      amount: 4.5,
      rail: "velo",
      status: "settled",
      prompt: "Deploy the PACTUM dashboard on managed cloud hosting.",
      rationale:
        "Axiom Cloud offered managed hosting with TLS and autoscaling at 4.50 USDC — within the policy and under the remaining budget.",
      createdAt: nowMinus(19),
    }),
    seedTransaction({
      serviceId: "ledgerdb",
      serviceName: "LedgerDB",
      category: "Managed Database",
      merchantName: "Ledger Data Co.",
      merchant: merchant.publicKey(),
      amount: 3.25,
      rail: "noir",
      status: "settled",
      prompt: "Provision a managed Postgres database for the agent audit log.",
      rationale:
        "LedgerDB was the lowest-cost managed Postgres option that satisfies the recovery and SLA requirements.",
      createdAt: nowMinus(6),
    }),
    seedTransaction({
      serviceId: "nameforge",
      serviceName: "NameForge",
      category: "Domain Registration",
      merchantName: "NameForge Registrar",
      merchant: merchant.publicKey(),
      amount: 1.75,
      rail: "velo",
      status: "awaiting_payment",
      prompt: "Register a production domain for the PACTUM launch.",
      rationale:
        "NameForge is the approved registrar and 1.75 USDC is below the per-transaction cap. Velo checkout is waiting for the cardholder.",
      createdAt: nowMinus(0.4),
    }),
  ];

  const audit: AuditEvent[] = [
    {
      id: crypto.randomUUID(),
      at: nowMinus(48),
      kind: "system",
      title: "PACTUM sandbox initialized",
      detail:
        "A local sandbox vault was created. Initialize the Testnet vault to write real state to Noir.",
      level: "info",
    },
    {
      id: crypto.randomUUID(),
      at: nowMinus(31),
      kind: "noir",
      title: "Escrow payment authorized",
      detail:
        "The agent authorized 2.00 USDC to Nebula Labs within the on-chain policy.",
      txHash: transactions[0].noirTxHash ?? null,
      explorerUrl: transactions[0].explorerUrl,
      level: "success",
    },
    {
      id: crypto.randomUUID(),
      at: nowMinus(19),
      kind: "velo",
      title: "Velo payment settled",
      detail:
        "Axiom Cloud payment completed through the Velo payment workflow.",
      txHash: transactions[1].stellarTxHash ?? null,
      explorerUrl: transactions[1].explorerUrl,
      level: "success",
    },
    {
      id: crypto.randomUUID(),
      at: nowMinus(6),
      kind: "policy",
      title: "Policy evaluated",
      detail:
        "PACTUM confirmed the agent key, per-payment cap, merchant allowlist and escrow balance.",
      level: "info",
    },
  ];

  return {
    version: 1,
    mode: "sandbox",
    identity: {
      mode: "sandbox",
      network: "testnet",
      ownerAddress: owner.publicKey(),
      agentAddress: agent.publicKey(),
      merchantAddress: merchant.publicKey(),
      deviceHash: randomHash(),
      deviceLabel: "PACTUM Agent Pass · sandbox",
      assetCode: DEMO_ASSET_CODE,
      assetIssuer: null,
      assetSac: XLM_SAC,
      escrowBalance: 120,
      escrowToken: null,
      policyOnchain: false,
      createdAt: created,
      bootstrapTxHashes: {},
    },
    policy: defaultPolicy(merchant.publicKey()),
    transactions,
    audit,
    lastSync: created,
    bootstrap: { status: "idle", completedSteps: [] },
    velo: {
      configured: false,
      environment: "testnet",
      lastPaymentIntentId: transactions[1].veloPaymentIntentId ?? null,
      lastCheckoutUrl: null,
      lastSessionAt: null,
      webhookPath: "/api/velo/webhook",
    },
    llm: {
      configured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.PACTUM_LLM_MODEL ?? "gpt-4o-mini",
    },
  };
}

export function stateExists(): boolean {
  return fs.existsSync(STATE_FILE);
}

export function readWalletSecrets(): WalletSecrets | null {
  try {
    if (!fs.existsSync(WALLET_FILE)) return null;
    return JSON.parse(fs.readFileSync(WALLET_FILE, "utf8")) as WalletSecrets;
  } catch {
    return null;
  }
}

export function writeWalletSecrets(secrets: WalletSecrets) {
  ensureDataDir();
  fs.writeFileSync(WALLET_FILE, JSON.stringify(secrets, null, 2), "utf8");
}

export function readState(): PactumState {
  ensureDataDir();
  if (!fs.existsSync(STATE_FILE)) {
    const seeded = createSandboxState();
    writeState(seeded);
    return seeded;
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as PactumState;
  } catch {
    const seeded = createSandboxState();
    writeState(seeded);
    return seeded;
  }
}

export function writeState(state: PactumState) {
  ensureDataDir();
  state.lastSync = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  return state;
}

let mutationQueue: Promise<unknown> = Promise.resolve();

/**
 * Serialize mutations so simultaneous agent runs cannot clobber one another.
 */
export function mutateState<T>(
  mutator: (state: PactumState) => T | Promise<T>,
): Promise<{ state: PactumState; result: T }> {
  const run = mutationQueue.then(async () => {
    const state = readState();
    const result = await mutator(state);
    writeState(state);
    return { state, result };
  });
  mutationQueue = run.catch(() => undefined);
  return run;
}

export function appendAudit(
  state: PactumState,
  event: Omit<AuditEvent, "id" | "at"> & { at?: string },
) {
  state.audit.unshift({
    id: crypto.randomUUID(),
    at: event.at ?? new Date().toISOString(),
    ...event,
  });
  state.audit = state.audit.slice(0, 80);
}

export function resetStore() {
  ensureDataDir();
  if (fs.existsSync(STATE_FILE)) fs.rmSync(STATE_FILE);
  if (fs.existsSync(WALLET_FILE)) fs.rmSync(WALLET_FILE);
}
