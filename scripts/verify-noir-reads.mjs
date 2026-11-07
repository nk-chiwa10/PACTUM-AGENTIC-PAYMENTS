#!/usr/bin/env node
/**
 * Read-only smoke test for the Noir deployment referenced by the hackathon
 * brief. Proves the three contracts are live and that the SDK can read them.
 *
 *   node scripts/verify-noir-reads.mjs
 */
import { NoirAgentClient } from "@noirx402/agent-sdk";

const CONTRACTS = {
  deviceRegistry:
    process.env.NOIR_DEVICE_REGISTRY ??
    "CB4DPMGOA374JIB2ZVD4AHW5GJKQUYNOFGRYNOJ75EFH2KCJSMHOWIRA",
  agentRegistry:
    process.env.NOIR_AGENT_REGISTRY ??
    "CBTDMJVCFQDIVWZBKAKZ2FQ3UEJNAAUFYCTJ3E4ON2MYXPLPSIXQ25JZ",
  paymentEscrow:
    process.env.NOIR_PAYMENT_ESCROW ??
    "CA5S4S7QGHJHJWVJBYL3CXZXZTNGKXMNZVDAEQNN7NUXFP4D7BYK7HIX",
};

const noir = new NoirAgentClient({
  network: {
    rpcUrl: process.env.NOIR_RPC_URL ?? "https://soroban-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
    contracts: CONTRACTS,
  },
});

const probeDevice = "ab".repeat(32);
let failed = false;

for (const [name, id] of Object.entries(CONTRACTS)) {
  const started = Date.now();
  try {
    const instance = await noir.server.getContractInstance(id);
    if (!instance) throw new Error("no contract instance returned");
    console.log(`✓ ${name.padEnd(16)} live  ${Date.now() - started}ms  ${id}`);
  } catch (error) {
    failed = true;
    console.log(`✗ ${name.padEnd(16)} FAIL  ${String(error).slice(0, 180)}`);
  }
}

console.log("\nRead-only ABI probes (random device hash):");

async function probe(label, fn) {
  try {
    const result = await fn();
    console.log(`✓ ${label.padEnd(28)} ${JSON.stringify(result, (_k, v) =>
      typeof v === "bigint" ? v.toString() : v,
    )}`);
  } catch (error) {
    failed = true;
    console.log(`✗ ${label.padEnd(28)} ${String(error).slice(0, 220)}`);
  }
}

await probe("device_registry.owner", () => noir.getDeviceOwner(probeDevice));
await probe("device_registry.agent", () => noir.getDeviceAgent(probeDevice));
await probe("agent_registry.policy", () => noir.getPolicy(probeDevice));
await probe("payment_escrow.balance", () => noir.getEscrowBalance(probeDevice));

// An unfunded escrow has no token entry; the host returns MissingValue.
try {
  const token = await noir.getEscrowToken(probeDevice);
  console.log(`✓ ${"payment_escrow.token".padEnd(28)} ${token ?? "null (unfunded)"}`);
} catch (error) {
  if (String(error).includes("MissingValue")) {
    console.log(
      `✓ ${"payment_escrow.token".padEnd(28)} null (unfunded escrow, expected)`,
    );
  } else {
    failed = true;
    console.log(`✗ ${"payment_escrow.token".padEnd(28)} ${String(error).slice(0, 220)}`);
  }
}

process.exit(failed ? 1 : 0);
