"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  Fingerprint,
  Gauge,
  Landmark,
  Layers,
  LockKeyhole,
  Radio,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import {
  Badge,
  LinkButton,
  MetricCard,
  Panel,
  PanelHeader,
  Progress,
  SectionHeading,
  StatusPill,
} from "@/components/ui";
import type { Transaction } from "@/lib/types";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";

function committedSpend(transactions: Transaction[]): number {
  return transactions
    .filter((tx) =>
      ["settled", "awaiting_payment", "settling", "policy_passed"].includes(
        tx.status,
      ),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
}

function dayBuckets(transactions: Transaction[]) {
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const buckets: { label: string; value: number; iso: string }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const value = transactions
      .filter((tx) => tx.status === "settled")
      .filter((tx) => {
        const at = Date.parse(tx.createdAt);
        return at >= date.getTime() && at < next.getTime();
      })
      .reduce((sum, tx) => sum + tx.amount, 0);
    buckets.push({
      label: formatter.format(date),
      value,
      iso: date.toISOString(),
    });
  }
  return buckets;
}

export default function DashboardPage() {
  const { state, setBootstrapOpen } = usePactum();
  const live = state.mode === "live";
  const settled = state.transactions.filter((tx) => tx.status === "settled");
  const committed = committedSpend(state.transactions);
  const remaining = Math.max(0, state.policy.totalBudget - committed);
  const budgetPct = state.policy.totalBudget
    ? (committed / state.policy.totalBudget) * 100
    : 0;
  const attempted = state.transactions.filter((tx) =>
    ["settled", "failed", "blocked"].includes(tx.status),
  );
  const successRate = attempted.length
    ? Math.round((settled.length / attempted.length) * 100)
    : 100;
  const noirSettled = settled.filter((tx) => tx.rail === "noir");
  const veloSettled = settled.filter((tx) => tx.rail === "velo");
  const noirVolume = noirSettled.reduce((sum, tx) => sum + tx.amount, 0);
  const veloVolume = veloSettled.reduce((sum, tx) => sum + tx.amount, 0);
  const totalSettled = noirVolume + veloVolume;
  const buckets = dayBuckets(state.transactions);
  const peak = Math.max(1, ...buckets.map((bucket) => bucket.value));
  const recent = [...state.transactions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);
  const asset = state.identity.assetCode;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Panel glow className="noise overflow-hidden border-white/[0.08]">
        <div className="pointer-events-none absolute -left-24 -top-32 size-[28rem] rounded-full bg-gold-500/[0.08] blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 size-[26rem] rounded-full bg-violet-600/[0.1] blur-[120px]" />
        <div className="relative grid lg:grid-cols-[1.15fr_0.85fr]">
          <div className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:py-12">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold" dot pulse>
                Velo × Noir · Agentic Payments
              </Badge>
              <Badge tone={live ? "success" : "neutral"} dot>
                {live ? "Live on Testnet" : "Sandbox preview"}
              </Badge>
            </div>
            <h1 className="mt-5 max-w-xl font-display text-[2.6rem] leading-[0.98] tracking-tight text-ink-50 sm:text-5xl lg:text-[3.4rem]">
              Intelligence in motion.
              <br />
              <span className="text-gradient-gold italic">
                Trust in every transaction.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-ink-300 sm:text-sm">
              PACTUM is an autonomous payment agent for the software economy.
              Tell it what your project needs. It discovers the service,
              enforces your spending policy, and settles the payment on Stellar
              — with Noir escrow and Velo checkout as first-class rails.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <LinkButton href="/agent" icon={Zap} size="md">
                Run the agent
              </LinkButton>
              <LinkButton
                href="/proof"
                variant="secondary"
                icon={ShieldCheck}
                size="md"
              >
                On-chain proof
              </LinkButton>
              {!live && (
                <button
                  onClick={() => setBootstrapOpen(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-gold-300 transition hover:bg-gold-500/10"
                >
                  Go live on Testnet
                  <ArrowUpRight className="size-3.5" />
                </button>
              )}
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-ink-500">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-gold-400" />
                Noir contracts
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-violet-400" />
                Velo SDK
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-cyan-400" />
                Stellar Testnet
              </span>
            </div>
          </div>

          {/* Vault card */}
          <div className="relative border-t border-white/[0.06] p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.07] bg-ink-950/50 p-4 sm:p-5">
              <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full border border-gold-500/10" />
              <div className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full border border-violet-500/10" />
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[9px] font-medium uppercase tracking-[0.22em] text-ink-400">
                    Agent vault · escrow
                  </div>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-3xl font-semibold tracking-tight text-ink-50 tabular">
                      {state.identity.escrowBalance.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="pb-1 text-xs font-medium text-gold-300">
                      {asset}
                    </span>
                  </div>
                </div>
                <span className="relative grid size-11 place-items-center rounded-2xl border border-gold-500/25 bg-gold-500/10">
                  <span className="absolute inset-0 animate-pulse-ring rounded-2xl border border-gold-400/30" />
                  <Fingerprint className="size-5 text-gold-300" />
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat
                  label="Per-payment cap"
                  value={formatCurrency(state.policy.perTxCap, asset)}
                  icon={Gauge}
                />
                <MiniStat
                  label="Remaining budget"
                  value={formatCurrency(remaining, asset)}
                  icon={Wallet}
                />
                <MiniStat
                  label="Policy"
                  value={state.identity.policyOnchain ? "On-chain" : "Local"}
                  icon={LockKeyhole}
                  tone={state.identity.policyOnchain ? "mint" : "gold"}
                />
                <MiniStat
                  label="Auto-approve"
                  value={state.policy.autoApprove ? "Enabled" : "Manual"}
                  icon={Bot}
                  tone={state.policy.autoApprove ? "mint" : "gold"}
                />
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-ink-400">Budget consumed</span>
                  <span className="font-mono text-ink-300">
                    {budgetPct.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={committed}
                  max={state.policy.totalBudget}
                  className="mt-1.5"
                />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span className="flex items-center gap-1.5 text-[10px] text-ink-400">
                  <Radio
                    className={cn(
                      "size-3",
                      live ? "text-mint-400" : "text-gold-400",
                    )}
                  />
                  {live
                    ? "Noir policy live on Stellar Testnet"
                    : "Sandbox vault · no funds at risk"}
                </span>
                <Link
                  href="/policies"
                  className="text-[10px] text-gold-300/80 transition hover:text-gold-200"
                >
                  Manage
                </Link>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <RailMini
                label="Noir"
                value={`${noirSettled.length} paid`}
                tone="gold"
              />
              <RailMini
                label="Velo"
                value={`${veloSettled.length} paid`}
                tone="violet"
              />
              <RailMini
                label="Success"
                value={`${successRate}%`}
                tone="mint"
              />
            </div>
          </div>
        </div>
      </Panel>

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Autonomous volume"
          value={formatCurrency(totalSettled, asset)}
          icon={TrendingUp}
          accent="gold"
          sparkline={buckets.map((bucket) => bucket.value + 0.1)}
          hint={`${settled.length} payments settled by the agent`}
        />
        <MetricCard
          label="Budget remaining"
          value={formatCurrency(remaining, asset)}
          icon={Wallet}
          accent="cyan"
          sparkline={[8, 7.4, 8.2, 6.9, 7.6, 6.2, remaining / 10]}
          hint={`of ${formatCurrency(state.policy.totalBudget, asset)} total envelope`}
        />
        <MetricCard
          label="Escrow on-chain"
          value={formatCurrency(state.identity.escrowBalance, asset)}
          icon={Landmark}
          accent="mint"
          sparkline={[4, 4.4, 4.1, 4.8, 4.4, 5.1, state.identity.escrowBalance / 20]}
          hint={live ? "payment_escrow · live balance" : "Sandbox escrow balance"}
        />
        <MetricCard
          label="Policy success rate"
          value={`${successRate}%`}
          icon={ShieldCheck}
          accent="violet"
          sparkline={[88, 92, 90, 96, 94, 98, successRate]}
          hint={`${state.policy.allowedServiceIds.length} approved services · ${state.policy.allowedMerchants.length} merchant`}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Autonomous activity"
              subtitle="Settled volume per day across both payment rails."
              action={
                <Badge tone="neutral" dot>
                  7 days
                </Badge>
              }
            />
            <div className="px-5 py-5">
              <div className="flex items-end justify-between gap-2 border-b border-white/[0.05] pb-4">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.2em] text-ink-400">
                    Settled this week
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-semibold text-ink-50 tabular">
                      {formatCurrency(
                        buckets.reduce((sum, bucket) => sum + bucket.value, 0),
                        asset,
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-mint-400">
                      <TrendingUp className="size-3" />
                      agent-operated
                    </span>
                  </div>
                </div>
                <div className="hidden items-center gap-3 text-[9px] uppercase tracking-[0.12em] text-ink-400 sm:flex">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-gold-400" />
                    Noir
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-violet-400" />
                    Velo
                  </span>
                </div>
              </div>

              <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
                {buckets.map((bucket) => {
                  const height = Math.max(4, (bucket.value / peak) * 100);
                  return (
                    <div
                      key={bucket.iso}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="relative flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-gold-600/30 via-gold-500/60 to-gold-300 transition-all duration-500 group-hover:from-gold-500/50 group-hover:to-gold-200"
                          style={{ height: `${height}%` }}
                        >
                          <div className="h-0.5 w-full rounded-full bg-gold-200/80" />
                        </div>
                        <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/10 bg-ink-900 px-1.5 py-0.5 font-mono text-[9px] text-ink-200 opacity-0 shadow-xl transition group-hover:opacity-100">
                          {bucket.value.toFixed(2)}
                        </div>
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.1em] text-ink-500">
                        {bucket.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/[0.06]">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400">
                  Recent payments
                </span>
                <Link
                  href="/transactions"
                  className="flex items-center gap-1 text-[10px] text-gold-300/80 transition hover:text-gold-200"
                >
                  Full ledger
                  <ArrowRight className="size-3" />
                </Link>
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {recent.map((tx) => (
                  <li key={tx.id}>
                    <Link
                      href="/transactions"
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.025]"
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
                          <span className="truncate text-xs font-medium text-ink-100">
                            {tx.serviceName}
                          </span>
                          <span className="hidden text-[9px] uppercase tracking-[0.1em] text-ink-500 sm:inline">
                            {tx.category}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-ink-400">
                          {relativeTime(tx.createdAt)} ·{" "}
                          {tx.rail === "noir" ? "Noir escrow" : "Velo checkout"}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[11px] font-medium text-ink-100 tabular">
                          {formatCurrency(tx.amount, tx.asset)}
                        </span>
                        <StatusPill status={tx.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="How the agent decides"
              subtitle="A verifiable loop from natural language to settled payment."
            />
            <div className="grid gap-px bg-white/[0.04] sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Understand",
                  detail:
                    "Parses the request into a capability, a budget and a deadline.",
                  icon: Sparkles,
                },
                {
                  step: "02",
                  title: "Select",
                  detail:
                    "Scores approved services on fit, price and rail availability.",
                  icon: Layers,
                },
                {
                  step: "03",
                  title: "Constrain",
                  detail:
                    "Noir check_payment enforces the agent's on-chain policy.",
                  icon: ShieldCheck,
                },
                {
                  step: "04",
                  title: "Settle",
                  detail:
                    "Escrow authorize + claim, or a Velo hosted checkout.",
                  icon: CheckCircle2,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="bg-ink-900/40 px-5 py-5 transition hover:bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-8 place-items-center rounded-lg border border-gold-500/15 bg-gold-500/[0.07] text-gold-300">
                      <item.icon className="size-4" />
                    </span>
                    <span className="font-mono text-[9px] text-ink-500">
                      {item.step}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-medium text-ink-100">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Policy envelope"
              subtitle="The agent cannot exceed these limits."
              action={
                <Badge tone={state.identity.policyOnchain ? "success" : "gold"}>
                  {state.identity.policyOnchain ? "On-chain" : "Local"}
                </Badge>
              }
            />
            <div className="space-y-4 p-5">
              <div>
                <div className="flex items-end justify-between">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400">
                    Total budget
                  </span>
                  <span className="font-mono text-xs text-ink-100">
                    {formatCurrency(state.policy.totalBudget, asset)}
                  </span>
                </div>
                <Progress
                  value={committed}
                  max={state.policy.totalBudget}
                  className="mt-2"
                />
                <div className="mt-1.5 flex justify-between text-[9px] text-ink-500">
                  <span>{formatCurrency(committed, asset)} committed</span>
                  <span>{formatCurrency(remaining, asset)} left</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <EnvelopeStat
                  label="Per payment"
                  value={formatCurrency(state.policy.perTxCap, asset)}
                />
                <EnvelopeStat
                  label="Expires"
                  value={
                    state.policy.expiresAt
                      ? new Date(state.policy.expiresAt).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )
                      : "Never"
                  }
                />
                <EnvelopeStat
                  label="Services"
                  value={`${state.policy.allowedServiceIds.length} approved`}
                />
                <EnvelopeStat
                  label="Merchants"
                  value={`${state.policy.allowedMerchants.length} allowlisted`}
                />
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-ink-300">
                  <Fingerprint className="size-3 text-gold-400/80" />
                  Device hash
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-ink-400">
                  {state.identity.deviceHash}
                </div>
              </div>

              <LinkButton
                href="/policies"
                variant="secondary"
                size="sm"
                className="w-full"
                icon={ShieldCheck}
              >
                Edit policy
              </LinkButton>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Two rails, one agent"
              subtitle="Noir escrow for card-bound spend, Velo for hosted checkout."
            />
            <div className="space-y-3 p-5">
              <RailCard
                name="Noir"
                descriptor="payment_escrow · agent_registry"
                paid={`${noirSettled.length}`}
                volume={formatCurrency(noirVolume, asset)}
                share={totalSettled ? (noirVolume / totalSettled) * 100 : 0}
                icon={LockKeyhole}
                tone="gold"
                live={live}
              />
              <RailCard
                name="Velo"
                descriptor="checkout.sessions.create"
                paid={`${veloSettled.length}`}
                volume={formatCurrency(veloVolume, asset)}
                share={totalSettled ? (veloVolume / totalSettled) * 100 : 0}
                icon={CircleDollarSign}
                tone="violet"
                live={Boolean(state.velo.configured)}
              />
            </div>
          </Panel>

          <Panel className="relative overflow-hidden border-gold-500/15">
            <div className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gold-500/10 blur-3xl" />
            <div className="relative p-5">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg border border-gold-500/20 bg-gold-500/10 text-gold-300">
                  <Bot className="size-4" />
                </span>
                <div>
                  <div className="text-xs font-medium text-ink-100">
                    Give the agent a goal
                  </div>
                  <div className="text-[10px] text-ink-400">
                    It handles sourcing, policy and settlement.
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                {[
                  "Buy an affordable AI API subscription for my project.",
                  "Provision managed Postgres for the audit log.",
                  "Register a production domain for launch.",
                ].map((prompt) => (
                  <Link
                    key={prompt}
                    href="/agent"
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2 text-left text-[10px] leading-snug text-ink-300 transition hover:border-gold-500/20 hover:text-ink-100"
                  >
                    <span className="line-clamp-1">{prompt}</span>
                    <ArrowUpRight className="size-3 shrink-0 text-ink-500" />
                  </Link>
                ))}
              </div>
              <LinkButton
                href="/agent"
                size="sm"
                className="mt-3 w-full"
                icon={Zap}
              >
                Open agent console
              </LinkButton>
            </div>
          </Panel>
        </div>
      </div>

      {/* Footer strip */}
      <Panel className="border-white/[0.06]">
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
              <Coins className="size-4" />
            </span>
            <div>
              <div className="text-xs font-medium text-ink-100">
                Every decision is auditable
              </div>
              <div className="text-[10px] text-ink-400">
                {state.audit.length} audit events · {state.transactions.length}{" "}
                transactions · last sync {relativeTime(state.lastSync)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LinkButton
              href="/transactions"
              variant="ghost"
              size="sm"
              icon={ReceiptText}
            >
              Review ledger
            </LinkButton>
            <LinkButton
              href="/proof"
              variant="secondary"
              size="sm"
              icon={ShieldCheck}
            >
              Verify contracts
            </LinkButton>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  tone?: "neutral" | "mint" | "gold";
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-ink-500">
        <Icon className="size-2.5" />
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 text-[11px] font-medium",
          tone === "mint"
            ? "text-mint-300"
            : tone === "gold"
              ? "text-gold-300"
              : "text-ink-200",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function RailMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "violet" | "mint";
}) {
  const color = {
    gold: "text-gold-300",
    violet: "text-violet-300",
    mint: "text-mint-300",
  }[tone];
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2 py-1.5 text-center">
      <div className="text-[8px] uppercase tracking-[0.14em] text-ink-500">
        {label}
      </div>
      <div className={cn("mt-0.5 text-[10px] font-medium", color)}>{value}</div>
    </div>
  );
}

function EnvelopeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-[0.12em] text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-200">{value}</div>
    </div>
  );
}

function RailCard({
  name,
  descriptor,
  paid,
  volume,
  share,
  icon: Icon,
  tone,
  live,
}: {
  name: string;
  descriptor: string;
  paid: string;
  volume: string;
  share: number;
  icon: typeof LockKeyhole;
  tone: "gold" | "violet";
  live: boolean;
}) {
  const styles =
    tone === "gold"
      ? {
          icon: "border-gold-500/20 bg-gold-500/10 text-gold-300",
          bar: "from-gold-500 to-gold-200",
          text: "text-gold-300",
        }
      : {
          icon: "border-violet-500/20 bg-violet-500/10 text-violet-300",
          bar: "from-violet-600 to-violet-300",
          text: "text-violet-300",
        };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg border",
            styles.icon,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-100">{name}</span>
            <span className={cn("text-[10px] font-medium", styles.text)}>
              {volume}
            </span>
          </div>
          <div className="truncate text-[9px] uppercase tracking-[0.1em] text-ink-500">
            {descriptor}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Progress value={share} className="h-1 flex-1" barClassName={cn("bg-gradient-to-r", styles.bar)} />
        <span className="font-mono text-[9px] text-ink-400">
          {share.toFixed(0)}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-[9px] text-ink-400">
        <span>{paid} payments</span>
        <span className="flex items-center gap-1">
          <span
            className={cn(
              "size-1.5 rounded-full",
              live ? "bg-mint-400" : "bg-gold-400",
            )}
          />
          {live ? "connected" : "sandbox"}
        </span>
      </div>
    </div>
  );
}
