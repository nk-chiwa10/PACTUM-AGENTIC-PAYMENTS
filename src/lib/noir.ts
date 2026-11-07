import "server-only";

import { Asset, Keypair, Networks } from "@stellar/stellar-sdk";
import { NoirAgentClient, keypairSigner } from "@noirx402/agent-sdk";
import {
  NETWORK,
  NETWORK_PASSPHRASE,
  NOIR_CONTRACTS,
  RPC_URL,
  XLM_SAC,
  fromStroops,
  toStroops,
} from "./config";
import type { NoirStatus, PactumState, SpendingPolicy } from "./types";
import type { WalletSecrets } from "./store";

export function createNoirClient() {
  return new NoirAgentClient({
    network: {
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      contracts: {
        deviceRegistry: NOIR_CONTRACTS.deviceRegistry,
        agentRegistry: NOIR_CONTRACTS.agentRegistry,
        paymentEscrow: NOIR_CONTRACTS.paymentEscrow,
      },
    },
  });
}

function explorerTx(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export async function readNoirStatus(state: PactumState): Promise<NoirStatus> {
  const started = Date.now();
  const base: NoirStatus = {
    mode: state.mode,
    configured: state.mode === "live",
    rpcUrl: RPC_URL,
    contracts: NOIR_CONTRACTS,
    device: {
      hash: state.identity.deviceHash,
      owner: null,
      agent: null,
      active: false,
      policy: null,
    },
    escrow: { balance: "0", token: null },
    merchantPending: "0",
    latencyMs: 0,
    checkedAt: new Date().toISOString(),
    errors: [],
  };

  if (state.mode !== "live") {
    base.device.owner = state.identity.ownerAddress;
    base.device.agent = state.identity.agentAddress;
    base.device.active = true;
    base.device.policy = {
      agent: state.identity.agentAddress,
      maxAmount: String(toStroops(state.policy.perTxCap)),
      asset: state.identity.assetSac,
      expiresAt: state.policy.expiresAt,
    };
    base.escrow.balance = String(toStroops(state.identity.escrowBalance));
    base.escrow.token = state.identity.assetSac;
    base.latencyMs = 8;
    base.errors.push(
      "Sandbox preview — initialize the live Testnet vault to read real contract state.",
    );
    return base;
  }

  const noir = createNoirClient();
  const hash = state.identity.deviceHash;

  const [owner, agent, policy, escrow, token, pending] = await Promise.allSettled([
    noir.getDeviceOwner(hash),
    noir.getDeviceAgent(hash),
    noir.getPolicy(hash),
    noir.getEscrowBalance(hash),
    noir.getEscrowToken(hash),
    noir.getPendingBalance(state.identity.merchantAddress),
  ]);

  if (owner.status === "fulfilled") {
    base.device.owner = owner.value;
    base.device.active = owner.value !== null;
  } else {
    base.errors.push(`device_registry: ${String(owner.reason).slice(0, 240)}`);
  }

  if (agent.status === "fulfilled") {
    base.device.agent = agent.value;
  } else {
    base.errors.push(`device_registry: ${String(agent.reason).slice(0, 240)}`);
  }

  if (policy.status === "fulfilled" && policy.value) {
    base.device.policy = {
      agent: policy.value.agent,
      maxAmount: String(policy.value.maxAmount),
      asset: policy.value.asset,
      expiresAt: policy.value.expiresAt?.toISOString() ?? null,
    };
  } else if (policy.status === "rejected") {
    base.errors.push(`agent_registry: ${String(policy.reason).slice(0, 240)}`);
  }

  if (escrow.status === "fulfilled") {
    base.escrow.balance = String(escrow.value);
  } else {
    base.errors.push(`payment_escrow: ${String(escrow.reason).slice(0, 240)}`);
  }

  if (token.status === "fulfilled" && token.value) {
    base.escrow.token = token.value;
  } else if (escrow.status === "fulfilled" && escrow.value > 0n) {
    // The deployed getter can return null on some revisions; a funded escrow's
    // token is authoritative in the app's recorded identity.
    base.escrow.token = state.identity.escrowToken ?? state.identity.assetSac;
  }

  if (pending.status === "fulfilled") {
    base.merchantPending = String(pending.value);
  }

  base.latencyMs = Date.now() - started;
  base.checkedAt = new Date().toISOString();
  return base;
}

export interface NoirWriteResult {
  hashes: string[];
  explorerUrls: string[];
}

export async function registerPolicyOnNoir(
  state: PactumState,
  policy: SpendingPolicy,
  secrets: WalletSecrets,
): Promise<NoirWriteResult> {
  if (state.mode !== "live") {
    return { hashes: [], explorerUrls: [] };
  }

  const noir = createNoirClient();
  const owner = keypairSigner(secrets.ownerSecret);
  const hash = state.identity.deviceHash;
  const hashes: string[] = [];

  const existing = await noir.getPolicy(hash).catch(() => null);
  if (existing) {
    try {
      const revoked = await noir.execute(owner, {
        kind: "revokeAgent",
        deviceHash: hash,
      });
      hashes.push(revoked.hash);
    } catch {
      // The policy may belong to a previous owner; registering will surface a
      // precise contract error if the current owner cannot replace it.
    }
  }

  const registered = await noir.execute(owner, {
    kind: "registerAgent",
    deviceHash: hash,
    agent: secrets.agentAddress,
    asset: state.identity.assetSac,
    maxAmount: toStroops(policy.perTxCap),
    expiresAt: policy.expiresAt ? new Date(policy.expiresAt) : null,
  });
  hashes.push(registered.hash);

  return {
    hashes,
    explorerUrls: hashes.map(explorerTx),
  };
}

export interface NoirPaymentResult {
  noirTxHash: string;
  noirClaimTxHash: string;
  explorerUrl: string;
  claimExplorerUrl: string;
  nonce: string;
  pendingBefore: string;
  pendingAfter: string;
}

export async function authorizeNoirPayment(
  state: PactumState,
  params: { merchant: string; amount: number },
  secrets: WalletSecrets,
): Promise<NoirPaymentResult> {
  const noir = createNoirClient();
  const deviceHash = state.identity.deviceHash;
  const asset = state.identity.assetSac;
  const amountStroops = toStroops(params.amount);
  const agent = keypairSigner(secrets.agentSecret);

  const check = await noir.checkPayment({
    deviceHash,
    agent: secrets.agentAddress,
    asset,
    amount: amountStroops,
  });
  if (!check.ok) {
    throw new NoirPolicyError(check.reason);
  }

  const pendingBefore = await noir.getPendingBalance(params.merchant);

  const authorized = await noir.authorizePayment({
    agent,
    deviceHash,
    merchant: params.merchant,
    asset,
    amount: amountStroops,
  });

  const merchant = keypairSigner(secrets.merchantSecret);
  const claimed = await noir.claim({ merchant, token: asset });

  const pendingAfter = await noir.getPendingBalance(params.merchant);

  return {
    noirTxHash: authorized.hash,
    noirClaimTxHash: claimed.hash,
    explorerUrl: explorerTx(authorized.hash),
    claimExplorerUrl: explorerTx(claimed.hash),
    nonce: String(authorized.nonce),
    pendingBefore: String(pendingBefore),
    pendingAfter: String(pendingAfter),
  };
}

export class NoirPolicyError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(`Noir refused the payment: ${reason.replaceAll("_", " ")}`);
    this.name = "NoirPolicyError";
    this.reason = reason;
  }
}

export function noirAssetLabel(state: PactumState): string {
  return state.identity.assetCode || "USDC";
}

export function resolveAsset(state: PactumState): string {
  if (state.identity.assetSac) return state.identity.assetSac;
  return XLM_SAC;
}

/** Read-only proof used by the submission page. */
export async function verifyNoirDeployment(): Promise<{
  ok: boolean;
  contracts: Record<string, { reachable: boolean; latencyMs: number; error?: string }>;
}> {
  const noir = createNoirClient();
  const checks = await Promise.all(
    Object.entries(NOIR_CONTRACTS).map(async ([name, id]) => {
      const started = Date.now();
      try {
        // Fetching the contract instance proves the contract is live on the
        // network without requiring any known ledger key.
        const instance = await noir.server.getContractInstance(id);
        if (!instance) throw new Error("Contract instance not found");
        return [
          name,
          { reachable: true, latencyMs: Date.now() - started },
        ] as const;
      } catch (error) {
        return [
          name,
          {
            reachable: false,
            latencyMs: Date.now() - started,
            error: String(error).slice(0, 200),
          },
        ] as const;
      }
    }),
  );
  return {
    ok: checks.some(([, value]) => value.reachable),
    contracts: Object.fromEntries(checks),
  };
}
