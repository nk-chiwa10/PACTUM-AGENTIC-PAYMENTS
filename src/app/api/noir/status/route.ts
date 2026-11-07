import { NextResponse } from "next/server";
import { readNoirStatus, verifyNoirDeployment } from "@/lib/noir";
import { readState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const state = readState();
    const status = await readNoirStatus(state);
    return NextResponse.json({ status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const proof = await verifyNoirDeployment();
    return NextResponse.json({
      ...proof,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
