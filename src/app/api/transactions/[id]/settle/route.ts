import { NextResponse } from "next/server";
import { settleSandboxVelo } from "@/lib/agent";
import { readState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const state = readState();
    const tx = state.transactions.find((item) => item.id === id);
    if (!tx) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    if (!tx.simulated) {
      return NextResponse.json(
        {
          error:
            "This is a live Velo checkout. Complete the hosted checkout, then verify the payment.",
        },
        { status: 400 },
      );
    }
    const next = await settleSandboxVelo(id);
    return NextResponse.json({ state: next });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
