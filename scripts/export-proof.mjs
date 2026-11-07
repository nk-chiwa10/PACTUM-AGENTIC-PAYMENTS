#!/usr/bin/env node
/**
 * Export a self-contained proof bundle from a running PACTUM instance.
 *
 *   node scripts/export-proof.mjs [baseUrl]
 *
 * Writes `docs/pactum-proof.json` with app state, Velo configuration and a
 * fresh on-chain contract verification. Safe to run repeatedly.
 */
import fs from "node:fs";
import path from "node:path";

const base = (process.argv[2] ?? process.env.PACTUM_URL ?? "http://localhost:3000").replace(/\/$/, "");
const outDir = path.resolve(process.cwd(), "docs");
const outFile = path.join(outDir, "pactum-proof.json");

async function getJson(url, init) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${url} -> HTTP ${response.status}: ${payload?.error ?? "unknown error"}`);
  }
  return payload;
}

const statePayload = await getJson(`${base}/api/state`);
const proof = await getJson(`${base}/api/noir/status`, { method: "POST" });

const transactions = statePayload.state?.transactions ?? [];
const liveTxs = transactions.filter((tx) => !tx.simulated);
const hashes = [
  ...Object.entries(statePayload.state?.identity?.bootstrapTxHashes ?? {}).map(
    ([label, hash]) => ({ group: "bootstrap", label, hash }),
  ),
  ...liveTxs.flatMap((tx) => {
    const rows = [];
    if (tx.noirTxHash) rows.push({ group: "payment", label: `${tx.serviceName}:authorize`, hash: tx.noirTxHash });
    if (tx.noirClaimTxHash) rows.push({ group: "payment", label: `${tx.serviceName}:claim`, hash: tx.noirClaimTxHash });
    if (tx.stellarTxHash && tx.stellarTxHash !== tx.noirClaimTxHash)
      rows.push({ group: "payment", label: `${tx.serviceName}:settle`, hash: tx.stellarTxHash });
    return rows;
  }),
];

if (statePayload.state?.policy?.onchainTxHash) {
  hashes.push({
    group: "policy",
    label: "register_agent",
    hash: statePayload.state.policy.onchainTxHash,
  });
}

const bundle = {
  project: "PACTUM — Autonomous AI Agent for Paying Digital Services",
  tagline: "Intelligence in Motion. Trust in Every Transaction.",
  generatedAt: new Date().toISOString(),
  network: "Stellar Testnet",
  baseUrl: base,
  app: {
    mode: statePayload.state?.mode,
    policy: statePayload.state?.policy,
    identity: statePayload.state?.identity,
    transactions: liveTxs,
    audit: statePayload.state?.audit,
  },
  velo: statePayload.velo,
  noirProof: proof,
  onchainArtifacts: hashes,
  explorerBase: "https://stellar.expert/explorer/testnet/tx/",
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(bundle, null, 2), "utf8");

const reachable = Object.values(proof.contracts ?? {}).filter((c) => c.reachable).length;
console.log(`Wrote ${outFile}`);
console.log(`Mode: ${bundle.app.mode}`);
console.log(`Contracts reachable: ${reachable}/${Object.keys(proof.contracts ?? {}).length}`);
console.log(`Live transactions: ${liveTxs.length}`);
console.log(`On-chain artifacts: ${hashes.length}`);
for (const row of hashes) console.log(`  ${row.group.padEnd(10)} ${row.label.padEnd(34)} ${row.hash}`);
