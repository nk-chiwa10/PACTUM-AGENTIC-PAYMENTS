"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleDot,
  FlaskConical,
  Loader2,
  Radio,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePactum } from "@/components/providers/pactum-provider";
import { Badge, Button, PactumMark } from "@/components/ui";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Create Testnet accounts",
    detail: "Owner, agent, merchant and test-USDC issuer funded by Friendbot.",
  },
  {
    title: "Issue test USDC",
    detail: "Trustlines plus a Stellar Asset Contract for the escrow token.",
  },
  {
    title: "Register the agent pass",
    detail: "device_registry.register commits the device hash on-chain.",
  },
  {
    title: "Publish the spending policy",
    detail: "agent_registry.register_agent constrains agent, asset, cap and expiry.",
  },
  {
    title: "Fund the Noir escrow",
    detail: "payment_escrow.fund_escrow moves test USDC into the vault.",
  },
];

export function BootstrapOverlay() {
  const {
    bootstrapOpen,
    setBootstrapOpen,
    bootstrap,
    bootstrapping,
    state,
  } = usePactum();
  const [outcome, setOutcome] = useState<{
    ok: boolean;
    steps: string[];
    error?: string;
  } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!bootstrapping) return;
    setElapsed(0);
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [bootstrapping]);

  useEffect(() => {
    if (bootstrapOpen && state.mode === "live") setOutcome(null);
  }, [bootstrapOpen, state.mode]);

  if (!bootstrapOpen) return null;

  const progress = bootstrapping
    ? Math.min(92, 6 + elapsed * 1.4)
    : outcome?.ok
      ? 100
      : 0;

  const activeIndex = bootstrapping
    ? Math.min(STEPS.length - 1, Math.floor(elapsed / 7))
    : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={() => !bootstrapping && setBootstrapOpen(false)}
        aria-label="Close setup"
      />
      <div className="glass animate-fade-up relative w-full max-w-xl overflow-hidden rounded-2xl border-white/10">
        <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-gold-500/10 blur-3xl" />
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-gold-500/20 bg-gold-500/10">
              <PactumMark size={24} />
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold-400/80">
                {state.mode === "live" ? "Testnet vault" : "Go live"}
              </div>
              <h2 className="mt-1 text-lg font-medium text-ink-50">
                {state.mode === "live"
                  ? "PACTUM is live on Stellar Testnet"
                  : "Initialize the live Testnet vault"}
              </h2>
            </div>
          </div>
          <button
            className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-white/5 hover:text-ink-100 disabled:opacity-30"
            onClick={() => setBootstrapOpen(false)}
            disabled={bootstrapping}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {state.mode === "live" && !outcome ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-mint-500/20 bg-mint-500/5 px-3.5 py-3 text-xs text-mint-300">
                <ShieldCheck className="size-4 shrink-0" />
                The vault is already live. The agent is constrained by the Noir
                policy published on-chain.
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <Stat label="Escrow" value={`${state.identity.escrowBalance.toFixed(2)} ${state.identity.assetCode}`} />
                <Stat label="Per-payment cap" value={`${state.policy.perTxCap.toFixed(2)} ${state.identity.assetCode}`} />
                <Stat label="Device hash" value={`${state.identity.deviceHash.slice(0, 10)}…`} mono />
                <Stat label="Agent" value={`${state.identity.agentAddress.slice(0, 6)}…${state.identity.agentAddress.slice(-4)}`} mono />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/proof"
                  onClick={() => setBootstrapOpen(false)}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-4 text-xs font-medium text-ink-950"
                >
                  View on-chain proof
                  <ArrowRight className="size-3.5" />
                </Link>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setBootstrapOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs leading-relaxed text-ink-300">
                PACTUM will write real state to Stellar Testnet: a Noir device,
                a constrained agent policy, and a funded payment escrow. This
                takes about 30–90 seconds and needs no keys from you.
              </p>

              <div className="mt-4">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-200 transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-ink-400">
                  <span>
                    {bootstrapping
                      ? `Working · ${elapsed}s`
                      : outcome?.ok
                        ? "Complete"
                        : "Ready"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Radio className="size-3" />
                    Stellar Testnet
                  </span>
                </div>
              </div>

              <ol className="mt-5 space-y-2">
                {STEPS.map((step, index) => {
                  const complete = outcome?.ok || (!bootstrapping && state.mode === "live");
                  const active = bootstrapping && index === activeIndex;
                  return (
                    <li
                      key={step.title}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3 py-2.5 transition",
                        complete
                          ? "border-mint-500/15 bg-mint-500/[0.04]"
                          : active
                            ? "border-gold-500/25 bg-gold-500/[0.06]"
                            : "border-white/[0.05] bg-white/[0.02]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[9px]",
                          complete
                            ? "border-mint-500/30 bg-mint-500/15 text-mint-300"
                            : active
                              ? "border-gold-500/30 bg-gold-500/15 text-gold-300"
                              : "border-white/10 text-ink-400",
                        )}
                      >
                        {complete ? (
                          <Check className="size-3" />
                        ) : active ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-ink-100">
                          {step.title}
                        </div>
                        <div className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                          {step.detail}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {outcome && !outcome.ok && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-rose-300">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <div className="font-medium">Setup did not finish</div>
                    <div className="mt-0.5 text-rose-300/80">{outcome.error}</div>
                    <div className="mt-1 text-rose-300/60">
                      The sandbox vault still works. You can retry once Testnet
                      is reachable.
                    </div>
                  </div>
                </div>
              )}

              {outcome?.ok && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-mint-500/20 bg-mint-500/[0.06] px-3.5 py-3 text-[11px] leading-relaxed text-mint-300">
                  <CircleDot className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <div className="font-medium">Live vault created</div>
                    <div className="mt-0.5 text-mint-300/80">
                      Noir device, agent policy and escrow are now real on-chain
                      state. Try a Noir payment from the agent console.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!(state.mode === "live" && !outcome) && (
          <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-6 py-4">
            <Badge tone="neutral" dot>
              <FlaskConical className="size-3" />
              No keys required
            </Badge>
            <div className="flex items-center gap-2">
              {!bootstrapping && !outcome?.ok && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBootstrapOpen(false)}
                >
                  Not now
                </Button>
              )}
              {outcome?.ok ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBootstrapOpen(false)}
                  >
                    Close
                  </Button>
                  <Link
                    href="/agent"
                    onClick={() => setBootstrapOpen(false)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-3.5 text-xs font-medium text-ink-950"
                  >
                    Run the agent
                    <ArrowRight className="size-3.5" />
                  </Link>
                </>
              ) : (
                <Button
                  size="sm"
                  loading={bootstrapping}
                  onClick={async () => {
                    setOutcome(null);
                    const result = await bootstrap();
                    setOutcome(result);
                  }}
                >
                  {bootstrapping
                    ? "Writing to Testnet…"
                    : outcome?.ok
                      ? "Re-run setup"
                      : "Initialize Testnet vault"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.14em] text-ink-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-[11px] text-ink-200",
          mono && "font-mono",
        )}
      >
        {value}
      </div>
    </div>
  );
}
