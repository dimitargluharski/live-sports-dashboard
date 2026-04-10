import { NextResponse } from "next/server";

export async function GET() {
  // Expose the in-memory traffic log
  const log = (globalThis as any).__TRAFFIC_LOG as Array<{ ts: number; ip: string; path: string }> | undefined;
  return NextResponse.json({ log: log ?? [] });
}
