import "server-only";

import crypto from "node:crypto";
import { Velo } from "@carts1024/velo-sdk";
import { APP_URL, VELO_BASE_URL, VELO_ENV } from "./config";
import type { PactumState, VeloStatus } from "./types";

export function isVeloConfigured(): boolean {
  return Boolean(process.env.VELO_API_KEY?.trim());
}

export function createVeloClient(): Velo {
  return new Velo({
    apiKey: process.env.VELO_API_KEY!.trim(),
    environment: VELO_ENV,
    baseUrl: VELO_BASE_URL,
    timeoutMs: 20_000,
    maxRetries: 1,
  });
}

export function getVeloStatus(state: PactumState): VeloStatus {
  return {
    configured: isVeloConfigured(),
    environment: VELO_ENV,
    baseUrl: VELO_BASE_URL,
    webhookConfigured: Boolean(process.env.VELO_WEBHOOK_SECRET),
    webhookPath: state.velo.webhookPath,
    lastPaymentIntentId: state.velo.lastPaymentIntentId ?? null,
    lastCheckoutUrl: state.velo.lastCheckoutUrl ?? null,
    lastSessionAt: state.velo.lastSessionAt ?? null,
  };
}

export interface VeloCheckoutResult {
  sandbox: boolean;
  paymentIntentId: string;
  checkoutUrl: string | null;
  status: string;
  asset: string;
  amount: string;
}

export async function createVeloCheckout(params: {
  transactionId: string;
  amount: number;
  description: string;
  asset?: string;
}): Promise<VeloCheckoutResult> {
  const amount = params.amount.toFixed(2);
  const asset = params.asset ?? "USDC";

  if (!isVeloConfigured()) {
    return {
      sandbox: true,
      paymentIntentId: `pi_sandbox_${crypto.randomUUID().slice(0, 12)}`,
      checkoutUrl: null,
      status: "pending",
      asset,
      amount,
    };
  }

  const velo = createVeloClient();
  const intent = await velo.checkout.sessions.create(
    {
      amount,
      asset,
      anchor: "inhouse",
      description: params.description.slice(0, 180),
      successUrl: `${APP_URL}/transactions?velo=success&intent=${encodeURIComponent(params.transactionId)}`,
      cancelUrl: `${APP_URL}/transactions?velo=cancelled&intent=${encodeURIComponent(params.transactionId)}`,
    },
    {
      idempotencyKey: `pactum:${params.transactionId}`,
      correlationId: `pactum:${params.transactionId}`,
    },
  );

  return {
    sandbox: false,
    paymentIntentId: intent.id,
    checkoutUrl: intent.checkoutUrl,
    status: intent.status,
    asset: intent.asset,
    amount: intent.amount,
  };
}

export async function retrieveVeloIntent(paymentIntentId: string) {
  if (!isVeloConfigured()) {
    throw new Error(
      "Velo is not configured. Add VELO_API_KEY to .env.local to retrieve a live payment intent.",
    );
  }
  const velo = createVeloClient();
  return velo.paymentIntents.retrieve(paymentIntentId, {
    correlationId: `pactum:verify:${paymentIntentId}`,
  });
}

export async function verifyVeloWebhook(payload: string, signature: string) {
  const secret = process.env.VELO_WEBHOOK_SECRET;
  if (!secret) throw new Error("VELO_WEBHOOK_SECRET is not configured");
  return Velo.webhooks.verify({ payload, signature, secret });
}
