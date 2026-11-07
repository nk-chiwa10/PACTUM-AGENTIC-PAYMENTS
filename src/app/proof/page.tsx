"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Cloud,
  Code2,
  Download,
  ExternalLink,
  Fingerprint,
  FlaskConical,
  KeyRound,
  Landmark,
  Layers,
  Loader2,
  Network,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Webhook,
  XCircle,
  Zap,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import {
  Badge,
  Button,
  CopyButton,
  LinkButton,
  Panel,
  PanelHeader,
  SectionHeading,
} from "@/components/ui";
import { NOIR_CONTRACTS, RPC_URL } from "@/lib/config";
import { cn, formatCurrency, formatDate, relativeTime, shortHash } from "@/lib/utils";

interface ContractCheck {
  reachable: boolean;
  latencyMs: number;
  error?: string;
}

interface ProofResult {
  ok: boolean;
  contracts: Record<string, ContractCheck>;
  checkedAt: string;
  error?: string;
}

const CONTRACT_META: Record<
  string,
  { label: string; id: string; role: string; icon: typeof Server }
> = {
  deviceRegistry: {
    label: "device_registry",
    id: NOIR_CONTRACTS.deviceRegistry,
    role: "Binds the device hash to the owner wallet and the agent key.",
    icon: Fingerprint,
  },
  agentRegistry: {
    label: "agent_registry",
    id: NOIR_CONTRACTS.agentRegistry,
    role: "Stores max_amount, asset and expiry. check_payment is the predicate.",
    icon: KeyRound,
  },
  paymentEscrow: {
    label: "payment_escrow",
    id: NOIR_CONTRACTS.paymentEscrow,
    role: "Holds escrow, authorizes agent payments and settles merchant claims.",
    icon: Landmark,
  },
};

const STACK = [
  { label: "Next.js", version: "16.4.5" },
  { label: "React", version: "19.3.1" },
  { label: "Noir SDK", version: "0.3.0" },
  { label: "Velo SDK", version: "1.0.0" },
  { label: "Stellar SDK", version: "16.4.1" },
];

interface VeloCheckoutProof {
  sandbox: boolean;
  paymentIntentId: string;
  checkoutUrl: string | null;
  status: string;
  asset: string;
  amount: string;
}

