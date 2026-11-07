import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { getVeloStatus } from "@/lib/velo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const state = readState();
  return NextResponse.json({ status: getVeloStatus(state) });
}
