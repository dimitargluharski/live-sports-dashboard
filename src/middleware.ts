import { NextRequest, NextResponse } from "next/server";

// Simple traffic log in memory (for demo; use DB/file for prod)
const trafficLog: { ts: number; ip: string; path: string }[] = [];

export function middleware(req: NextRequest) {
  // Only log page requests (not static, not API)
  if (!req.nextUrl.pathname.startsWith("/api") && !req.nextUrl.pathname.startsWith("/_next") && !req.nextUrl.pathname.includes(".")) {
    trafficLog.push({
      ts: Date.now(),
      ip: req.headers.get("x-forwarded-for") || "?",
      path: req.nextUrl.pathname,
    });
    // Keep only last 500 entries
    if (trafficLog.length > 500) trafficLog.shift();
    // Expose for API
    (globalThis as any).__TRAFFIC_LOG = trafficLog;
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api|_next|.*\\.).*)",
};
