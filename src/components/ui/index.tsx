"use client";

import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { cn, truncateAddress, truncateHash } from "@/lib/utils";
import type { TransactionStatus } from "@/lib/types";
import { statusLabel, statusTone } from "@/lib/utils";

/* ── Logo ─────────────────────────────────────────────────────────── */

export function PactumMark({
  className,
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="pactum-gold" x1="8" y1="4" x2="40" y2="44">
          <stop stopColor="#F8EDD8" />
          <stop offset="0.45" stopColor="#E8CD97" />
          <stop offset="1" stopColor="#A9813F" />
        </linearGradient>
        <linearGradient id="pactum-violet" x1="4" y1="44" x2="44" y2="4">
          <stop stopColor="#8B5CF6" stopOpacity="0.7" />
          <stop offset="1" stopColor="#22D3EE" stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21.5" stroke="url(#pactum-gold)" strokeOpacity="0.5" />
      <circle
        cx="24"
        cy="24"
        r="17.5"
        stroke="url(#pactum-violet)"
        strokeDasharray="2 5"
        strokeOpacity="0.7"
      />
      <path
        d="M18 34V14h8.4c4.1 0 7.1 2.6 7.1 6.6 0 4.1-3 6.7-7.1 6.7H21.6"
        stroke="url(#pactum-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 34h7.5"
        stroke="url(#pactum-gold)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="m28.5 29.5 2.4 2.4 5-5"
        stroke="url(#pactum-gold)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PactumLogo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)}>
      <span className="relative grid size-10 place-items-center">
        <span className="absolute inset-1 rounded-full bg-gold-500/10 blur-md transition group-hover:bg-gold-500/20" />
        <PactumMark size={40} className="relative" />
      </span>
      {!compact && (
        <span className="flex flex-col">
          <span className="text-[15px] font-semibold tracking-[0.24em] text-ink-50">
            PACTUM
          </span>
          <span className="text-[8px] font-medium tracking-[0.3em] text-ink-300">
            AGENTIC PAYMENTS
          </span>
        </span>
      )}
    </Link>
  );
}

/* ── Badge ────────────────────────────────────────────────────────── */

type BadgeTone =
  | "gold"
  | "violet"
  | "cyan"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  gold: "border-gold-500/25 bg-gold-500/10 text-gold-300",
  violet: "border-violet-500/25 bg-violet-500/10 text-violet-300",
  cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-400",
  success: "border-mint-500/25 bg-mint-500/10 text-mint-400",
  warning: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-400",
  neutral: "border-white/10 bg-white/[0.04] text-ink-200",
};

export function Badge({
  tone = "neutral",
  dot = false,
  pulse = false,
  children,
  className,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
        badgeTones[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex size-1.5">
          {pulse && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}

/* ── Button ───────────────────────────────────────────────────────── */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "violet"
  | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-gold-200 to-gold-400 text-ink-950 shadow-[0_10px_30px_-14px_rgba(217,185,120,0.9)] hover:from-gold-100 hover:to-gold-300",
  secondary:
    "border border-white/10 bg-white/[0.05] text-ink-50 hover:border-white/20 hover:bg-white/[0.08]",
  ghost: "text-ink-200 hover:bg-white/[0.05] hover:text-ink-50",
  outline:
    "border border-gold-500/30 bg-transparent text-gold-300 hover:bg-gold-500/10",
  violet:
    "border border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25",
  danger:
    "border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
};

const buttonSizes = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-sm",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50 disabled:cursor-not-allowed disabled:opacity-50",
    buttonVariants[variant],
    buttonSizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  loading?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button
      className={buttonClass({ variant, size, className })}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        Icon && <Icon className="size-4" />
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  external = false,
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  className,
}: {
  href: string;
  external?: boolean;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = buttonClass({ variant, size, className });
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={classes}>
        {Icon && <Icon className="size-4" />}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {Icon && <Icon className="size-4" />}
      {children}
    </Link>
  );
}

/* ── Card / Panel ─────────────────────────────────────────────────── */

