import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function notifyDiscord(message: string): Promise<void> {
  const webhookUrl = (
    process.env.CRON_DISCORD_WEBHOOK_URL ||
    process.env.SCRAPE_DISCORD_WEBHOOK_URL ||
    process.env.DISCORD_DEPLOY_WEBHOOK_URL ||
    ""
  ).trim();

  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
      cache: "no-store",
    });
  } catch {
    // Ignore Discord transport issues so cron endpoint remains reliable.
  }
}

function getBearerToken(value: string | null): string | null {
  if (!value) return null;
  const [scheme, token] = value.split(" ");
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return token.trim();
}

export async function GET(req: NextRequest) {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const deployHookUrl = (process.env.DEPLOY_HOOK_URL || "").trim();

  if (!cronSecret) {
    return NextResponse.json({ error: "Missing CRON_SECRET" }, { status: 500 });
  }

  if (!deployHookUrl) {
    return NextResponse.json({ error: "Missing DEPLOY_HOOK_URL" }, { status: 500 });
  }

  const authToken = getBearerToken(req.headers.get("authorization"));
  const queryToken = (req.nextUrl.searchParams.get("secret") || "").trim();
  const provided = authToken || queryToken;

  if (provided !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await notifyDiscord("Scrape scheduler started (vercel-cron). Triggering new deploy.");

    const response = await fetch(deployHookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "vercel-cron", source: "api/cron/scrape" }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      await notifyDiscord(`Scrape scheduler failed (vercel-cron). Deploy hook status: ${response.status}.`);
      return NextResponse.json(
        {
          error: "Deploy hook call failed",
          status: response.status,
          body,
        },
        { status: 502 },
      );
    }

    await notifyDiscord("Scrape scheduler completed (vercel-cron). Deploy accepted.");
    return NextResponse.json({ ok: true, triggeredAt: new Date().toISOString() });
  } catch (error) {
    await notifyDiscord(
      `Scrape scheduler failed (vercel-cron). ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return NextResponse.json(
      {
        error: "Deploy hook request failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
