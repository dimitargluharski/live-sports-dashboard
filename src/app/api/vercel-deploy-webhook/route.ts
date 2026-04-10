import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const webhookUrl = process.env.DISCORD_DEPLOY_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json({ error: "Missing DISCORD_DEPLOY_WEBHOOK_URL" }, { status: 500 });
    }

    const project = body?.project?.name || "(no project name)";
    const rawUrl = body?.deployment?.url || body?.url || "";
    const liveUrl = rawUrl
      ? rawUrl.startsWith("http")
        ? rawUrl
        : `https://${rawUrl}`
      : "(no url)";
    const buildNumber = body?.deployment?.number || body?.deployment?.meta?.version || body?.deploymentId || "(not provided)";
    const state = body?.deployment?.state || "(not provided)";
    const commitSha =
      body?.deployment?.meta?.githubCommitSha ||
      body?.deployment?.meta?.githubCommitRef ||
      body?.git?.sha ||
      body?.git?.commitSha ||
      "";
    const shortCommitSha = typeof commitSha === "string" && commitSha ? commitSha.slice(0, 7) : "";
    const versionLabel = shortCommitSha || String(buildNumber);
    const branch = body?.deployment?.meta?.githubCommitRef || body?.git?.ref || body?.target || "production";
    let status;
    if (state === "READY") status = "🟢 Build successful";
    else if (state === "ERROR") status = "🔴 Build failed";
    else if (state && state !== "(not provided)") status = `Status: ${state}`;
    else status = "(no status)";

    const description =
      state === "READY"
        ? `Live now: ${liveUrl}`
        : state === "ERROR"
          ? "Deployment did not reach READY state."
          : "Deployment event received.";

    const embed = {
      title: `Vercel Deploy: ${project}`,
      description,
      url: liveUrl !== "(no url)" ? liveUrl : undefined,
      color: state === "READY" ? 0x57F287 : state === "ERROR" ? 0xED4245 : 0x5865F2,
      fields: [
        { name: "Project", value: project, inline: true },
        { name: "Version", value: String(versionLabel), inline: true },
        { name: "Status", value: status, inline: true },
        { name: "Branch", value: String(branch), inline: true },
        { name: "Build #", value: String(buildNumber), inline: true },
        { name: "URL", value: liveUrl },
      ],
      timestamp: new Date().toISOString(),
    };

    const discordResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordResponse.ok) {
      return NextResponse.json({ error: "Discord webhook rejected deploy notification" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
