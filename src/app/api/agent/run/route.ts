import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      prompt?: unknown;
    } | null;
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";
    if (!prompt) {
      return NextResponse.json(
        { error: "Tell PACTUM what you need purchased." },
        { status: 400 },
      );
    }
    const outcome = await runAgent(prompt);
    return NextResponse.json(outcome);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
