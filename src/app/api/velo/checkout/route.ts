import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createVeloCheckout } from "@/lib/velo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      amount?: unknown;
      description?: unknown;
      asset?: unknown;
    } | null;
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "A positive amount is required." },
        { status: 400 },
      );
    }
    const description =
      typeof body?.description === "string"
        ? body.description
        : "PACTUM agentic payment";
    const asset = typeof body?.asset === "string" ? body.asset : "USDC";
    const session = await createVeloCheckout({
      transactionId: crypto.randomUUID(),
      amount,
      description,
      asset,
    });
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
