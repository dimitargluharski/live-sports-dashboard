const fs = require('fs');
const path = require('path');
const https = require('https');

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

function notifyDiscord(message) {
  const url = process.env.DISCORD_WEBHOOK_URL;
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
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) throw new Error('DISCORD_WEBHOOK_URL is missing');
  // Test POST (will not ping everyone)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '✅ Discord webhook health-check (ignore this message)' }),
  }).then(res => {
    if (!res.ok) throw new Error('DISCORD_WEBHOOK_URL is invalid or not working');
  });
}

function checkEnvVars() {
  const required = ['FEED_BASE_URL', 'GITHUB_TOKEN', 'DISCORD_WEBHOOK_URL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing env vars: ' + missing.join(', '));
}

async function main() {
  loadDotEnv();
  try {
    checkEnvVars();
    await checkGithubToken();
    await checkDiscordWebhook();
    console.log('Health-check passed.');
  } catch (err) {
    const msg = `❌ Health-check failed: ${err.message}`;
    console.error(msg);
    await notifyDiscord(msg);
    process.exit(1);
  }
}

main();
