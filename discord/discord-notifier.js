const DISCORD_API_URL = "https://discord.com/api/v10";

function formatError(error) {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function getEnvValue(primaryKey, fallbackKey) {
  return (process.env[primaryKey] || process.env[fallbackKey] || "").trim();
}

async function sendDiscordAlert(payload, options = {}) {
  const botTokenKey = options.botTokenKey || "DISCORD_BOT_TOKEN";
  const channelIdKey = options.channelIdKey || "DISCORD_CHANNEL_ID";
  const botToken = getEnvValue(botTokenKey, options.botTokenFallbackKey);
  const channelId = getEnvValue(channelIdKey, options.channelIdFallbackKey);
  const webhookUrl = getEnvValue(options.webhookUrlKey || "DISCORD_WEBHOOK_URL", options.webhookUrlFallbackKey);

  let url;
  let headers = { "content-type": "application/json" };

  if (botToken && channelId) {
    url = `${DISCORD_API_URL}/channels/${channelId}/messages`;
    headers.Authorization = `Bot ${botToken}`;
  } else if (webhookUrl) {
    url = webhookUrl;
    payload = {
      username: getEnvValue(options.usernameKey || "DISCORD_WEBHOOK_USERNAME", options.usernameFallbackKey) || "Live Sports Dashboard",
      ...payload,
    };
  } else {
    console.warn(`Discord alert skipped: configure ${botTokenKey} and ${channelIdKey}.`);
    return;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        ...payload,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Discord API request failed (${response.status}): ${responseText}`);
    }

    console.log("Discord notification sent successfully.");
  } catch (error) {
    console.warn(`Discord alert skipped: ${formatError(error)}`);
  }
}

function getScraperName() {
  return process.env.DISCORD_SCRAPER_NAME || "Soccer feed scraper";
}

function notifyScraperStarted(kind) {
  return sendDiscordAlert({
    embeds: [{
      title: `${getScraperName()} started`,
      description: `The scraper is now running.`,
      color: 0xf0ad4e,
      timestamp: new Date().toISOString(),
    }],
  });
}

function notifyScraperSucceeded(kind, count, meta = {}) {
  const duration = Number.isFinite(meta.durationMs)
    ? ` in ${(meta.durationMs / 1000).toFixed(1)}s`
    : "";

  return sendDiscordAlert({
    embeds: [{
      title: `${getScraperName()} finished`,
      description: `The **${kind}** scrape completed successfully${duration}.`,
      color: 0x2e8b57,
      fields: [
        { name: "Matches", value: String(Number.isFinite(count) ? count : 0), inline: true },
        ...(Number.isFinite(meta.outputBytes)
          ? [{ name: "Output", value: `${meta.outputBytes} bytes`, inline: true }]
          : []),
      ],
      timestamp: new Date().toISOString(),
    }],
  });
}

function notifyScraperFailed(kind, error) {
  return sendDiscordAlert({
    embeds: [{
      title: `${getScraperName()} failed`,
      description: `The **${kind}** scrape failed.`,
      color: 0xdc3545,
      fields: [{ name: "Error", value: formatError(error).slice(0, 1024) }],
      timestamp: new Date().toISOString(),
    }],
  });
}

function notifyHealthCheck(health) {
  const isHealthy = health.status === "healthy";
  return sendDiscordAlert({
    embeds: [{
      title: isHealthy ? "Feed health check passed" : "Feed health check failed",
      description: isHealthy
        ? "The feed website is reachable and the expected listing was found."
        : `The feed health check failed: ${formatError(health.error)}`,
      color: isHealthy ? 0x2e8b57 : 0xdc3545,
      timestamp: health.checkedAt,
    }],
  }, {
    botTokenKey: "DISCORD_HEALTHCHECK_BOT_TOKEN",
    botTokenFallbackKey: "HEALTHCHECK_DISCORD_BOT_TOKEN",
    channelIdKey: "DISCORD_HEALTHCHECK_CHANNEL_ID",
    channelIdFallbackKey: "HEALTHCHECK_DISCORD_CHANNEL_ID",
    webhookUrlKey: "DISCORD_HEALTHCHECK_WEBHOOK_URL",
    webhookUrlFallbackKey: "HEALTHCHECK_DISCORD_WEBHOOK_URL",
    usernameKey: "DISCORD_HEALTHCHECK_NAME",
    usernameFallbackKey: "HEALTHCHECK_DISCORD_USERNAME",
  });
}

module.exports = {
  notifyScraperStarted,
  notifyScraperSucceeded,
  notifyScraperFailed,
  notifyHealthCheck,
};