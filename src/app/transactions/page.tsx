"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Filter,
  LockKeyhole,
  ReceiptText,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { TransactionCard } from "@/components/transaction-detail";
import {
  Badge,
  EmptyState,
  LinkButton,
  Panel,
  PanelHeader,
  SectionHeading,
  StatusPill,
} from "@/components/ui";
import type { Transaction } from "@/lib/types";
import {
  cn,
  formatCurrency,
  formatDate,
  relativeTime,
  truncateAddress,
} from "@/lib/utils";

type FilterKey = "all" | "settled" | "pending" | "attention" | "noir" | "velo";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "settled", label: "Settled" },
  { key: "pending", label: "Pending" },
  { key: "attention", label: "Blocked / failed" },
  { key: "noir", label: "Noir" },
  { key: "velo", label: "Velo" },
];

export default function TransactionsPage() {
  const { state, pendingTx } = usePactum();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    state.transactions[0]?.id ?? null,
  );

  const transactions = useMemo(
    () =>
      [...state.transactions].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
      ),
    [state.transactions],
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (filter === "settled" && tx.status !== "settled") return false;
      if (
        filter === "pending" &&
        !["awaiting_payment", "settling", "policy_passed", "planning"].includes(
          tx.status,
        )
      ) {
        return false;
      }
      if (
        filter === "attention" &&
        tx.status !== "blocked" &&
        tx.status !== "failed"
      ) {
        return false;
      }
      if (filter === "noir" && tx.rail !== "noir") return false;
      if (filter === "velo" && tx.rail !== "velo") return false;
      if (!search) return true;
      return [tx.serviceName, tx.merchantName, tx.category, tx.prompt]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
  }, [transactions, filter, query]);

  useEffect(() => {
    if (!filtered.some((tx) => tx.id === selectedId)) {
      setSelectedId(filtered[0]?.id ?? null);
    }
  }, [filtered, selectedId]);

  const selected = state.transactions.find((tx) => tx.id === selectedId) ?? null;
  const settled = state.transactions.filter((tx) => tx.status === "settled");
  const pending = state.transactions.filter((tx) =>
    ["awaiting_payment", "settling", "policy_passed", "planning"].includes(
      tx.status,
    ),
  );
  const attention = state.transactions.filter((tx) =>
    ["blocked", "failed"].includes(tx.status),
  );
  const volume = settled.reduce((sum, tx) => sum + tx.amount, 0);
  const asset = state.identity.assetCode;

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Verifiable ledger"
        title="Transactions"
        description="Every autonomous decision, policy check and settlement hash. Noir escrow payments and Velo checkouts share one auditable timeline."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" dot>
              {state.transactions.length} records
            </Badge>
            <LinkButton href="/agent" size="sm" icon={Zap}>
              Run the agent
            </LinkButton>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Settled volume"
          value={formatCurrency(volume, asset)}
          detail={`${settled.length} payments`}
          icon={TrendingUp}
          tone="gold"
        />
        <SummaryCard
          label="Awaiting checkout"
          value={String(pending.length)}
          detail="Velo sessions in flight"
          icon={Clock3}
          tone="violet"
        />
        <SummaryCard
          label="Policy stopped"
          value={String(attention.length)}
          detail="No funds moved"
          icon={ShieldAlert}
          tone="rose"
        />
        <SummaryCard
          label="Rails used"
          value={`${settled.filter((tx) => tx.rail === "noir").length} / ${settled.filter((tx) => tx.rail === "velo").length}`}
          detail="Noir / Velo settled"
          icon={CircleDollarSign}
          tone="mint"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        {/* Ledger list */}
        <Panel className="flex flex-col overflow-hidden">
          <div className="border-b border-white/[0.06] px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <ReceiptText className="size-3.5 text-gold-300" />
                <span className="text-xs font-medium text-ink-100">
                  Payment ledger
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-500">
                {filtered.length} shown
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-ink-950/60 px-2.5 py-1.5">
              <Search className="size-3.5 text-ink-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search service, merchant or prompt…"
                className="w-full bg-transparent text-[11px] text-ink-100 placeholder:text-ink-500 focus:outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-ink-500 hover:text-ink-200"
                  aria-label="Clear search"
                >
                  <XCircle className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5">
              <Filter className="mr-1 size-3 shrink-0 text-ink-500" />
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setFilter(item.key)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-medium transition",
                    filter === item.key
                      ? "border-gold-500/30 bg-gold-500/10 text-gold-300"
                      : "border-white/[0.06] text-ink-400 hover:border-white/[0.12] hover:text-ink-200",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="No transactions match"
              description="Adjust the filters or run the agent to create the first autonomous payment."
              action={
                <LinkButton href="/agent" size="sm" variant="outline" icon={Bot}>
                  Open the agent
                </LinkButton>
              }
            />
          ) : (
            <ul className="max-h-[720px] divide-y divide-white/[0.04] overflow-y-auto">
              {filtered.map((tx) => {
                const active = tx.id === selectedId;
                return (
                  <li key={tx.id}>
                    <button
                      onClick={() => setSelectedId(tx.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                        active
                          ? "bg-gold-500/[0.05] shadow-[inset_2px_0_0_0_rgba(217,185,120,0.7)]"
                          : "hover:bg-white/[0.02]",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg border",
                          tx.rail === "noir"
                            ? "border-gold-500/20 bg-gold-500/10 text-gold-300"
                            : "border-violet-500/20 bg-violet-500/10 text-violet-300",
                        )}
                      >
                        {tx.rail === "noir" ? (
                          <LockKeyhole className="size-3.5" />
                        ) : (
                          <CircleDollarSign className="size-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[11px] font-medium text-ink-100">
                            {tx.serviceName}
                          </span>
                          {tx.simulated && (
                            <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1 py-0.5 text-[7px] uppercase tracking-[0.1em] text-ink-500">
                              sandbox
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[9px] text-ink-500">
                          <span>{tx.category}</span>
                          <span>·</span>
                          <span>{relativeTime(tx.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] font-medium text-ink-100 tabular">
                          {formatCurrency(tx.amount, tx.asset)}
                        </span>
                        <StatusPill status={tx.status} />
                      </div>
                      <ArrowUpRight
                        className={cn(
                          "ml-1 size-3.5 shrink-0 transition",
                          active ? "text-gold-300" : "text-ink-600",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Detail */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Panel>
                <PanelHeader
                  title="Transaction detail"
                  subtitle={`${selected.id.slice(0, 8)}… · ${formatDate(selected.createdAt)}`}
                  action={<StatusPill status={selected.status} />}
                />
                <div className="p-4">
                  <TransactionCard tx={selected} expanded />
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Agent reasoning"
                  subtitle="The prompt, the choice, and why"
                  action={
                    <Badge
                      tone={selected.simulated ? "gold" : "success"}
                      dot
                    >
                      {selected.simulated ? "Sandbox" : "Live"}
                    </Badge>
                  }
                />
                <div className="space-y-3 p-5">
                  <div>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink-500">
                      <Sparkles className="size-3" />
                      Operator prompt
                    </div>
                    <p className="mt-1 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[11px] leading-relaxed text-ink-200">
                      “{selected.prompt}”
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ink-500">
                      <Bot className="size-3" />
                      Agent decision
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-300">
                      {selected.rationale}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Mini label="Merchant" value={truncateAddress(selected.merchant, 6)} mono />
                    <Mini label="Rail" value={selected.rail === "noir" ? "Noir escrow" : "Velo checkout"} />
                    <Mini label="Amount" value={formatCurrency(selected.amount, selected.asset)} />
                    <Mini
                      label="Policy"
                      value={
                        selected.status === "blocked"
                          ? "Refused"
                          : "Passed"
                      }
                    />
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader
                  title="Audit trail"
                  subtitle="Latest system events"
                  action={
                    <Link
                      href="/proof"
                      className="text-[10px] text-gold-300/80 hover:text-gold-200"
                    >
                      Proof
                    </Link>
                  }
                />
                <ul className="divide-y divide-white/[0.04]">
                  {state.audit.slice(0, 5).map((event) => (
                    <li key={event.id} className="flex items-start gap-2.5 px-5 py-2.5">
                      <span
                        className={cn(
                          "mt-1 size-1.5 shrink-0 rounded-full",
                          event.level === "success"
                            ? "bg-mint-400"
                            : event.level === "error"
                              ? "bg-rose-400"
                              : event.level === "warn"
                                ? "bg-amber-400"
                                : "bg-ink-500",
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[10px] text-ink-200">
                            {event.title}
                          </span>
                          <span className="shrink-0 text-[9px] text-ink-500">
                            {relativeTime(event.at)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[9px] leading-relaxed text-ink-500">
                          {event.detail}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </>
          ) : (
            <Panel>
              <EmptyState
                icon={ShieldCheck}
                title="Select a transaction"
                description="Pick a payment from the ledger to inspect its policy checks, execution trace and on-chain hashes."
              />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof TrendingUp;
  tone: "gold" | "violet" | "rose" | "mint";
}) {
  const styles = {
    gold: "border-gold-500/20 bg-gold-500/10 text-gold-300",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-300",
    rose: "border-rose-500/20 bg-rose-500/10 text-rose-300",
    mint: "border-mint-500/20 bg-mint-500/10 text-mint-300",
  }[tone];
  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[9px] uppercase tracking-[0.16em] text-ink-400">
            {label}
          </div>
          <div className="mt-1 text-xl font-semibold text-ink-50 tabular">
            {value}
          </div>
          <div className="mt-0.5 text-[9px] text-ink-500">{detail}</div>
        </div>
        <span className={cn("grid size-8 place-items-center rounded-lg border", styles)}>
          <Icon className="size-3.5" />
        </span>
      </div>
    </Panel>
  );
}

function Mini({
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
      <div className="text-[8px] uppercase tracking-[0.12em] text-ink-500">
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 truncate text-[10px] text-ink-200",
          mono && "font-mono",
        )}
      >
        {value}
      </div>
    </div>
  );
}
