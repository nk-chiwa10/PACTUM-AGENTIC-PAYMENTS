import { Asset, Networks } from "@stellar/stellar-sdk";

export const NETWORK = "testnet" as const;
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL =
  process.env.NOIR_RPC_URL ?? "https://soroban-testnet.stellar.org";
export const HORIZON_URL = "https://horizon-testnet.stellar.org";
export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const EXPLORER_BASE = "https://stellar.expert/explorer/testnet";

/**
 * The Noir deployment referenced by the hackathon brief. The brief's copy
 * renders two "0" characters where the Stellar StrKey alphabet uses the
 * letter "O"; these are the checksum-valid addresses.
 */
export const NOIR_CONTRACTS = {
  deviceRegistry:
    process.env.NOIR_DEVICE_REGISTRY ??
    "CB4DPMGOA374JIB2ZVD4AHW5GJKQUYNOFGRYNOJ75EFH2KCJSMHOWIRA",
  agentRegistry:
    process.env.NOIR_AGENT_REGISTRY ??
    "CBTDMJVCFQDIVWZBKAKZ2FQ3UEJNAAUFYCTJ3E4ON2MYXPLPSIXQ25JZ",
  paymentEscrow:
    process.env.NOIR_PAYMENT_ESCROW ??
    "CA5S4S7QGHJHJWVJBYL3CXZXZTNGKXMNZVDAEQNN7NUXFP4D7BYK7HIX",
} as const;

/** Native XLM Stellar Asset Contract on Testnet. */
export const XLM_SAC =
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/** Circle's Testnet USDC issuer. Used only as a reference in the UI. */
export const TESTNET_USDC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

export const DEMO_ASSET_CODE = "USDC";
export const DEMO_ASSET_DECIMALS = 7;
export const STROOPS_PER_UNIT = 10_000_000;

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

export const VELO_ENV =
  (process.env.VELO_ENV as "testnet" | "production" | "development") ??
  "testnet";
export const VELO_BASE_URL =
  process.env.VELO_BASE_URL ?? "https://www.velo-build.dev";

export const LLM_MODEL = process.env.PACTUM_LLM_MODEL ?? "gpt-4o-mini";

export function assetContractId(code: string, issuer: string): string {
  return new Asset(code, issuer).contractId(NETWORK_PASSPHRASE);
}

export function toStroops(amount: number | string): bigint {
  const value = typeof amount === "number" ? amount.toFixed(7) : amount.trim();
  const [whole, fraction = ""] = value.split(".");
  const padded = (fraction + "0000000").slice(0, 7);
  const sign = whole.startsWith("-") ? -1n : 1n;
  const wholeAbs = whole.replace("-", "") || "0";
  return sign * (BigInt(wholeAbs) * BigInt(STROOPS_PER_UNIT) + BigInt(padded));
}

export function fromStroops(stroops: bigint | string): number {
  const value = typeof stroops === "string" ? BigInt(stroops) : stroops;
  return Number(value) / STROOPS_PER_UNIT;
}

export function formatAmount(amount: number, asset?: string): string {
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${asset ?? "USDC"}`;
}

export function txExplorer(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function accountExplorer(address: string): string {
  return `${EXPLORER_BASE}/account/${address}`;
}

export function contractExplorer(id: string): string {
  return `${EXPLORER_BASE}/contract/${id}`;
}
