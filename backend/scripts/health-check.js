const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { Agent, fetch } = require("undici");
const { notifyHealthCheck } = require("../../discord/discord-notifier");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const baseUrl = (process.env.FEED_BASE_URL || "").trim().replace(/\/+$/, "");
const homePath = process.env.FEED_HOME_PATH || "/";
const eventPathSegment = process.env.FEED_EVENT_PATH_SEGMENT || "/eventinfo/";
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 15000);
const statusPath = path.join(__dirname, "../public/health-status.json");
const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

function writeStatus(status) {
  fs.writeFileSync(statusPath, JSON.stringify(status, null, 2), "utf-8");
}

async function checkUrl(url) {
  async function request(dispatcher) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        dispatcher,
        headers: { "user-agent": "Live Sports Dashboard health check" },
      });
      const body = await response.text();
      return { response, body };
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    return await request(undefined);
  } catch (error) {
    const code = error?.cause?.code || error?.code;
    if (code !== "UNABLE_TO_VERIFY_LEAF_SIGNATURE") throw error;
    return request(insecureDispatcher);
  }
}

async function runHealthCheck() {
  const checkedAt = new Date().toISOString();
  const health = { status: "failed", checkedAt, checks: {} };

  try {
    if (!baseUrl) throw new Error("FEED_BASE_URL is missing");

    const homeUrl = new URL(homePath, `${baseUrl}/`).toString();
    const { response, body } = await checkUrl(homeUrl);
    health.checks.homepage = {
      status: response.ok ? "ok" : "failed",
      httpStatus: response.status,
      url: homeUrl,
    };

    if (!response.ok) throw new Error(`Homepage returned HTTP ${response.status}`);

    const $ = cheerio.load(body);
    const footballLink = $(`a[href*='${eventPathSegment}']`).first().attr("href");
    health.checks.footballListing = {
      status: footballLink ? "ok" : "failed",
      foundEventLink: Boolean(footballLink),
    };

    if (!footballLink) {
      throw new Error(`No link containing ${eventPathSegment} was found`);
    }

    health.status = "healthy";
    writeStatus(health);
    console.log(`Health check passed: ${homeUrl}`);
    void notifyHealthCheck(health);
    return 0;
  } catch (error) {
    health.error = error instanceof Error
      ? `${error.message}${error.cause?.code ? ` (${error.cause.code})` : ""}`
      : String(error);
    writeStatus(health);
    console.error(`Health check failed: ${health.error}`);
    void notifyHealthCheck(health);
    return 1;
  }
}

runHealthCheck().then((exitCode) => process.exitCode = exitCode);