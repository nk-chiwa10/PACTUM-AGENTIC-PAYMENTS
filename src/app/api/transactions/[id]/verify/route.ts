import { NextResponse } from "next/server";
import { appendAudit, mutateState, readState } from "@/lib/store";
import { retrieveVeloIntent } from "@/lib/velo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    if (!tx.veloPaymentIntentId) {
      return NextResponse.json(
        { error: "This transaction is not a Velo payment." },
        { status: 400 },
      );
    }

    const intent = await retrieveVeloIntent(tx.veloPaymentIntentId);
    if (intent.status === "paid") {
      const committed = await mutateState((mutable) => {
        const target = mutable.transactions.find((item) => item.id === id);
        if (!target) return mutable;
        target.status = "settled";
        const settleStep = target.steps.find((step) => step.id === "settle");
        if (settleStep) {
          settleStep.label = "Velo payment verified";
          settleStep.detail =
            "Velo's backend verified the Stellar ledger entry for this payment intent.";
          settleStep.status = "complete";
          settleStep.at = new Date().toISOString();
        }
        target.updatedAt = new Date().toISOString();
        appendAudit(mutable, {
          kind: "velo",
          title: "Velo payment verified",
          detail: `${target.serviceName} · ${target.amount} ${target.asset}`,
          level: "success",
        });
        return mutable;
      });
      return NextResponse.json({ state: committed.result, intent });
    }

    return NextResponse.json({
      state,
      intent,
      message: `Velo reports the payment as ${intent.status}.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
