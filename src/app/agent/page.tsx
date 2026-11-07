"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Gauge,
  History,
  KeyRound,
  LockKeyhole,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Zap,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { TransactionCard } from "@/components/transaction-detail";
import {
  Badge,
  Panel,
  PanelHeader,
  Progress,
  SectionHeading,
  StatusPill,
} from "@/components/ui";
import type { Transaction } from "@/lib/types";
import { cn, formatCurrency, relativeTime } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  text: string;
  at: string;
  txId?: string;
}

const SUGGESTIONS = [
  {
    prompt: "Buy an affordable AI API subscription under 5 USDC.",
    label: "AI subscription",
    rail: "Noir",
    icon: Sparkles,
  },
  {
    prompt: "Provision a managed Postgres database for our audit log.",
    label: "Managed database",
    rail: "Noir",
    icon: LockKeyhole,
  },
  {
    prompt: "Deploy our dashboard on managed cloud hosting.",
    label: "Cloud hosting",
    rail: "Velo",
    icon: CircleDollarSign,
  },
  {
    prompt: "Try to buy a 50 USDC GPU cluster for one hour.",
    label: "Policy block demo",
    rail: "Guardrail",
    icon: ShieldCheck,
  },
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function resultText(tx: Transaction): string {
  const amount = formatCurrency(tx.amount, tx.asset);
  switch (tx.status) {
    case "settled":
      return `Done. I selected ${tx.serviceName} and settled ${amount} through the ${tx.rail === "noir" ? "Noir escrow" : "Velo checkout"} rail. ${tx.rail === "noir" ? "The merchant claim is confirmed on Stellar Testnet." : "Velo completed the payment workflow."}`;
    case "awaiting_payment":
      return `I selected ${tx.serviceName} at ${amount} and opened a Velo checkout. ${
        tx.simulated
          ? "This is a sandbox checkout — complete it below to finish the payment."
          : "Open the hosted checkout below and pay with a Testnet wallet. I will verify the ledger entry when you return."
      }`;
    case "blocked":
      return `I stopped before moving any funds. ${tx.error ?? "The spending policy blocked this payment."}`;
    case "failed":
      return `I attempted ${tx.serviceName} at ${amount}, but the rail failed. ${tx.error ?? ""}`.trim();
    case "policy_passed":
      return `I prepared ${tx.serviceName} at ${amount}. Auto-approve is off, so this payment is waiting for your approval.`;
    default:
      return `I evaluated ${tx.serviceName} at ${amount}. Current status: ${tx.status}.`;
  }
}

export default function AgentPage() {
  const {
    state,
    running,
    runPrompt,
    pendingTx,
  } = usePactum();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      role: "agent",
      text: `I'm the PACTUM agent. I can buy approved digital services for your project, but I can never exceed your policy: ${formatCurrency(state.policy.perTxCap, state.identity.assetCode)} per payment and ${formatCurrency(state.policy.totalBudget, state.identity.assetCode)} total. Tell me what you need.`,
      at: new Date().toISOString(),
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const asset = state.identity.assetCode;
  const committed = useMemo(
    () =>
      state.transactions
        .filter((tx) =>
          ["settled", "awaiting_payment", "settling", "policy_passed"].includes(
            tx.status,
          ),
        )
        .reduce((sum, tx) => sum + tx.amount, 0),
    [state.transactions],
  );
  const remaining = Math.max(0, state.policy.totalBudget - committed);
  const recentRuns = [...state.transactions]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 4);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    }
  }, [messages, running]);

  async function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || running) return;
    setInput("");
    setMessages((current) => [
      ...current,
      {
        id: messageId(),
        role: "user",
        text: trimmed,
        at: new Date().toISOString(),
      },
    ]);
    const tx = await runPrompt(trimmed);
    if (!tx) {
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "agent",
          text: "I could not complete that run. Check the notification for the exact error — no funds were moved unless a settlement hash is shown.",
          at: new Date().toISOString(),
        },
      ]);
      return;
    }
    setMessages((current) => [
      ...current,
      {
        id: messageId(),
        role: "agent",
        text: resultText(tx),
        at: new Date().toISOString(),
        txId: tx.id,
      },
    ]);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Autonomous procurement"
        title="Agent Console"
        description="Give PACTUM a goal in plain language. It sources an approved service, checks the Noir policy and settles the payment — no human in the loop."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={state.mode === "live" ? "success" : "warning"} dot pulse={running}>
              {state.mode === "live" ? "Live Testnet" : "Sandbox"}
            </Badge>
            <Badge tone="violet" dot>
              {state.llm.configured ? state.llm.model : "deterministic planner"}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Chat panel */}
        <Panel className="flex h-[calc(100vh-11rem)] min-h-[620px] max-h-[860px] flex-col">
          <PanelHeader
            title={
              <span className="flex items-center gap-2.5">
                <span className="relative grid size-8 place-items-center rounded-lg border border-gold-500/20 bg-gold-500/10">
                  <span className="absolute inset-0 animate-pulse-ring rounded-lg border border-gold-400/20" />
                  <Bot className="size-4 text-gold-300" />
                </span>
                <span>
                  PACTUM Agent
                  <span className="ml-2 text-[9px] font-normal uppercase tracking-[0.14em] text-mint-400">
                    online
                  </span>
                </span>
              </span>
            }
            subtitle="Policy-enforced · Noir + Velo · Stellar Testnet"
            action={
              <button
                onClick={() =>
                  setMessages([
                    {
                      id: "welcome",
                      role: "agent",
                      text: `Fresh session. My current envelope: ${formatCurrency(state.policy.perTxCap, asset)} per payment, ${formatCurrency(remaining, asset)} remaining. What should I buy?`,
                      at: new Date().toISOString(),
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] text-ink-400 transition hover:bg-white/[0.04] hover:text-ink-200"
              >
                <Trash2 className="size-3" />
                Clear
              </button>
            }
          />

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
          >
            {messages.map((message) => {
              const tx =
                message.txId !== undefined
                  ? state.transactions.find((item) => item.id === message.txId)
                  : undefined;
              if (message.role === "user") {
                return (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%]">
                      <div className="rounded-2xl rounded-br-md border border-gold-500/20 bg-gold-500/[0.09] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-100">
                        {message.text}
                      </div>
                      <div className="mt-1 text-right text-[9px] text-ink-500">
                        You ·{" "}
                        {new Date(message.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={message.id} className="flex gap-2.5">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04]">
                    <Bot className="size-3.5 text-gold-300" />
                  </span>
                  <div className="min-w-0 max-w-[92%] flex-1">
                    <div className="rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.03] px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-200">
                      {message.text}
                      {tx && (
                        <div className="mt-3">
                          <TransactionCard tx={tx} expanded />
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-[9px] text-ink-500">
                      PACTUM ·{" "}
                      {new Date(message.at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {running && (
              <div className="flex gap-2.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-gold-500/20 bg-gold-500/10">
                  <Bot className="size-3.5 text-gold-300" />
                </span>
                <div className="rounded-2xl rounded-tl-md border border-gold-500/15 bg-gold-500/[0.04] px-3.5 py-3">
                  <div className="flex items-center gap-2 text-[11px] text-ink-300">
                    <span className="flex gap-1">
                      <span className="size-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:-0.2s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-gold-400 [animation-delay:-0.1s]" />
                      <span className="size-1.5 animate-bounce rounded-full bg-gold-400" />
                    </span>
                    Parsing intent, scoring services, checking Noir policy…
                  </div>
                  <div className="mt-2.5 h-0.5 w-40 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="animate-progress-slide h-full w-1/3 rounded-full bg-gold-400" />
                  </div>
                </div>
              </div>
            )}

            {messages.length === 1 && !running && (
              <div className="pt-2">
                <div className="mb-2 flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-ink-500">
                  <Sparkles className="size-3" />
                  Try a goal
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion.prompt}
                      onClick={() => void send(suggestion.prompt)}
                      disabled={running}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-gold-500/25 hover:bg-gold-500/[0.04] disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-medium text-ink-200">
                          <suggestion.icon className="size-3 text-gold-300" />
                          {suggestion.label}
                        </span>
                        <span className="text-[8px] uppercase tracking-[0.12em] text-ink-500">
                          {suggestion.rail}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-400 group-hover:text-ink-300">
                        {suggestion.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.06] px-4 py-3 sm:px-5">
            <div className="flex items-end gap-2 rounded-xl border border-white/[0.08] bg-ink-950/60 p-1.5 transition focus-within:border-gold-500/25">
              <textarea
                ref={inputRef}
                value={input}
                rows={2}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tell the agent what your project needs…"
                disabled={running}
                className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[12px] leading-relaxed text-ink-100 placeholder:text-ink-500 focus:outline-none disabled:opacity-60"
              />
              <button
                onClick={() => void send(input)}
                disabled={running || !input.trim()}
                className="mb-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-b from-gold-200 to-gold-400 text-ink-950 transition hover:from-gold-100 hover:to-gold-300 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send to agent"
              >
                <Send className="size-4" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[9px] text-ink-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-mint-400/70" />
                Funds move only inside the on-chain policy
              </span>
              <span className="font-mono">Enter ↵ send · Shift+Enter newline</span>
            </div>
          </div>
        </Panel>

        {/* Right rail */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Runtime"
              subtitle="What is enforcing this run"
              action={<Badge tone={state.mode === "live" ? "success" : "gold"} dot>{state.mode}</Badge>}
            />
            <div className="divide-y divide-white/[0.04] px-5">
              <RuntimeRow
                icon={Cpu}
                label="Planner"
                value={state.llm.configured ? state.llm.model : "Policy planner"}
                hint={state.llm.configured ? "LLM selection enabled" : "Deterministic, offline-safe"}
              />
              <RuntimeRow
                icon={KeyRound}
                label="Agent key"
                value={`${state.identity.agentAddress.slice(0, 6)}…${state.identity.agentAddress.slice(-4)}`}
                hint="Scoped to the Noir policy"
                mono
              />
              <RuntimeRow
                icon={Gauge}
                label="Per-payment cap"
                value={formatCurrency(state.policy.perTxCap, asset)}
                hint={`${state.policy.autoApprove ? "Auto-approve" : "Manual approval"} mode`}
              />
              <RuntimeRow
                icon={Radio}
                label="Rails"
                value="Noir + Velo"
                hint={state.velo?.configured ? "Velo API key detected" : "Velo sandbox checkout"}
              />
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Budget guardrails"
              subtitle="The contract is the last word"
            />
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[9px] uppercase tracking-[0.16em] text-ink-400">
                    Remaining
                  </div>
                  <div className="mt-1 text-xl font-semibold text-ink-50 tabular">
                    {formatCurrency(remaining, asset)}
                  </div>
                </div>
                <span className={cn("flex items-center gap-1 text-[9px]", state.identity.policyOnchain ? "text-mint-400" : "text-gold-300")}>
                  <ShieldCheck className="size-3" />
                  {state.identity.policyOnchain ? "on-chain" : "local policy"}
                </span>
              </div>
              <Progress value={committed} max={state.policy.totalBudget} className="mt-3" />
              <div className="mt-1.5 flex justify-between text-[9px] text-ink-500">
                <span>{formatCurrency(committed, asset)} committed</span>
                <span>{formatCurrency(state.policy.totalBudget, asset)} total</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <SmallStat label="Escrow" value={formatCurrency(state.identity.escrowBalance, asset)} />
                <SmallStat
                  label="Expires"
                  value={
                    state.policy.expiresAt
                      ? new Date(state.policy.expiresAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Never"
                  }
                />
              </div>
              <Link
                href="/policies"
                className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-ink-300 transition hover:border-gold-500/20 hover:text-ink-100"
              >
                Edit the spending envelope
                <ArrowUpRight className="size-3" />
              </Link>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Recent runs"
              subtitle="Agent history"
              action={
                <Link href="/transactions" className="text-[10px] text-gold-300/80 hover:text-gold-200">
                  All
                </Link>
              }
            />
            <ul className="divide-y divide-white/[0.04]">
              {recentRuns.map((tx) => (
                <li key={tx.id}>
                  <Link
                    href="/transactions"
                    className="flex items-center gap-2.5 px-5 py-2.5 transition hover:bg-white/[0.02]"
                  >
                    <span
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        tx.status === "settled"
                          ? "bg-mint-400"
                          : tx.status === "blocked" || tx.status === "failed"
                            ? "bg-rose-400"
                            : "bg-gold-400",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] text-ink-200">
                        {tx.serviceName}
                      </div>
                      <div className="text-[9px] text-ink-500">
                        {relativeTime(tx.createdAt)} · {formatCurrency(tx.amount, tx.asset)}
                      </div>
                    </div>
                    <StatusPill status={tx.status} />
                  </Link>
                </li>
              ))}
              {recentRuns.length === 0 && (
                <li className="px-5 py-6 text-center text-[10px] text-ink-500">
                  No runs yet.
                </li>
              )}
            </ul>
          </Panel>

          <Panel className="border-violet-500/15">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <Terminal className="size-3.5 text-violet-300" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  What happens on-chain
                </span>
              </div>
              <ol className="mt-3 space-y-2 text-[10px] leading-relaxed text-ink-400">
                <li className="flex gap-2">
                  <span className="font-mono text-gold-400/70">01</span>
                  <span>
                    <span className="text-ink-200">agent_registry.check_payment</span>{" "}
                    proves the agent, asset, amount and expiry.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-gold-400/70">02</span>
                  <span>
                    <span className="text-ink-200">payment_escrow.authorize</span>{" "}
                    debits the funded escrow to the merchant.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-gold-400/70">03</span>
                  <span>
                    <span className="text-ink-200">payment_escrow.claim</span>{" "}
                    settles the merchant balance on Stellar.
                  </span>
                </li>
              </ol>
              <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-mint-500/15 bg-mint-500/[0.04] px-2.5 py-2 text-[9px] text-mint-300">
                <CheckCircle2 className="size-3" />
                Velo checkout runs in parallel for hosted payments.
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function RuntimeRow({
  icon: Icon,
  label,
  value,
  hint,
  mono = false,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  hint: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-ink-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-ink-400">{label}</span>
          <span
            className={cn(
              "truncate text-[10px] font-medium text-ink-200",
              mono && "font-mono",
            )}
          >
            {value}
          </span>
        </div>
        <div className="mt-0.5 text-[9px] text-ink-500">{hint}</div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className="text-[8px] uppercase tracking-[0.12em] text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 text-[10px] text-ink-200">{value}</div>
    </div>
  );
}