export function Panel({
  className,
  children,
  glow = false,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl",
        glow && "shadow-[0_0_80px_-40px_rgba(201,162,93,0.35)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-50">{title}</div>
        {subtitle && (
          <div className="mt-0.5 text-xs leading-relaxed text-ink-300">
            {subtitle}
          </div>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Address / hash ───────────────────────────────────────────────── */

export function CopyButton({
  value,
  className,
  label = "Copy",
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard can be unavailable in non-secure contexts.
        }
      }}
      className={cn(
        "inline-grid size-7 place-items-center rounded-md text-ink-300 transition hover:bg-white/[0.06] hover:text-ink-50",
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-mint-400" /> : <Copy className="size-3.5" />}
    </button>
  );
}

export function Address({
  value,
  chars = 5,
  href,
  className,
  mono = true,
}: {
  value: string;
  chars?: number;
  href?: string;
  className?: string;
  mono?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn(mono && "font-mono text-[11px]", "truncate")}>
        {truncateAddress(value, chars)}
      </span>
      <CopyButton value={value} />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-grid size-7 place-items-center rounded-md text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100"
          aria-label="Open explorer"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}

export function HashLink({
  hash,
  href,
  className,
}: {
  hash: string;
  href?: string;
  className?: string;
}) {
  if (!hash) return <span className="text-ink-400">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className="font-mono text-[11px] text-ink-200">
        {truncateHash(hash)}
      </span>
      <CopyButton value={hash} />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-grid size-7 place-items-center rounded-md text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100"
          aria-label="Open transaction"
        >
          <ExternalLink className="size-3.5" />
        </a>
      )}
    </span>
  );
}

/* ── Status pill ──────────────────────────────────────────────────── */

export function StatusPill({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const tone = statusTone(status);
  const toneMap = {
    success: "success",
    warning: "warning",
    danger: "danger",
    neutral: "neutral",
    violet: "violet",
  } as const;
  return (
    <Badge
      tone={toneMap[tone]}
      dot
      pulse={status === "settling" || status === "planning"}
      className={className}
    >
      {statusLabel(status)}
    </Badge>
  );
}

/* ── Metric card ──────────────────────────────────────────────────── */

export function Sparkline({
  data,
  className,
  stroke = "#D9B978",
}: {
  data: number[];
  className?: string;
  stroke?: string;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 28 - ((value - min) / range) * 24;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      className={cn("h-8 w-full", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        opacity="0.9"
      />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  sparkline,
  accent = "gold",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  sparkline?: number[];
  accent?: "gold" | "violet" | "cyan" | "mint";
  className?: string;
}) {
  const accents = {
    gold: {
      icon: "border-gold-500/20 bg-gold-500/10 text-gold-300",
      stroke: "#D9B978",
    },
    violet: {
      icon: "border-violet-500/20 bg-violet-500/10 text-violet-300",
      stroke: "#A78BFA",
    },
    cyan: {
      icon: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
      stroke: "#67E8F9",
    },
    mint: {
      icon: "border-mint-500/20 bg-mint-500/10 text-mint-400",
      stroke: "#6EE7B7",
    },
  }[accent];

  return (
    <Panel className={cn("card-hover p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-300">
            {label}
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-50 tabular">
            {value}
          </div>
        </div>
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl border",
            accents.icon,
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      {sparkline && <Sparkline data={sparkline} stroke={accents.stroke} className="mt-3" />}
      {hint && <div className="mt-2 text-[11px] text-ink-300">{hint}</div>}
    </Panel>
  );
}

/* ── Progress ─────────────────────────────────────────────────────── */

export function Progress({
  value,
  max = 100,
  className,
  barClassName,
}: {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-200 transition-all duration-700",
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── Spinner / empty ──────────────────────────────────────────────── */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-gold-300", className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.03] text-ink-300">
        <Icon className="size-5" />
      </span>
      <div>
        <div className="text-sm font-medium text-ink-100">{title}</div>
        <div className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-300">
          {description}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ── Section heading ──────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.24em] text-gold-400/80">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl leading-[1.05] text-ink-50 sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-ink-300">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
