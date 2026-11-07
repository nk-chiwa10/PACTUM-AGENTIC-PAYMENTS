import { NextResponse } from "next/server";
import { readState, resetStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetStore();
  const state = readState();
  return NextResponse.json({ state });
}
