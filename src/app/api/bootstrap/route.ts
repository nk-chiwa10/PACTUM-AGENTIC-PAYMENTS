import { NextResponse } from "next/server";
import { bootstrapTestnet, friendlyBootstrapError } from "@/lib/bootstrap";
import { readState } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

let bootstrapLock = false;

export async function POST() {
  if (bootstrapLock) {
    return NextResponse.json(
      { error: "Live initialization is already running." },
      { status: 409 },
    );
  }
  bootstrapLock = true;
  try {
    const result = await bootstrapTestnet();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: friendlyBootstrapError(error),
        state: readState(),
      },
      { status: 500 },
    );
  } finally {
    bootstrapLock = false;
  }
}
