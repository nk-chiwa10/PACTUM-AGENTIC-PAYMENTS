"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  Check,
  CircleDollarSign,
  Coins,
  FileKey2,
  Fingerprint,
  Gauge,
  Info,
  Layers,
  LockKeyhole,
  Save,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { getCatalog } from "@/lib/catalog";
import {
  Badge,
  Button,
  LinkButton,
  Panel,
  PanelHeader,
  Progress,
  SectionHeading,
} from "@/components/ui";
import { NOIR_CONTRACTS } from "@/lib/config";
import { cn, formatCurrency, truncateAddress } from "@/lib/utils";

interface FormState {
  totalBudget: number;
  perTxCap: number;
  expiresAt: string | null;
  allowedServiceIds: string[];
}

export default function PoliciesPage() {
  const { state, savePolicy, savingPolicy, setBootstrapOpen } = usePactum();
  const asset = state.identity.assetCode;
  const services = useMemo(
    () => getCatalog(state.identity.merchantAddress),
    [state.identity.merchantAddress],
  );

  const [form, setForm] = useState<FormState>({
    totalBudget: state.policy.totalBudget,
    perTxCap: state.policy.perTxCap,
    expiresAt: state.policy.expiresAt,
    allowedServiceIds: state.policy.allowedServiceIds,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      totalBudget: state.policy.totalBudget,
      perTxCap: state.policy.perTxCap,
      expiresAt: state.policy.expiresAt,
      allowedServiceIds: state.policy.allowedServiceIds,
    });
  }, [state.policy]);

  const committed = state.transactions
    .filter((tx) =>
      ["settled", "awaiting_payment", "settling", "policy_passed"].includes(
        tx.status,
      ),
    )
    .reduce((sum, tx) => sum + tx.amount, 0);
  const remaining = Math.max(0, state.policy.totalBudget - committed);
  const dirty =
    form.totalBudget !== state.policy.totalBudget ||
    form.perTxCap !== state.policy.perTxCap ||
    form.expiresAt !== state.policy.expiresAt ||
    form.allowedServiceIds.length !== state.policy.allowedServiceIds.length ||
    form.allowedServiceIds.some(
      (id) => !state.policy.allowedServiceIds.includes(id),
    );

  function toggleService(id: string) {
    setForm((current) => ({
      ...current,
      allowedServiceIds: current.allowedServiceIds.includes(id)
        ? current.allowedServiceIds.filter((item) => item !== id)
        : [...current.allowedServiceIds, id],
    }));
  }

  async function submit() {
    setError(null);
    if (form.totalBudget <= 0) {
      setError("The total budget must be greater than zero.");
      return;
    }
    if (form.perTxCap <= 0) {
      setError("The per-payment cap must be greater than zero.");
      return;
    }
    if (form.perTxCap > form.totalBudget) {
      setError("The per-payment cap cannot exceed the total budget.");
      return;
    }
    if (form.allowedServiceIds.length === 0) {
      setError("Approve at least one service so the agent has somewhere to spend.");
      return;
    }
    if (form.expiresAt && Date.parse(form.expiresAt) < Date.now()) {
      setError("The expiry date is in the past.");
      return;
    }
    await savePolicy({
      totalBudget: form.totalBudget,
      perTxCap: form.perTxCap,
      autoApprove: true,
      allowedServiceIds: form.allowedServiceIds,
      expiresAt: form.expiresAt,
    });
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        eyebrow="Programmable guardrails"
        title="Spending Policies"
        description="The owner defines the envelope once. The agent can act autonomously inside it, and Noir refuses anything outside it — even if the agent tries."
        action={
          <div className="flex items-center gap-2">
            <Badge tone={state.identity.policyOnchain ? "success" : "gold"} dot>
              {state.identity.policyOnchain ? "On-chain" : "Local policy"}
            </Badge>
            <Badge tone="neutral">
              {state.policy.allowedServiceIds.length} services
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        {/* Form */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Spending envelope"
              subtitle="Changes publish to Noir AgentRegistry when the vault is live."
              action={
                dirty ? (
                  <Badge tone="warning" dot>
                    Unsaved
                  </Badge>
                ) : (
                  <Badge tone="neutral">
                    <Check className="size-3" />
                    Synced
                  </Badge>
                )
              }
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field
                label="Total budget"
                hint="Maximum lifetime spend across all approved services."
                icon={Wallet}
              >
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    step={0.01}
                    value={form.totalBudget}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        totalBudget: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-3 py-2.5 pr-14 text-sm text-ink-50 focus:border-gold-500/40 focus:outline-none focus:ring-1 focus:ring-gold-500/20"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-400">
                    {asset}
                  </span>
                </div>
              </Field>

              <Field
                label="Per-payment cap"
                hint="The agent cannot authorize a single payment above this."
                icon={Gauge}
              >
                <div className="relative">
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={form.perTxCap}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        perTxCap: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-3 py-2.5 pr-14 text-sm text-ink-50 focus:border-gold-500/40 focus:outline-none focus:ring-1 focus:ring-gold-500/20"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-400">
                    {asset}
                  </span>
                </div>
              </Field>

              <Field
                label="Expires"
                hint="After this date the Noir policy refuses every payment."
                icon={CalendarClock}
              >
                <input
                  type="date"
                  value={form.expiresAt ? form.expiresAt.slice(0, 10) : ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expiresAt: event.target.value
                        ? new Date(
                            `${event.target.value}T23:59:59.000Z`,
                          ).toISOString()
                        : null,
                    }))
                  }
                  className="w-full rounded-lg border border-white/[0.08] bg-ink-950/60 px-3 py-2.5 text-sm text-ink-50 [color-scheme:dark] focus:border-gold-500/40 focus:outline-none focus:ring-1 focus:ring-gold-500/20"
                />
              </Field>

              <Field
                label="Autonomous execution"
                hint="PACTUM settles approved payments without asking for a signature each time."
                icon={LockKeyhole}
              >
                <div className="flex h-[42px] items-center justify-between rounded-lg border border-mint-500/20 bg-mint-500/[0.05] px-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-mint-300">
                    <ShieldCheck className="size-3.5" />
                    Auto-approve inside policy
                  </span>
                  <span className="relative h-5 w-9 rounded-full bg-mint-500/30">
                    <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-mint-300" />
                  </span>
                </div>
              </Field>
            </div>

            <div className="border-t border-white/[0.06] px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-ink-100">
                    <Layers className="size-3.5 text-gold-300" />
                    Approved services
                  </div>
                  <div className="mt-0.5 text-[10px] text-ink-400">
                    The agent can only buy from this allowlist.
                  </div>
                </div>
                <span className="font-mono text-[10px] text-ink-400">
                  {form.allowedServiceIds.length}/{services.length}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => {
                  const checked = form.allowedServiceIds.includes(service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition",
                        checked
                          ? "border-gold-500/25 bg-gold-500/[0.05]"
                          : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition",
                          checked
                            ? "border-gold-400 bg-gold-400 text-ink-950"
                            : "border-white/20 text-transparent",
                        )}
                      >
                        <Check className="size-2.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] font-medium text-ink-100">
                            {service.name}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-ink-300">
                            {formatCurrency(service.price, asset)}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-ink-500">
                          <span className="truncate">{service.category}</span>
                          <span
                            className={cn(
                              "shrink-0 rounded px-1 py-0.5 text-[8px] uppercase tracking-[0.08em]",
                              service.rail === "noir"
                                ? "bg-gold-500/10 text-gold-400"
                                : "bg-violet-500/10 text-violet-300",
                            )}
                          >
                            {service.rail}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-5 py-4">
              <div className="text-[10px] text-ink-400">
                {state.mode === "live" ? (
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5 text-mint-400" />
                    Saving will revoke and re-register the Noir agent policy.
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Info className="size-3.5 text-gold-400" />
                    Sandbox mode. Initialize the live vault to publish on-chain.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setForm({
                      totalBudget: state.policy.totalBudget,
                      perTxCap: state.policy.perTxCap,
                      expiresAt: state.policy.expiresAt,
                      allowedServiceIds: state.policy.allowedServiceIds,
                    })
                  }
                  disabled={!dirty || savingPolicy}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  loading={savingPolicy}
                  disabled={!dirty}
                  onClick={() => void submit()}
                  icon={Save}
                >
                  {state.mode === "live" ? "Publish to Noir" : "Save policy"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="border-t border-rose-500/15 bg-rose-500/[0.04] px-5 py-2.5 text-[10px] text-rose-300">
                {error}
              </div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title="Enforcement path"
              subtitle="What happens on every autonomous payment."
            />
            <div className="grid gap-px bg-white/[0.04] sm:grid-cols-3">
              {[
                {
                  icon: Fingerprint,
                  title: "Device binding",
                  body: "device_registry proves this agent pass belongs to the owner's registered device hash.",
                  contract: "device_registry",
                },
                {
                  icon: FileKey2,
                  title: "Agent constraint",
                  body: "agent_registry stores max_amount, asset and expiry for the agent key. check_payment is the predicate.",
                  contract: "agent_registry",
                },
                {
                  icon: Coins,
                  title: "Escrow custody",
                  body: "payment_escrow holds the owner's funds. authorize + claim release them to the merchant.",
                  contract: "payment_escrow",
                },
              ].map((item) => (
                <div key={item.title} className="bg-ink-900/40 p-4">
                  <span className="grid size-8 place-items-center rounded-lg border border-gold-500/15 bg-gold-500/[0.07] text-gold-300">
                    <item.icon className="size-4" />
                  </span>
                  <div className="mt-2.5 text-[11px] font-medium text-ink-100">
                    {item.title}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                    {item.body}
                  </p>
                  <div className="mt-2 font-mono text-[9px] text-gold-400/60">
                    {item.contract}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right side */}
        <div className="space-y-4">
          <Panel>
            <PanelHeader
              title="Policy status"
              subtitle="Envelope at a glance"
              action={<Wallet className="size-4 text-ink-400" />}
            />
            <div className="p-5">
              <div className="text-[9px] uppercase tracking-[0.18em] text-ink-400">
                Remaining budget
              </div>
              <div className="mt-1 flex items-end justify-between">
                <span className="text-2xl font-semibold text-ink-50 tabular">
                  {formatCurrency(remaining, asset)}
                </span>
                <span className="text-[10px] text-ink-400">
                  of {formatCurrency(state.policy.totalBudget, asset)}
                </span>
              </div>
              <Progress
                value={committed}
                max={state.policy.totalBudget}
                className="mt-3"
              />
              <div className="mt-1.5 flex justify-between text-[9px] text-ink-500">
                <span>{formatCurrency(committed, asset)} committed</span>
                <span>
                  {state.policy.totalBudget
                    ? `${((committed / state.policy.totalBudget) * 100).toFixed(0)}%`
                    : "0%"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatusStat label="Per payment" value={formatCurrency(state.policy.perTxCap, asset)} />
                <StatusStat label="Escrow" value={formatCurrency(state.identity.escrowBalance, asset)} />
                <StatusStat
                  label="Published"
                  value={
                    state.policy.onchainTxHash
                      ? `${state.policy.onchainTxHash.slice(0, 8)}…`
                      : "Local only"
                  }
                />
                <StatusStat label="Allowed" value={`${state.policy.allowedServiceIds.length} services`} />
              </div>

              {state.policy.onchainTxHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${state.policy.onchainTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-between rounded-lg border border-mint-500/15 bg-mint-500/[0.04] px-3 py-2 text-[10px] text-mint-300 transition hover:bg-mint-500/[0.08]"
                >
                  View policy transaction
                  <ArrowUpRight className="size-3" />
                </a>
              )}

              {!state.identity.policyOnchain && (
                <button
                  onClick={() => setBootstrapOpen(true)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold-500/20 bg-gold-500/[0.05] py-2 text-[10px] font-medium text-gold-300 transition hover:bg-gold-500/10"
                >
                  <ShieldCheck className="size-3" />
                  Publish this policy on Testnet
                </button>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Noir contracts"
              subtitle="The hackathon deployment on Stellar Testnet"
              action={
                <Link
                  href="/proof"
                  className="text-[10px] text-gold-300/80 hover:text-gold-200"
                >
                  Verify
                </Link>
              }
            />
            <div className="space-y-2 p-4">
              <ContractRow
                name="device_registry"
                address={NOIR_CONTRACTS.deviceRegistry}
                role="Device ↔ owner ↔ agent binding"
              />
              <ContractRow
                name="agent_registry"
                address={NOIR_CONTRACTS.agentRegistry}
                role="Per-payment cap, asset, expiry"
              />
              <ContractRow
                name="payment_escrow"
                address={NOIR_CONTRACTS.paymentEscrow}
                role="Funded balance, authorize, claim"
              />
            </div>
            <div className="border-t border-white/[0.06] px-4 py-3">
              <div className="flex items-center justify-between text-[9px] text-ink-500">
                <span>Device hash</span>
                <span className="font-mono text-ink-400">
                  {state.identity.deviceHash.slice(0, 16)}…
                </span>
              </div>
            </div>
          </Panel>

          <Panel className="border-gold-500/15">
            <div className="p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-gold-300" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                  Why this is safe
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-[10px] leading-relaxed text-ink-400">
                <li className="flex gap-2">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-gold-400" />
                  The agent key never holds the owner's funds — escrow does.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-gold-400" />
                  Noir enforces the cap and expiry independently of this UI.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-gold-400" />
                  Revoking the agent sweeps the remaining escrow back to the owner.
                </li>
              </ul>
              <LinkButton
                href="/transactions"
                variant="secondary"
                size="sm"
                className="mt-4 w-full"
                icon={BadgeCheck}
              >
                Inspect the ledger
              </LinkButton>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint: string;
  icon: typeof Wallet;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3 text-gold-400/70" />
        <label className="text-[10px] font-medium uppercase tracking-[0.14em] text-ink-300">
          {label}
        </label>
      </div>
      {children}
      <p className="mt-1 text-[9px] leading-relaxed text-ink-500">{hint}</p>
    </div>
  );
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2">
      <div className="text-[8px] uppercase tracking-[0.12em] text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 truncate text-[10px] text-ink-200">{value}</div>
    </div>
  );
}

function ContractRow({
  name,
  address,
  role,
}: {
  name: string;
  address: string;
  role: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-ink-200">{name}</span>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${address}`}
          target="_blank"
          rel="noreferrer"
          className="text-ink-500 transition hover:text-gold-300"
          aria-label={`Open ${name} on Stellar Expert`}
        >
          <ArrowUpRight className="size-3" />
        </a>
      </div>
      <div className="mt-0.5 text-[9px] text-ink-500">{role}</div>
      <div className="mt-1 font-mono text-[9px] text-ink-400">
        {truncateAddress(address, 10)}
      </div>
    </div>
  );
}
