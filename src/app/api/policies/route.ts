import { NextResponse } from "next/server";
import { registerPolicyOnNoir } from "@/lib/noir";
import {
  appendAudit,
  mutateState,
  readState,
  readWalletSecrets,
} from "@/lib/store";
import type { SpendingPolicy } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function number(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function GET() {
  const state = readState();
  return NextResponse.json({ policy: state.policy, mode: state.mode });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body) {
      return NextResponse.json({ error: "Invalid policy payload." }, { status: 400 });
    }

    const state = readState();
    const current = state.policy;
    const totalBudget = Math.max(1, number(body.totalBudget, current.totalBudget));
    const perTxCap = Math.max(0.01, number(body.perTxCap, current.perTxCap));
    if (perTxCap > totalBudget) {
      return NextResponse.json(
        { error: "The per-payment cap cannot exceed the total budget." },
        { status: 400 },
      );
    }

    const allowedMerchants = Array.isArray(body.allowedMerchants)
      ? body.allowedMerchants.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
      : current.allowedMerchants;
    const allowedServiceIds = Array.isArray(body.allowedServiceIds)
      ? body.allowedServiceIds.filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
      : current.allowedServiceIds;

    const next: SpendingPolicy = {
      totalBudget,
      perTxCap,
      asset: current.asset,
      allowedMerchants:
        allowedMerchants.length > 0 ? allowedMerchants : current.allowedMerchants,
      allowedServiceIds:
        allowedServiceIds.length > 0
          ? allowedServiceIds
          : current.allowedServiceIds,
      autoApprove:
        typeof body.autoApprove === "boolean"
          ? body.autoApprove
          : current.autoApprove,
      expiresAt:
        typeof body.expiresAt === "string" && body.expiresAt
          ? new Date(body.expiresAt).toISOString()
          : body.expiresAt === null
            ? null
            : current.expiresAt,
      updatedAt: new Date().toISOString(),
      onchainTxHash: current.onchainTxHash ?? null,
    };

    let hashes: string[] = [];
    let warning: string | null = null;

    if (state.mode === "live") {
      const secrets = readWalletSecrets();
      if (!secrets) {
        warning =
          "Policy saved locally, but the live wallet secrets are missing so the on-chain policy was not updated.";
      } else {
        try {
          const result = await registerPolicyOnNoir(state, next, secrets);
          hashes = result.hashes;
          next.onchainTxHash = result.hashes.at(-1) ?? next.onchainTxHash;
        } catch (error) {
          warning = `Policy saved locally, but the Noir update failed: ${
            error instanceof Error ? error.message.slice(0, 240) : String(error)
          }`;
        }
      }
    }

    const committed = await mutateState((mutable) => {
      mutable.policy = next;
      appendAudit(mutable, {
        kind: "policy",
        title: "Spending policy updated",
        detail: `${totalBudget.toFixed(2)} ${next.asset} budget · ${perTxCap.toFixed(2)} ${next.asset} per payment · ${next.autoApprove ? "auto-approve on" : "manual approval"}.`,
        txHash: next.onchainTxHash ?? null,
        level: warning ? "warn" : "success",
      });
      return mutable;
    });

    return NextResponse.json({
      state: committed.result,
      hashes,
      warning,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
