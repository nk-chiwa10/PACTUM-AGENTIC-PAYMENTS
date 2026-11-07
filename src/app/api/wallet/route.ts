import { NextResponse } from "next/server";
import { Horizon } from "@stellar/stellar-sdk";
import { HORIZON_URL } from "@/lib/config";
import { readState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const server = new Horizon.Server(HORIZON_URL);

async function balances(address: string) {
  try {
    const account = await server.loadAccount(address);
    return account.balances.map((balance) => ({
      asset:
        "asset_code" in balance
          ? `${balance.asset_code}:${balance.asset_issuer}`
          : "XLM",
      balance: balance.balance,
    }));
  } catch (error) {
    return [
      {
        asset: "ERROR",
        balance: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      },
    ];
  }
}

export async function GET() {
  const state = readState();
  const [owner, agent, merchant] = await Promise.all([
    balances(state.identity.ownerAddress),
    balances(state.identity.agentAddress),
    balances(state.identity.merchantAddress),
  ]);
  return NextResponse.json({
    mode: state.mode,
    owner: { address: state.identity.ownerAddress, balances: owner },
    agent: { address: state.identity.agentAddress, balances: agent },
    merchant: { address: state.identity.merchantAddress, balances: merchant },
  });
}
