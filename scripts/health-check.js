
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getDiscordWebhookUrl() {
  return process.env.HEALTHCHECK_DISCORD_WEBHOOK_URL
}

function notifyDiscord(message) {
  const url = getDiscordWebhookUrl();
  if (!url) return Promise.resolve();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: message }),
  }).catch(() => { });
}

async function checkGithubToken() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is missing');
  // Test GitHub API call
  return fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `token ${token}`,
      'User-Agent': 'health-check-script',
      'Accept': 'application/vnd.github.v3+json',
    },
  }).then(res => {
    if (res.status !== 200) throw new Error('GITHUB_TOKEN invalid or expired');
  });
}

async function checkDiscordWebhook() {
  const url = getDiscordWebhookUrl();
  if (!url) throw new Error('No Discord webhook URL found');
  // Test POST с кратко съобщение, за да не връща Discord грешка 400
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'health check test' }),
  }).then(async res => {
    if (!res.ok) {
      const text = await res.text();
      console.error('[DEBUG] Discord webhook test failed:', { status: res.status, body: text });
      throw new Error('Discord webhook URL is invalid or not working');
    }
  });
}

function checkEnvVars() {
  const required = ['FEED_BASE_URL', 'GITHUB_TOKEN'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing env vars: ' + missing.join(', '));
  if (!getDiscordWebhookUrl()) {
    throw new Error('Missing env var: HEALTHCHECK_DISCORD_WEBHOOK_URL or DISCORD_WEBHOOK_URL');
  }
}

async function main() {
  loadDotEnv();
  try {
    checkEnvVars();
    await checkGithubToken();
    await checkDiscordWebhook();
    console.log('Health-check passed.');
    await notifyDiscord('✅ Health-check passed. All required environment variables and integrations are working.');
  } catch (err) {
    const msg = `❌ Health-check failed: ${err.message}`;
    console.error(msg);
    await notifyDiscord(msg);
    process.exit(1);
  }
}

main();
