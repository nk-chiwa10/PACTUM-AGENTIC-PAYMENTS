import { NextResponse } from "next/server";
import { txExplorer } from "@/lib/config";
import { appendAudit, mutateState } from "@/lib/store";
import { verifyVeloWebhook } from "@/lib/velo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("x-velo-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-velo-signature header" },
      { status: 400 },
    );
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const event = await verifyVeloWebhook(rawBody, signature);

    if (event.type === "payment.succeeded" || event.type === "payment.failed") {
      const intent = event.paymentIntent;
      const committed = await mutateState((state) => {
        const tx = state.transactions.find(
          (item) => item.veloPaymentIntentId === intent.id,
        );
        if (!tx) return state;
        if (event.type === "payment.succeeded") {
          tx.status = "settled";
          tx.stellarTxHash = intent.txHash ?? tx.stellarTxHash ?? null;
          tx.explorerUrl = intent.txHash
            ? txExplorer(intent.txHash)
            : tx.explorerUrl ?? null;
          const settleStep = tx.steps.find((step) => step.id === "settle");
          if (settleStep) {
            settleStep.label = "Velo payment settled";
            settleStep.detail =
              "Velo verified the Stellar transaction and emitted payment.succeeded.";
            settleStep.status = "complete";
            settleStep.at = new Date().toISOString();
            settleStep.txHash = intent.txHash ?? undefined;
            settleStep.explorerUrl = tx.explorerUrl ?? undefined;
          }
          appendAudit(state, {
            kind: "velo",
            title: "Velo webhook: payment succeeded",
            detail: `${tx.serviceName} · ${tx.amount} ${tx.asset} · ${intent.id}`,
            txHash: intent.txHash ?? null,
            explorerUrl: tx.explorerUrl ?? null,
            level: "success",
          });
        } else {
          tx.status = "failed";
          tx.error = `Velo reported the payment as ${intent.status}.`;
          const settleStep = tx.steps.find((step) => step.id === "settle");
          if (settleStep) {
            settleStep.status = "failed";
            settleStep.detail = "Velo reported the checkout as failed.";
            settleStep.at = new Date().toISOString();
          }
          appendAudit(state, {
            kind: "velo",
            title: "Velo webhook: payment failed",
            detail: `${tx.serviceName} · ${intent.id}`,
            level: "error",
          });
        }
        tx.updatedAt = new Date().toISOString();
        return state;
      });
      return NextResponse.json({ received: true, state: committed.result });
    }

    return NextResponse.json({ received: true, ignored: event.type });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Webhook signature verification failed",
      },
      { status: 400 },
    );
  }
}
