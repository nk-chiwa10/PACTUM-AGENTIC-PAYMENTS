#!/usr/bin/env node
/**
 * Verify every live Testnet hash produced by this PACTUM vault.
 *
 *   node scripts/verify-live-run.mjs [hash ...]
 *
 * With no arguments it reads `.data/state.json` and checks the bootstrap
 * hashes plus every transaction hash. Each entry is fetched from Soroban RPC
 * and printed with its ledger, status and Stellar Expert URL.
 */
import fs from "node:fs";
import path from "node:path";

const RPC_URL = process.env.NOIR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const STATE_FILE = path.resolve(process.cwd(), ".data", "pactum-state.json");

function hashesFromState() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error(`No state file at ${STATE_FILE}`);
    process.exit(2);
  }
  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  const rows = new Map();

  for (const [label, hash] of Object.entries(
    state.identity?.bootstrapTxHashes ?? {},
  )) {
    if (typeof hash === "string" && hash) rows.set(hash, `bootstrap:${label}`);
  }
  for (const tx of state.transactions ?? []) {
    if (tx.noirTxHash) rows.set(tx.noirTxHash, `${tx.serviceName}:authorize`);
    if (tx.noirClaimTxHash)
      rows.set(tx.noirClaimTxHash, `${tx.serviceName}:claim`);
    if (tx.stellarTxHash && tx.stellarTxHash !== tx.noirClaimTxHash)
      rows.set(tx.stellarTxHash, `${tx.serviceName}:settle`);
  }
  if (state.policy?.onchainTxHash) {
    rows.set(state.policy.onchainTxHash, "policy:register_agent");
  }
  return [...rows.entries()].map(([hash, label]) => ({ hash, label }));
}

async function getTransaction(hash) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getTransaction",
      params: { hash },
    }),
  });
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message ?? "RPC error");

  const result = payload.result;
  if (result?.status && result.status !== "NOT_FOUND") return result;

  // Classic operations (Friendbot funding, trustlines, issuance) are not
  // indexed by Soroban RPC, so fall back to Horizon for those.
  const horizon = await fetch(
    `https://horizon-testnet.stellar.org/transactions/${hash}`,
    { headers: { accept: "application/json" } },
  );
  if (!horizon.ok) return result ?? { status: "NOT_FOUND" };
  const tx = await horizon.json();
  return {
    status: tx.successful ? "SUCCESS" : "FAILED",
    ledger: tx.ledger,
    source: "horizon",
  };
}

const requested = process.argv.slice(2);
const rows = requested.length
  ? requested.map((hash) => ({ hash, label: "manual" }))
  : hashesFromState();

if (rows.length === 0) {
  console.log("No hashes found. Run the live Testnet bootstrap first.");
  process.exit(0);
}

let failed = 0;
for (const { hash, label } of rows) {
  try {
    const result = await getTransaction(hash);
    const ok = result?.status === "SUCCESS";
    if (!ok) failed += 1;
    console.log(
      `${ok ? "✓" : "✗"} ${label.padEnd(36)} ${result?.status ?? "NOT_FOUND"}  ledger ${result?.ledger ?? "?"}  ${result?.source === "horizon" ? "[horizon] " : ""}${hash}`,
    );
    console.log(`   https://stellar.expert/explorer/testnet/tx/${hash}`);
  } catch (error) {
    failed += 1;
    console.log(`✗ ${label.padEnd(36)} ERROR  ${String(error).slice(0, 160)}`);
  }
}

console.log(
  `\n${rows.length - failed}/${rows.length} transactions confirmed on Stellar Testnet.`,
);
process.exit(failed === 0 ? 0 : 1);