export default function ProofPage() {
  const { state, velo, setBootstrapOpen } = usePactum();
  const [proof, setProof] = useState<ProofResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<VeloCheckoutProof | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/noir/status", { method: "POST" });
      const payload = (await response.json()) as ProofResult & {
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Verification failed.");
      setProof(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void verify();
  }, [verify]);

  async function createCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/velo/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount: 1,
          asset: "USDC",
          description: "PACTUM · Velo integration proof session",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Velo checkout failed.");
      }
      setCheckout(payload as VeloCheckoutProof);
    } catch (caught) {
      setCheckoutError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setCheckoutLoading(false);
    }
  }

  function downloadProof() {
    const bundle = {
      project: "PACTUM — Autonomous AI Agent for Paying Digital Services",
      tagline: "Intelligence in Motion. Trust in Every Transaction.",
      generatedAt: new Date().toISOString(),
      network: "Stellar Testnet",
      mode: state.mode,
      noirProof: proof,
      noirContracts: NOIR_CONTRACTS,
      veloStatus: velo,
      identity: state.identity,
      policy: state.policy,
      transactions: state.transactions,
      audit: state.audit,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `pactum-proof-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const reachableCount = proof
    ? Object.values(proof.contracts).filter((check) => check.reachable).length
    : 0;
  const totalContracts = Object.keys(CONTRACT_META).length;
  const live = state.mode === "live";
  const proofTxs = state.transactions.flatMap((tx) => {
    if (tx.simulated) return [];
    const rows: { label: string; hash: string; service: string }[] = [];
    if (tx.noirTxHash)
      rows.push({ label: "authorize", hash: tx.noirTxHash, service: tx.serviceName });
    if (tx.noirClaimTxHash)
      rows.push({ label: "claim", hash: tx.noirClaimTxHash, service: tx.serviceName });
    if (tx.stellarTxHash && tx.stellarTxHash !== tx.noirClaimTxHash)
      rows.push({ label: "settlement", hash: tx.stellarTxHash, service: tx.serviceName });
    return rows;
  });

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Don't trust, verify"
        title="On-chain Proof"
        description="Live reads against the Noir contracts referenced by the hackathon brief, plus the Velo SDK configuration and every transaction hash PACTUM has produced."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              loading={loading}
              onClick={() => void verify()}
              icon={RefreshCw}
            >
              Re-run verification
            </Button>
            <Button size="sm" variant="outline" onClick={downloadProof} icon={Download}>
              Proof bundle
            </Button>
          </div>
        }
      />

      {/* Status strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ProofMetric
          label="Noir contracts"
          value={loading ? "Checking…" : `${reachableCount}/${totalContracts}`}
          detail={
            loading
              ? "Reading contract instances"
              : reachableCount === totalContracts
                ? "All reachable on Testnet"
                : "See contract panel below"
          }
          ok={reachableCount === totalContracts && !loading}
          icon={Boxes}
        />
        <ProofMetric
          label="Escrow state"
          value={formatCurrency(state.identity.escrowBalance, state.identity.assetCode)}
          detail={
            live ? "payment_escrow · live balance" : "Sandbox — initialize to go live"
          }
          ok={live}
          icon={Landmark}
        />
        <ProofMetric
          label="Velo SDK"
          value={velo?.configured ? "Connected" : "Sandbox"}
          detail={
            velo?.configured
              ? `${velo.environment} · API key detected`
              : "Add VELO_API_KEY for hosted checkout"
          }
          ok={Boolean(velo?.configured)}
          icon={CircleDollarSign}
        />
        <ProofMetric
          label="Payments settled"
          value={String(state.transactions.filter((tx) => tx.status === "settled").length)}
          detail={`${proofTxs.length} on-chain artifacts`}
          ok={state.transactions.some((tx) => tx.status === "settled")}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-4">
          {/* Contract verification */}
          <Panel>
            <PanelHeader
              title="Noir Testnet deployment"
              subtitle="Read directly from Soroban RPC — no Noir server, no API key."
              action={
                proof ? (
                  <Badge tone={proof.ok ? "success" : "danger"} dot pulse={loading}>
                    {proof.ok ? "Verified" : "Degraded"}
                  </Badge>
                ) : (
                  <Badge tone="neutral" dot pulse={loading}>
                    {loading ? "Verifying" : "Idle"}
                  </Badge>
                )
              }
            />
            <div className="divide-y divide-white/[0.05]">
              {Object.entries(CONTRACT_META).map(([key, meta]) => {
                const check = proof?.contracts[key];
                const healthy = check?.reachable;
                const Icon = meta.icon;
                return (
                  <div key={key} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-xl border",
                          loading
                            ? "border-white/10 bg-white/[0.03] text-ink-400"
                            : healthy
                              ? "border-mint-500/20 bg-mint-500/[0.08] text-mint-300"
                              : "border-rose-500/20 bg-rose-500/[0.08] text-rose-300",
                        )}
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono text-[11px] text-ink-100">
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-2">
                            {loading && (
                              <span className="text-[9px] text-ink-500">reading…</span>
                            )}
                            {!loading && check && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 text-[9px]",
                                  healthy ? "text-mint-400" : "text-rose-400",
                                )}
                              >
                                {healthy ? (
                                  <CheckCircle2 className="size-3" />
                                ) : (
                                  <XCircle className="size-3" />
                                )}
                                {healthy ? `${check.latencyMs} ms` : "unreachable"}
                              </span>
                            )}
                            <a
                              href={`https://stellar.expert/explorer/testnet/contract/${meta.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-500 transition hover:text-gold-300"
                              aria-label={`Open ${meta.label} on Stellar Expert`}
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                          </div>
                        </div>
                        <div className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                          {meta.role}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1 rounded-md border border-white/[0.05] bg-ink-950/50 px-2 py-1">
                          <span className="truncate font-mono text-[9px] text-ink-400">
                            {meta.id}
                          </span>
                          <CopyButton value={meta.id} className="ml-auto size-6 shrink-0" />
                        </div>
                        {check?.error && (
                          <div className="mt-1.5 text-[9px] leading-relaxed text-rose-400/80">
                            {check.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3 text-[9px] text-ink-500">
              <span className="flex items-center gap-1.5">
                <Network className="size-3" />
                {RPC_URL}
              </span>
              <span>
                {proof
                  ? `checked ${relativeTime(proof.checkedAt)}`
                  : error
                    ? "verification error"
                    : "waiting for first check"}
              </span>
            </div>
            {error && (
              <div className="border-t border-rose-500/15 bg-rose-500/[0.04] px-5 py-2.5 text-[10px] text-rose-300">
                {error}
              </div>
            )}
          </Panel>

          {/* Live identity */}
          <Panel>
            <PanelHeader
              title="Agent vault"
              subtitle={
                live
                  ? "Real keys and escrow on Stellar Testnet"
                  : "Sandbox vault — run live setup to write on-chain"
              }
              action={
                <Badge tone={live ? "success" : "warning"} dot>
                  {live ? "Live" : "Sandbox"}
                </Badge>
              }
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <IdentityRow label="Owner / vault" value={state.identity.ownerAddress} />
              <IdentityRow label="Agent key" value={state.identity.agentAddress} />
              <IdentityRow label="Merchant" value={state.identity.merchantAddress} />
              <IdentityRow
                label="Asset contract"
                value={state.identity.assetSac}
              />
              <IdentityRow label="Device hash" value={state.identity.deviceHash} mono />
              <IdentityRow
                label="Escrow token"
                value={state.identity.escrowToken ?? state.identity.assetSac}
                mono
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-5 py-3">
              <div className="flex flex-wrap items-center gap-3 text-[9px] text-ink-500">
                <span className="flex items-center gap-1">
                  <Radio className="size-3" />
                  {state.identity.deviceLabel}
                </span>
                <span>{formatDate(state.identity.createdAt)}</span>
              </div>
              {!live && (
                <button
                  onClick={() => setBootstrapOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/10 px-3 text-[10px] font-medium text-gold-300 transition hover:bg-gold-500/[0.16]"
                >
                  <FlaskConical className="size-3" />
                  Initialize Testnet vault
                </button>
              )}
            </div>
          </Panel>

          {/* Architecture */}
          <Panel>
            <PanelHeader
              title="Architecture"
              subtitle="One agent, two payment rails, verifiable every step."
            />
            <div className="p-5">
              <div className="grid gap-2 sm:grid-cols-5">
                {[
                  { icon: Terminal, label: "Goal", detail: "Natural language" },
                  { icon: Bot, label: "Planner", detail: "Selects service" },
                  { icon: ShieldCheck, label: "Noir policy", detail: "check_payment" },
                  { icon: Layers, label: "Rails", detail: "Noir / Velo" },
                  { icon: Landmark, label: "Stellar", detail: "Settlement" },
                ].map((node, index) => (
                  <div key={node.label} className="relative">
                    <div className="flex h-full flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-3 text-center">
                      <span className="grid size-8 place-items-center rounded-lg border border-gold-500/15 bg-gold-500/[0.07] text-gold-300">
                        <node.icon className="size-4" />
                      </span>
                      <div className="mt-2 text-[10px] font-medium text-ink-100">
                        {node.label}
                      </div>
                      <div className="text-[8px] uppercase tracking-[0.08em] text-ink-500">
                        {node.detail}
                      </div>
                    </div>
                    {index < 4 && (
                      <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-ink-500 sm:block">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {STACK.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 text-[9px] text-ink-400"
                  >
                    <Code2 className="size-3 text-violet-300/80" />
                    {item.label}
                    <span className="font-mono text-ink-500">{item.version}</span>
                  </span>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          {/* Velo */}
          <Panel>
            <PanelHeader
              title="Velo integration"
              subtitle="Server-side SDK · hosted checkout · signed webhooks"
              action={
                <Badge tone={velo?.configured ? "success" : "violet"} dot>
                  {velo?.configured ? "Live key" : "Sandbox"}
                </Badge>
              }
            />
            <div className="space-y-3 p-5">
              <div className="space-y-2">
                <KeyValue label="Environment" value={velo?.environment ?? "testnet"} />
                <KeyValue
                  label="Base URL"
                  value={velo?.baseUrl ?? "https://www.velo-build.dev"}
                  mono
                />
                <KeyValue
                  label="Webhook"
                  value={velo?.webhookPath ?? "/api/velo/webhook"}
                  mono
                />
                <KeyValue
                  label="Signing secret"
                  value={
                    velo?.webhookConfigured
                      ? "configured · HMAC-SHA256"
                      : "not configured"
                  }
                  tone={velo?.webhookConfigured ? "mint" : "muted"}
                />
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-ink-950/50 px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-ink-500">
                  <Webhook className="size-3" />
                  SDK call
                </div>
                <pre className="mt-1.5 overflow-x-auto font-mono text-[9px] leading-relaxed text-violet-200/80">
{`velo.checkout.sessions.create({
  amount: "2.00",
  asset: "USDC",
  anchor: "inhouse"
}, { idempotencyKey })`}
                </pre>
              </div>

              <Button
                variant="violet"
                size="sm"
                className="w-full"
                loading={checkoutLoading}
                onClick={() => void createCheckout()}
                icon={Cloud}
              >
                Create a Velo checkout
              </Button>

              {checkoutError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/15 bg-rose-500/[0.05] px-2.5 py-2 text-[9px] leading-relaxed text-rose-300">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0" />
                  {checkoutError}
                </div>
              )}

              {checkout && (
                <div className="rounded-lg border border-violet-500/15 bg-violet-500/[0.05] px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium text-violet-200">
                      {checkout.status} · {checkout.amount} {checkout.asset}
                    </span>
                    <Badge tone={checkout.sandbox ? "neutral" : "success"} dot>
                      {checkout.sandbox ? "sandbox" : "live"}
                    </Badge>
                  </div>
                  <div className="mt-1 font-mono text-[9px] text-ink-400">
                    {checkout.paymentIntentId}
                  </div>
                  {checkout.checkoutUrl ? (
                    <a
                      href={checkout.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium text-violet-300 hover:text-violet-200"
                    >
                      Open hosted checkout
                      <ArrowUpRight className="size-3" />
                    </a>
                  ) : (
                    <div className="mt-1.5 text-[9px] leading-relaxed text-ink-500">
                      No VELO_API_KEY set, so the SDK returned a sandbox session.
                      Add a Testnet key to create a hosted checkout URL.
                    </div>
                  )}
                </div>
              )}

              {velo?.lastCheckoutUrl && (
                <a
                  href={velo.lastCheckoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[9px] text-ink-300 transition hover:text-ink-100"
                >
                  Last checkout session
                  <ArrowUpRight className="size-3" />
                </a>
              )}
            </div>
          </Panel>

          {/* Artifacts */}
          <Panel>
            <PanelHeader
              title="On-chain artifacts"
              subtitle="Every hash produced by the agent"
              action={<Badge tone="neutral">{proofTxs.length}</Badge>}
            />
            <div className="max-h-[330px] overflow-y-auto">
              {proofTxs.length === 0 ? (
                <div className="px-5 py-8 text-center text-[10px] text-ink-500">
                  No on-chain hashes yet. Run a live payment to generate
                  verifiable artifacts.
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.04]">
                  {proofTxs.map((row) => (
                    <li
                      key={`${row.label}-${row.hash}`}
                      className="flex items-center gap-2 px-4 py-2.5"
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded border border-gold-500/15 bg-gold-500/[0.06] text-gold-300">
                        <BadgeCheck className="size-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[10px] text-ink-200">
                            {row.service}
                          </span>
                          <span className="text-[8px] uppercase tracking-[0.08em] text-ink-500">
                            {row.label}
                          </span>
                        </div>
                        <div className="font-mono text-[9px] text-ink-500">
                          {shortHash(row.hash)}
                        </div>
                      </div>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${row.hash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ink-500 transition hover:text-gold-300"
                        aria-label="Open transaction"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-white/[0.06] px-4 py-2.5 text-[9px] text-ink-500">
              <div className="flex items-center justify-between">
                <span>Audit events</span>
                <span className="font-mono">{state.audit.length}</span>
              </div>
            </div>
          </Panel>

          {/* Reproduce */}
          <Panel>
            <PanelHeader
              title="Run it locally"
              subtitle="Deterministic, reproducible demo"
              action={<Code2 className="size-4 text-ink-400" />}
            />
            <div className="space-y-2 p-5 font-mono text-[9px] leading-relaxed text-ink-300">
              <CodeLine>npm install</CodeLine>
              <CodeLine>cp .env.example .env.local</CodeLine>
              <CodeLine>npm run dev</CodeLine>
              <div className="pt-1 text-[9px] font-sans text-ink-500">
                Optional keys:{" "}
                <span className="font-mono text-ink-400">VELO_API_KEY</span>,{" "}
                <span className="font-mono text-ink-400">OPENAI_API_KEY</span>.
                Without them PACTUM runs the sandbox vault and deterministic
                planner.
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <LinkButton
                  href="https://github.com/noirx402/noir"
                  external
                  variant="ghost"
                  size="sm"
                  icon={ExternalLink}
                >
                  Noir
                </LinkButton>
                <LinkButton
                  href="https://www.velo-build.dev"
                  external
                  variant="ghost"
                  size="sm"
                  icon={ExternalLink}
                >
                  Velo
                </LinkButton>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="border-gold-500/15">
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-gold-500/20 bg-gold-500/10">
              <ShieldCheck className="size-5 text-gold-300" />
            </span>
            <div>
              <div className="text-xs font-medium text-ink-100">
                {live
                  ? "This vault is live on Stellar Testnet"
                  : "This is a sandbox preview"}
              </div>
              <div className="mt-0.5 text-[10px] text-ink-400">
                {live
                  ? `Owner ${state.identity.ownerAddress.slice(0, 8)}… · device ${state.identity.deviceHash.slice(0, 12)}… · policy ${state.identity.policyOnchain ? "on-chain" : "local"}`
                  : "Initialize the Testnet vault to replace seeded data with real Noir and Velo state."}
              </div>
            </div>
          </div>
          {live ? (
            <LinkButton href="/agent" size="sm" icon={Zap}>
              Run a live payment
            </LinkButton>
          ) : (
            <button
              onClick={() => setBootstrapOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-4 text-[11px] font-semibold text-ink-950 transition hover:from-gold-100 hover:to-gold-300"
            >
              <FlaskConical className="size-3.5" />
              Initialize Testnet vault
            </button>
          )}
        </div>
      </Panel>
    </div>
  );
}

function ProofMetric({
  label,
  value,
  detail,
  ok,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  ok: boolean;
  icon: typeof ShieldCheck;
}) {
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] uppercase tracking-[0.16em] text-ink-400">
            {label}
          </div>
          <div className="mt-1 text-lg font-semibold text-ink-50 tabular">
            {value}
          </div>
          <div className="mt-0.5 text-[9px] leading-relaxed text-ink-500">
            {detail}
          </div>
        </div>
        <span
          className={cn(
            "grid size-8 shrink-0 place-items-center rounded-lg border",
            ok
              ? "border-mint-500/20 bg-mint-500/[0.08] text-mint-300"
              : "border-gold-500/20 bg-gold-500/[0.08] text-gold-300",
          )}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
    </Panel>
  );
}

function IdentityRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <div className="text-[8px] uppercase tracking-[0.12em] text-ink-500">
        {label}
      </div>
      <div className={cn("mt-0.5 truncate text-[10px] text-ink-200", mono && "font-mono")}>
        {value}
      </div>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono = false,
  tone = "default",
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "mint" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px]">
      <span className="text-ink-500">{label}</span>
      <span
        className={cn(
          "truncate text-right",
          mono && "font-mono text-[9px]",
          tone === "mint"
            ? "text-mint-300"
            : tone === "muted"
              ? "text-ink-500"
              : "text-ink-200",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function CodeLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded border border-white/[0.05] bg-ink-950/60 px-2.5 py-1.5">
      <span className="text-gold-400/60">$</span>
      <span>{children}</span>
    </div>
  );
}
