import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { PaymentRail, TransactionStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncateAddress(address: string, chars = 5): string {
  if (!address) return "";
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function truncateHash(hash: string, chars = 8): string {
  if (!hash) return "";
  return `${hash.slice(0, chars)}…${hash.slice(-6)}`;
}

export function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number, asset = "USDC"): string {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${asset}`;
}

export function statusLabel(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    planning: "Planning",
    policy_passed: "Awaiting approval",
    awaiting_payment: "Awaiting checkout",
    settling: "Settling",
    settled: "Settled",
    blocked: "Blocked",
    failed: "Failed",
  };
  return labels[status];
}

export function statusTone(
  status: TransactionStatus,
): "success" | "warning" | "danger" | "neutral" | "violet" {
  switch (status) {
    case "settled":
      return "success";
    case "awaiting_payment":
    case "policy_passed":
    case "settling":
    case "planning":
      return "warning";
    case "blocked":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function railLabel(rail: PaymentRail): string {
  return rail === "noir" ? "Noir escrow" : "Velo checkout";
}

export function railTone(rail: PaymentRail): "gold" | "violet" {
  return rail === "noir" ? "gold" : "violet";
}

export function shortHash(hash: string): string {
  return hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-8)}` : hash;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
