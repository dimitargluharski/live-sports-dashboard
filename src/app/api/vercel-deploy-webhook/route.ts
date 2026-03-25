import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.DISCORD_DEPLOY_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing DISCORD_DEPLOY_WEBHOOK_URL" }, { status: 500 });
    }

    const project = body?.project?.name || "(no project name)";
    const url = body?.deployment?.url || "(no url)";
    const buildNumber = body?.deployment?.number || body?.deployment?.meta?.version || "(not provided)";
    const state = body?.deployment?.state || "(not provided)";
    let status;
    if (state === "READY") status = "🟢 Build successful";
    else if (state === "ERROR") status = "🔴 Build failed";
    else if (state && state !== "(not provided)") status = `Status: ${state}`;
    else status = "(no status)";

    const embed = {
      title: `Vercel Deploy: ${project}`,
      url: url.startsWith("http") ? url : `https://${url}`,
      color: state === "READY" ? 0x57F287 : state === "ERROR" ? 0xED4245 : 0x5865F2,
      fields: [
        { name: "Project", value: project, inline: true },
        { name: "Build #", value: String(buildNumber), inline: true },
        { name: "Status", value: status, inline: true },
        { name: "URL", value: url.startsWith("http") ? url : `https://${url}` },
      ],
      timestamp: new Date().toISOString(),
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
