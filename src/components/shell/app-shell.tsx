"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  CircleDollarSign,
  FlaskConical,
  LayoutDashboard,
  Menu,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { BootstrapOverlay } from "@/components/shell/bootstrap-overlay";
import { ToastViewport } from "@/components/providers/toast-viewport";
import { Badge, PactumLogo } from "@/components/ui";
import { cn, truncateAddress } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard, hint: "Dashboard" },
  { href: "/agent", label: "Agent Console", icon: Bot, hint: "Chat" },
  { href: "/policies", label: "Spending Policies", icon: ShieldCheck, hint: "Rules" },
  { href: "/transactions", label: "Transactions", icon: ReceiptText, hint: "Ledger" },
  { href: "/proof", label: "On-chain Proof", icon: BadgeCheck, hint: "Verify" },
];

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/agent": "Agent Console",
  "/policies": "Spending Policies",
  "/transactions": "Transactions",
  "/proof": "On-chain Proof",
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, setBootstrapOpen, resetDemo, bootstrapping } = usePactum();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const live = state.mode === "live";
  const title = TITLES[pathname] ?? "PACTUM";

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-[-12rem] size-[34rem] rounded-full bg-violet-600/[0.07] blur-[120px]" />
        <div className="absolute right-[-10rem] top-24 size-[30rem] rounded-full bg-gold-500/[0.06] blur-[130px]" />
        <div className="absolute bottom-[-16rem] left-1/3 size-[36rem] rounded-full bg-cyan-500/[0.035] blur-[140px]" />
        <div className="absolute inset-0 grid-bg opacity-[0.5]" />
      </div>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col border-r border-white/[0.06] bg-ink-900/60 backdrop-blur-xl lg:flex">
        <div className="px-5 pb-5 pt-6">
          <PactumLogo />
        </div>

        <div className="px-3">
          <div className="px-2 pb-2 text-[9px] font-medium uppercase tracking-[0.22em] text-ink-500">
            Workspace
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition",
                    active
                      ? "bg-white/[0.055] text-ink-50"
                      : "text-ink-300 hover:bg-white/[0.03] hover:text-ink-100",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gold-400" />
                  )}
                  <Icon
                    className={cn(
                      "size-4 transition",
                      active ? "text-gold-300" : "text-ink-400 group-hover:text-ink-200",
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-ink-500 opacity-0 transition group-hover:opacity-100">
                    {item.hint}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 px-4">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-400">
                Agent rails
              </span>
              <span className="relative flex size-1.5">
                <span
                  className={cn(
                    "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                    live ? "bg-mint-400" : "bg-gold-400",
                  )}
                />
                <span
                  className={cn(
                    "relative inline-flex size-1.5 rounded-full",
                    live ? "bg-mint-400" : "bg-gold-400",
                  )}
                />
              </span>
            </div>
            <div className="mt-3 space-y-2.5">
              <RailRow
                label="Noir escrow"
                value={`${state.identity.escrowBalance.toFixed(2)} ${state.identity.assetCode}`}
                status={live ? "on-chain" : "sandbox"}
                tone={live ? "mint" : "gold"}
              />
              <RailRow
                label="Velo checkout"
                value={state.velo.configured ? "API key live" : "sandbox mode"}
                status={state.velo.configured ? "connected" : "ready"}
                tone={state.velo.configured ? "violet" : "muted"}
              />
            </div>
            <Link
              href="/proof"
              className="mt-3 flex items-center justify-between border-t border-white/[0.05] pt-2.5 text-[10px] text-ink-400 transition hover:text-gold-300"
            >
              Inspect contracts
              <ArrowUpRight className="size-3" />
            </Link>
          </div>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-3.5">
            <div className="flex items-center gap-2">
              <Wallet className="size-3.5 text-ink-400" />
              <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400">
                Vault owner
              </span>
            </div>
            <div className="mt-1.5 font-mono text-[11px] text-ink-200">
              {truncateAddress(state.identity.ownerAddress, 6)}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge tone={live ? "success" : "neutral"} dot pulse={live}>
                {live ? "Live" : "Sandbox"}
              </Badge>
              <span className="text-[9px] uppercase tracking-[0.1em] text-ink-500">
                Testnet
              </span>
            </div>
          </div>
          <button
            onClick={() => void resetDemo()}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] text-ink-500 transition hover:bg-white/[0.03] hover:text-ink-300"
          >
            <RotateCcw className="size-3" />
            Reset sandbox data
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />
          <aside className="animate-fade-up absolute inset-y-0 left-0 flex w-[280px] flex-col border-r border-white/[0.08] bg-ink-900 px-4 py-5">
            <div className="flex items-center justify-between pb-5">
              <PactumLogo />
              <button
                onClick={() => setMobileOpen(false)}
                className="grid size-8 place-items-center rounded-lg text-ink-300 hover:bg-white/5"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      active
                        ? "bg-white/[0.06] text-ink-50"
                        : "text-ink-300 hover:bg-white/[0.03]",
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-4",
                        active ? "text-gold-300" : "text-ink-400",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto rounded-xl border border-white/[0.06] p-3 text-[11px] text-ink-300">
              <div className="flex items-center justify-between">
                <span className="text-ink-400">Mode</span>
                <Badge tone={live ? "success" : "neutral"} dot>
                  {live ? "Live" : "Sandbox"}
                </Badge>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-ink-400">Escrow</span>
                <span className="font-mono text-ink-200">
                  {state.identity.escrowBalance.toFixed(2)}{" "}
                  {state.identity.assetCode}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setMobileOpen(true)}
              className="grid size-9 place-items-center rounded-lg border border-white/[0.08] text-ink-200 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>

            <div className="hidden items-center gap-2 text-[11px] text-ink-400 sm:flex">
              <span className="text-ink-500">PACTUM</span>
              <span className="text-ink-600">/</span>
              <span className="text-ink-200">{title}</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/agent"
                className="hidden h-9 w-[220px] items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 text-[11px] text-ink-400 transition hover:border-white/[0.14] hover:text-ink-200 md:flex"
              >
                <Search className="size-3.5" />
                <span className="flex-1 text-left">Ask the agent to buy…</span>
                <span className="rounded border border-white/10 bg-white/[0.04] px-1 font-mono text-[9px]">
                  ⌘K
                </span>
              </Link>

              <div className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 sm:flex">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint-400 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-mint-400" />
                </span>
                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">
                  Stellar Testnet
                </span>
              </div>

              <Badge tone={live ? "success" : "warning"} dot pulse={live}>
                {live ? "Live" : "Sandbox"}
              </Badge>

              {!live && (
                <button
                  onClick={() => setBootstrapOpen(true)}
                  disabled={bootstrapping}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-b from-gold-200 to-gold-400 px-3.5 text-[11px] font-semibold text-ink-950 shadow-[0_10px_28px_-14px_rgba(217,185,120,0.9)] transition hover:from-gold-100 hover:to-gold-300 disabled:opacity-60"
                >
                  <Zap className="size-3.5" />
                  Go live
                </button>
              )}
              {live && (
                <Link
                  href="/proof"
                  className="hidden h-9 items-center gap-1.5 rounded-full border border-mint-500/20 bg-mint-500/[0.08] px-3.5 text-[11px] font-medium text-mint-300 transition hover:bg-mint-500/[0.14] sm:inline-flex"
                >
                  <BadgeCheck className="size-3.5" />
                  Verified on-chain
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-8">
          {children}
          <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/[0.05] pt-5 text-[10px] text-ink-500 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="size-3.5" />
              <span>
                PACTUM · Intelligence in Motion. Trust in Every Transaction.
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/proof" className="transition hover:text-gold-300">
                Noir contracts
              </Link>
              <span className="flex items-center gap-1">
                <FlaskConical className="size-3" />
                Stellar Testnet only
              </span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </footer>
        </main>
      </div>

      <BootstrapOverlay />
      <ToastViewport />
    </div>
  );
}

function RailRow({
  label,
  value,
  status,
  tone,
}: {
  label: string;
  value: string;
  status: string;
  tone: "mint" | "gold" | "violet" | "muted";
}) {
  const dot = {
    mint: "bg-mint-400",
    gold: "bg-gold-400",
    violet: "bg-violet-400",
    muted: "bg-ink-500",
  }[tone];
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-[11px] text-ink-200">{label}</div>
        <div className="truncate text-[9px] uppercase tracking-[0.1em] text-ink-500">
          {status}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={cn("size-1.5 rounded-full", dot)} />
        <span className="font-mono text-[10px] text-ink-300">{value}</span>
      </div>
    </div>
  );
}

export function ShellShortcutHint() {
  return (
    <div className="flex items-center gap-1 text-[10px] text-ink-500">
      <Sparkles className="size-3" />
      Autonomous
    </div>
  );
}
