import "server-only";

import crypto from "node:crypto";
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Operation,
  TransactionBuilder,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { keypairSigner } from "@noirx402/agent-sdk";
import {
  DEMO_ASSET_CODE,
  FRIENDBOT_URL,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  RPC_URL,
  XLM_SAC,
  assetContractId,
  toStroops,
} from "./config";
import { appendAudit, mutateState, readWalletSecrets, writeWalletSecrets } from "./store";
import type { WalletSecrets } from "./store";
import type { PactumState, SpendingPolicy } from "./types";
import { createNoirClient } from "./noir";

const server = new Horizon.Server(HORIZON_URL);
const soroban = new rpc.Server(RPC_URL);
const STARTING_USDC = "1000";
const ESCROW_USDC = 120;
const PER_TX_USDC = 5;

async function accountExists(address: string): Promise<boolean> {
  try {
    await server.loadAccount(address);
    return true;
  } catch {
    return false;
  }
}

async function waitForAccount(address: string, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await accountExists(address)) return;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }
  throw new Error(`Timed out waiting for ${address} to appear on Testnet`);
}

async function fundWithFriendbot(address: string): Promise<string | null> {
  if (await accountExists(address)) return null;
  const response = await fetch(
    `${FRIENDBOT_URL}/?addr=${encodeURIComponent(address)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    const text = await response.text();
    if (!(await accountExists(address))) {
      throw new Error(`Friendbot failed (${response.status}): ${text.slice(0, 180)}`);
    }
  }
  await waitForAccount(address);
  try {
    const payload = (await response.json()) as { hash?: string };
    return payload.hash ?? null;
  } catch {
    return null;
  }
}

async function submit(
  source: Keypair,
  operations: xdr.Operation[],
): Promise<string> {
  const account = await server.loadAccount(source.publicKey());
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
  for (const operation of operations) {
    builder.addOperation(operation);
  }
  const tx = builder.setTimeout(120).build();
  tx.sign(source);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

async function submitSoroban(
  source: Keypair,
  operation: xdr.Operation,
): Promise<string> {
  const account = await server.loadAccount(source.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(180)
    .build();

  const prepared = await soroban.prepareTransaction(tx);
  prepared.sign(source);
  const sent = await soroban.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(
      `Soroban transaction rejected: ${String(sent.errorResult ?? sent.status)}`,
    );
  }
  const confirmed = await soroban.pollTransaction(sent.hash, { attempts: 40 });
  if (confirmed.status !== "SUCCESS") {
    throw new Error(
      `Soroban transaction ${sent.hash} finished as ${confirmed.status}`,
    );
  }
  return sent.hash;
}

/**
 * Noir escrow moves value through the asset's Stellar Asset Contract, so the
 * SAC for the demo USDC must exist before `fund_escrow` can transfer. The
 * issuer deploys it once; later runs detect the live instance and skip.
 */
async function ensureSac(
  issuer: Keypair,
  asset: Asset,
  sac: string,
): Promise<string | null> {
  try {
    const instance = await soroban.getContractInstance(sac);
    if (instance) return null;
  } catch {
    // Not deployed yet — fall through to deployment.
  }

  try {
    return await submitSoroban(
      issuer,
      Operation.createStellarAssetContract({ asset }),
    );
  } catch (error) {
    // A parallel or previous run may have deployed it between our read and
    // write; treat a now-live instance as success.
    try {
      const instance = await soroban.getContractInstance(sac);
      if (instance) return null;
    } catch {
      // ignore and rethrow the deployment error
    }
    throw error;
  }
}

function hasTrustline(
  account: Awaited<ReturnType<Horizon.Server["loadAccount"]>>,
  code: string,
  issuer: string,
) {
  return account.balances.some(
    (balance) =>
      "asset_code" in balance &&
      balance.asset_code === code &&
      "asset_issuer" in balance &&
      balance.asset_issuer === issuer,
  );
}

async function ensureAsset(
  owner: Keypair,
  merchant: Keypair,
  issuer: Keypair,
): Promise<{
  code: string;
  issuerAddress: string;
  sac: string;
  sacDeployHash: string | null;
  trustlineHashes: string[];
}> {
  const asset = new Asset(DEMO_ASSET_CODE, issuer.publicKey());
  const hashes: string[] = [];

  const ownerAccount = await server.loadAccount(owner.publicKey());
  if (!hasTrustline(ownerAccount, DEMO_ASSET_CODE, issuer.publicKey())) {
    hashes.push(
      await submit(owner, [Operation.changeTrust({ asset, limit: "1000000000" })]),
    );
  }

  const merchantAccount = await server.loadAccount(merchant.publicKey());
  if (!hasTrustline(merchantAccount, DEMO_ASSET_CODE, issuer.publicKey())) {
    hashes.push(
      await submit(merchant, [
        Operation.changeTrust({ asset, limit: "1000000000" }),
      ]),
    );
  }

  const funded = await server.loadAccount(owner.publicKey());
  const current = funded.balances.find(
    (balance) =>
      "asset_code" in balance &&
      balance.asset_code === DEMO_ASSET_CODE &&
      "asset_issuer" in balance &&
      balance.asset_issuer === issuer.publicKey(),
  );
  const currentAmount = current && "balance" in current ? Number(current.balance) : 0;
  if (currentAmount < 500) {
    hashes.push(
      await submit(issuer, [
        Operation.payment({
          destination: owner.publicKey(),
          asset,
          amount: STARTING_USDC,
        }),
      ]),
    );
  }

  const sac = assetContractId(DEMO_ASSET_CODE, issuer.publicKey());
  const sacDeployHash = await ensureSac(issuer, asset, sac);

  return {
    code: DEMO_ASSET_CODE,
    issuerAddress: issuer.publicKey(),
    sac,
    sacDeployHash,
    trustlineHashes: hashes,
  };
}

function makeSecrets(): WalletSecrets {
  const existing = readWalletSecrets();
  if (existing) return existing;

  const owner = process.env.PACTUM_OWNER_SECRET
    ? Keypair.fromSecret(process.env.PACTUM_OWNER_SECRET)
    : Keypair.random();
  const agent = process.env.PACTUM_AGENT_SECRET
    ? Keypair.fromSecret(process.env.PACTUM_AGENT_SECRET)
    : Keypair.random();
  const merchant = process.env.PACTUM_MERCHANT_SECRET
    ? Keypair.fromSecret(process.env.PACTUM_MERCHANT_SECRET)
    : Keypair.random();
  const issuer = process.env.PACTUM_USDC_ISSUER_SECRET
    ? Keypair.fromSecret(process.env.PACTUM_USDC_ISSUER_SECRET)
    : Keypair.random();

  const deviceHash = crypto
    .createHash("sha256")
    .update(`pactum-agent-pass:${owner.publicKey()}:${Date.now()}`)
    .digest("hex");

  const secrets: WalletSecrets = {
    ownerSecret: owner.secret(),
    agentSecret: agent.secret(),
    merchantSecret: merchant.secret(),
    issuerSecret: issuer.secret(),
    ownerAddress: owner.publicKey(),
    agentAddress: agent.publicKey(),
    merchantAddress: merchant.publicKey(),
    issuerAddress: issuer.publicKey(),
    assetCode: DEMO_ASSET_CODE,
    assetIssuer: issuer.publicKey(),
    assetSac: assetContractId(DEMO_ASSET_CODE, issuer.publicKey()),
    deviceHash,
    createdAt: new Date().toISOString(),
  };
  writeWalletSecrets(secrets);
  return secrets;
}

export interface BootstrapResult {
  state: PactumState;
  steps: string[];
  hashes: Record<string, string | null>;
}

/**
 * Creates a real, disposable Stellar Testnet vault:
 *   fund accounts → create test-USDC trustlines → issue test USDC
 *   → register device on Noir → register constrained agent policy
 *   → fund Noir escrow → persist the live PACTUM state.
 *
 * Idempotent: re-running reuses the wallet and skips steps already on-chain.
 */
export async function bootstrapTestnet(): Promise<BootstrapResult> {
  const steps: string[] = [];
  const hashes: Record<string, string | null> = {};
  const secrets = makeSecrets();

  const owner = Keypair.fromSecret(secrets.ownerSecret);
  const agent = Keypair.fromSecret(secrets.agentSecret);
  const merchant = Keypair.fromSecret(secrets.merchantSecret);
  const issuer = Keypair.fromSecret(secrets.issuerSecret);

  await mutateState((state) => {
    state.bootstrap = { status: "running", completedSteps: [] };
  });

  try {
    steps.push("Funding Testnet vault accounts with Friendbot");
    hashes.friendbotOwner = await fundWithFriendbot(owner.publicKey());
    hashes.friendbotAgent = await fundWithFriendbot(agent.publicKey());
    hashes.friendbotMerchant = await fundWithFriendbot(merchant.publicKey());
    hashes.friendbotIssuer = await fundWithFriendbot(issuer.publicKey());

    steps.push("Creating test-USDC trustlines and issuing starting balance");
    const asset = await ensureAsset(owner, merchant, issuer);
    hashes.trustlines = asset.trustlineHashes.at(-1) ?? null;
    hashes.createSac = asset.sacDeployHash;

    // If USDC setup fails for any reason, the demo can fall back to native XLM
    // while still exercising the exact same Noir + Velo flow.
    let assetCode = asset.code;
    let assetIssuer: string | null = asset.issuerAddress;
    let assetSac = asset.sac;
    let escrowAmount = ESCROW_USDC;

    const noir = createNoirClient();
    const ownerSigner = keypairSigner(secrets.ownerSecret);
    const deviceHash = secrets.deviceHash;

    steps.push("Registering the agent pass in Noir DeviceRegistry");
    const existingOwner = await noir
      .getDeviceOwner(deviceHash)
      .catch(() => null);
    if (!existingOwner) {
      const registered = await noir.execute(ownerSigner, {
        kind: "registerDevice",
        deviceHash,
        agent: secrets.agentAddress,
      });
      hashes.registerDevice = registered.hash;
    } else {
      hashes.registerDevice = null;
    }

    steps.push("Publishing the constrained policy in Noir AgentRegistry");
    let policy = await noir.getPolicy(deviceHash).catch(() => null);
    if (!policy) {
      const registered = await noir.execute(ownerSigner, {
        kind: "registerAgent",
        deviceHash,
        agent: secrets.agentAddress,
        asset: assetSac,
        maxAmount: toStroops(PER_TX_USDC),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      hashes.registerAgent = registered.hash;
      policy = await noir.getPolicy(deviceHash);
    } else {
      hashes.registerAgent = null;
      // Follow the asset the existing policy is bound to.
      assetSac = policy.asset;
      if (policy.asset === XLM_SAC) {
        assetCode = "XLM";
        assetIssuer = null;
      }
    }

    steps.push("Funding the Noir PaymentEscrow");
    let escrow = await noir.getEscrowBalance(deviceHash).catch(() => 0n);
    if (escrow === 0n) {
      const funded = await noir.execute(ownerSigner, {
        kind: "fundEscrow",
        deviceHash,
        token: assetSac,
        amount: toStroops(escrowAmount),
      });
      hashes.fundEscrow = funded.hash;
      escrow = await noir.getEscrowBalance(deviceHash);
    } else {
      hashes.fundEscrow = null;
      escrowAmount = Number(escrow) / 10_000_000;
    }

    const onchainPolicy = await noir.getPolicy(deviceHash).catch(() => null);
    const onchainToken = await noir.getEscrowToken(deviceHash).catch(() => null);

    const policyUpdate: SpendingPolicy = {
      totalBudget: 500,
      perTxCap: Number(onchainPolicy?.maxAmount ?? toStroops(PER_TX_USDC)) / 10_000_000,
      asset: assetCode,
      allowedMerchants: [secrets.merchantAddress],
      allowedServiceIds: [
        "nebula-ai",
        "vectorly",
        "axiom-cloud",
        "ledgerdb",
        "nameforge",
        "horizon-gpu",
      ],
      autoApprove: true,
      expiresAt:
        onchainPolicy?.expiresAt?.toISOString() ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      onchainTxHash: hashes.registerAgent ?? null,
    };

    const result = await mutateState((state) => {
      const wasSandbox = state.mode !== "live";
      state.mode = "live";
      if (wasSandbox) {
        // The seeded sandbox ledger contains simulated hashes. Clear it so the
        // live vault only ever shows real Testnet transactions.
        state.transactions = state.transactions.filter((tx) => !tx.simulated);
      }
      state.identity = {
        mode: "live",
        network: "testnet",
        ownerAddress: secrets.ownerAddress,
        agentAddress: secrets.agentAddress,
        merchantAddress: secrets.merchantAddress,
        deviceHash,
        deviceLabel: "PACTUM Agent Pass · live Testnet",
        assetCode,
        assetIssuer,
        assetSac,
        escrowBalance: Number(escrow) / 10_000_000,
        escrowToken: onchainToken ?? assetSac,
        policyOnchain: Boolean(onchainPolicy),
        createdAt: state.identity.createdAt,
        bootstrapTxHashes: hashes,
      };
      state.policy = policyUpdate;
      state.bootstrap = { status: "complete", completedSteps: steps };
      appendAudit(state, {
        kind: "noir",
        title: "Live Testnet vault initialized",
        detail: `Device ${deviceHash.slice(0, 12)}… registered, agent policy published, escrow funded with ${escrowAmount} ${assetCode}.`,
        txHash: hashes.registerDevice ?? hashes.registerAgent ?? null,
        level: "success",
      });
      appendAudit(state, {
        kind: "system",
        title: "PACTUM is live on Stellar Testnet",
        detail: `Owner ${secrets.ownerAddress.slice(0, 8)}… controls the vault. The agent key can only spend within the on-chain policy.`,
        level: "success",
      });
      return state;
    });

    return { state: result.result, steps, hashes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await mutateState((state) => {
      state.bootstrap = {
        status: "failed",
        completedSteps: steps,
        error: message.slice(0, 500),
      };
      appendAudit(state, {
        kind: "system",
        title: "Live initialization failed",
        detail: message.slice(0, 300),
        level: "error",
      });
    });
    throw error;
  }
}

export function friendlyBootstrapError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Friendbot")) {
    return "Stellar Friendbot is unavailable right now. The sandbox vault still works; retry the live setup in a moment.";
  }
  if (message.includes("AlreadyRegistered")) {
    return "This agent pass already has a Noir policy. Re-run setup to reuse it, or reset the sandbox vault.";
  }
  if (message.includes("op_underfunded") || message.includes("Underfunded")) {
    return "The Testnet vault ran out of XLM for fees. Re-run setup to request more from Friendbot.";
  }
  return message.slice(0, 400);
}
