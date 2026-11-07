"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  Fingerprint,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { Badge, Button, StatusPill } from "@/components/ui";
import type { PaymentRail, Transaction, TransactionStep } from "@/lib/types";
import { cn, formatCurrency, formatDate, shortHash } from "@/lib/utils";

export function RailBadge({ rail }: { rail: PaymentRail }) {
  return (
    <Badge tone={rail === "noir" ? "gold" : "violet"} dot>
      {rail === "noir" ? "Noir escrow" : "Velo checkout"}
    </Badge>
  );
}

export function StepTimeline({
  steps,
  className,
}: {
  steps: TransactionStep[];
  className?: string;
}) {
  return (
    <ol className={cn("relative space-y-0", className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <li key={`${step.id}-${index}`} className="relative flex gap-3 pb-3.5 last:pb-0">
            {!last && (
              <span
                className={cn(
                  "absolute left-[9px] top-5 h-[calc(100%-14px)] w-px",
                  step.status === "complete"
                    ? "bg-mint-500/25"
                    : "bg-white/[0.07]",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full border",
                step.status === "complete"
                  ? "border-mint-500/30 bg-mint-500/10 text-mint-300"
                  : step.status === "running"
                    ? "border-gold-500/40 bg-gold-500/10 text-gold-300"
                    : step.status === "blocked"
                      ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                      : step.status === "failed"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-white/10 bg-white/[0.03] text-ink-500",
              )}
            >
              {step.status === "complete" ? (
                <Check className="size-2.5" />
              ) : step.status === "running" ? (
                <Loader2 className="size-2.5 animate-spin" />
              ) : step.status === "blocked" ? (
                <TriangleAlert className="size-2.5" />
              ) : step.status === "failed" ? (
                <X className="size-2.5" />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    step.status === "pending" ? "text-ink-400" : "text-ink-100",
                  )}
                >
                  {step.label}
                </span>
                <span className="flex items-center gap-2">
                  {step.txHash && (
                    <span className="font-mono text-[9px] text-ink-500">
                      {shortHash(step.txHash)}
                    </span>
                  )}
                  {(step.explorerUrl || step.txHash) && (
                    <a
                      href={
                        step.explorerUrl ??
                        `https://stellar.expert/explorer/testnet/tx/${step.txHash}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-400 transition hover:text-gold-300"
                      aria-label="View transaction on Stellar Expert"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                {step.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function TxActions({
  tx,
  size = "sm",
  compact = false,
}: {
  tx: Transaction;
  size?: "sm" | "md";
  compact?: boolean;
}) {
  const { settleTransaction, verifyTransaction, pendingTx } = usePactum();
  const pending = pendingTx === tx.id;

  if (tx.status === "awaiting_payment") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {tx.veloCheckoutUrl && (
          <a
            href={tx.veloCheckoutUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/15 px-3 text-[11px] font-medium text-violet-200 transition hover:bg-violet-500/25"
          >
            Open Velo checkout
            <ArrowUpRight className="size-3" />
          </a>
        )}
        {tx.simulated && (
          <Button
            size={size}
            loading={pending}
            onClick={() => void settleTransaction(tx.id)}
            icon={CircleDollarSign}
          >
            Complete sandbox checkout
          </Button>
        )}
        {!tx.simulated && tx.veloPaymentIntentId && (
          <Button
            variant="secondary"
            size={size}
            loading={pending}
            onClick={() => void verifyTransaction(tx.id)}
            icon={ShieldCheck}
          >
            Verify payment
          </Button>
        )}
        {!compact && (
          <Link
            href="/transactions"
            className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[10px] text-ink-400 transition hover:text-ink-200"
          >
            Ledger
          </Link>
        )}
      </div>
    );
  }

  if (tx.error && (tx.status === "blocked" || tx.status === "failed")) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.04] px-3 py-2 text-[10px] leading-relaxed text-amber-200/90">
        <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
        <span>{tx.error}</span>
      </div>
    );
  }

  if (tx.status === "settled" && tx.explorerUrl) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={tx.explorerUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-mint-500/20 bg-mint-500/[0.08] px-3 text-[10px] font-medium text-mint-300 transition hover:bg-mint-500/[0.14]"
        >
          <ShieldCheck className="size-3" />
          {tx.rail === "noir" ? "View claim on-chain" : "View settlement"}
          <ExternalLink className="size-3" />
        </a>
        {tx.noirTxHash && tx.noirClaimTxHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${tx.noirTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-ink-400 transition hover:text-gold-300"
          >
            Authorize tx
          </a>
        )}
      </div>
    );
  }

  return null;
}

export function TxHashes({ tx }: { tx: Transaction }) {
  const rows = [
    { label: "Authorize", hash: tx.noirTxHash },
    { label: "Merchant claim", hash: tx.noirClaimTxHash },
    { label: "Stellar settlement", hash: tx.stellarTxHash },
  ].filter((row) => row.hash);

  if (!rows.length && !tx.veloPaymentIntentId) return null;

  return (
    <div className="space-y-1.5">
      {tx.veloPaymentIntentId && (
        <div className="flex items-center justify-between gap-3 text-[10px]">
          <span className="text-ink-500">Velo intent</span>
          <span className="font-mono text-ink-300">{tx.veloPaymentIntentId}</span>
        </div>
      )}
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 text-[10px]"
        >
          <span className="text-ink-500">{row.label}</span>
          <span className="flex items-center gap-1.5">
            <span className="font-mono text-ink-300">
              {shortHash(row.hash!)}
            </span>
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${row.hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-ink-500 transition hover:text-gold-300"
              aria-label={`Open ${row.label} transaction`}
            >
              <ExternalLink className="size-3" />
            </a>
          </span>
        </div>
      ))}
    </div>
  );
}

export function TransactionCard({
  tx,
  expanded = false,
}: {
  tx: Transaction;
  expanded?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-ink-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "grid size-9 place-items-center rounded-xl border",
              tx.rail === "noir"
                ? "border-gold-500/20 bg-gold-500/10 text-gold-300"
                : "border-violet-500/20 bg-violet-500/10 text-violet-300",
            )}
          >
            {tx.rail === "noir" ? (
              <LockKeyhole className="size-4" />
            ) : (
              <CircleDollarSign className="size-4" />
            )}
          </span>
          <div>
            <div className="text-xs font-medium text-ink-50">
              {tx.serviceName}
            </div>
            <div className="mt-0.5 text-[10px] text-ink-400">
              {tx.category} · {formatCurrency(tx.amount, tx.asset)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusPill status={tx.status} />
          <RailBadge rail={tx.rail} />
        </div>
      </div>

      <div className="space-y-3 px-4 py-3">
        <p className="text-[11px] leading-relaxed text-ink-300">{tx.rationale}</p>

        {expanded && (
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink-400">
              <Clock3 className="size-3" />
              Execution trace
            </div>
            <StepTimeline steps={tx.steps} />
          </div>
        )}

        {expanded && tx.policyChecks.length > 0 && (
          <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink-400">
              <Fingerprint className="size-3" />
              Policy preflight
            </div>
            <ul className="space-y-1">
              {tx.policyChecks.map((check) => (
                <li
                  key={check}
                  className="flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-300"
                >
                  <Check className="mt-0.5 size-3 shrink-0 text-mint-400/80" />
                  {check}
                </li>
              ))}
            </ul>
          </div>
        )}

        <TxHashes tx={tx} />

        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <span className="text-[9px] text-ink-500">{formatDate(tx.createdAt)}</span>
          <TxActions tx={tx} compact={!expanded} />
        </div>
      </div>
    </div>
  );
}
