const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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

const rootDir = path.resolve(__dirname, "../..");
const backendJsonPath = path.join(rootDir, "backend/public/allSoccerGamesToday.json");
const frontendJsonPath = path.join(rootDir, "frontend/public/allSoccerGamesToday.json");
const scraperStatusPath = path.join(rootDir, "backend/public/scrape-status.json");
const statusPath = path.join(rootDir, "backend/public/health-monitor-status.json");
const baseUrl = (process.env.FEED_BASE_URL || "").trim().replace(/\/+$/, "");
const homePath = process.env.FEED_HOME_PATH || "/";
const eventPathSegment = process.env.FEED_EVENT_PATH_SEGMENT || "/eventinfo/";
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 15000);
const maxAgeMinutes = Number(process.env.HEALTHCHECK_MAX_JSON_AGE_MINUTES || 30);
const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const key of Object.keys(value).filter((item) => !["scrapedAt", "enrichedAt", "sourceFile"].includes(item)).sort()) {
    output[key] = normalize(value[key]);
  }
  return output;
}

function fileInfo(filePath) {
  const stats = fs.statSync(filePath);
  return {
    exists: true,
    modifiedAt: stats.mtime.toISOString(),
    ageMinutes: Number(((Date.now() - stats.mtimeMs) / 60000).toFixed(1)),
    bytes: stats.size,
  };
}

async function checkWebsite() {
  if (!baseUrl) throw new Error("FEED_BASE_URL is missing");
  const url = new URL(homePath, `${baseUrl}/`).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  async function request(dispatcher) {
    try {
      return await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        dispatcher,
        headers: { "user-agent": "Live Sports Dashboard health monitor" },
      });
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      if (code !== "UNABLE_TO_VERIFY_LEAF_SIGNATURE") throw error;
      return fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        dispatcher: insecureDispatcher,
        headers: { "user-agent": "Live Sports Dashboard health monitor" },
      });
    }
  }

  try {
    const response = await request(undefined);
    const html = await response.text();
    if (!response.ok) throw new Error(`Website returned HTTP ${response.status}`);
    const footballLink = cheerio.load(html)(`a[href*='${eventPathSegment}']`).first().attr("href");
    if (!footballLink) throw new Error(`No link containing ${eventPathSegment} was found`);
    return { status: "ok", httpStatus: response.status, url };
  } finally {
    clearTimeout(timeout);
  }
}

function checkJsonFiles() {
  const files = {};
  for (const [name, filePath] of [["backend", backendJsonPath], ["frontend", frontendJsonPath]]) {
    try {
      files[name] = fileInfo(filePath);
      files[name].validJson = Boolean(readJson(filePath));
    } catch (error) {
      files[name] = { exists: false, validJson: false, error: error.message };
    }
  }

  let matches = false;
  if (files.backend.validJson && files.frontend.validJson) {
    matches = JSON.stringify(normalize(readJson(backendJsonPath))) === JSON.stringify(normalize(readJson(frontendJsonPath)));
  }

  return {
    status: files.backend.validJson && files.frontend.validJson && matches
      && files.backend.ageMinutes <= maxAgeMinutes
      && files.frontend.ageMinutes <= maxAgeMinutes
      ? "ok" : "failed",
    maxAgeMinutes,
    match: matches,
    files,
  };
}

function checkScraperStatus() {
  try {
    const status = readJson(scraperStatusPath).days;
    const finishedAt = status?.finishedAt ? new Date(status.finishedAt) : null;
    const ageMinutes = finishedAt ? Number(((Date.now() - finishedAt.getTime()) / 60000).toFixed(1)) : null;
    return {
      status: status?.status === "success" && ageMinutes !== null && ageMinutes <= maxAgeMinutes ? "ok" : "failed",
      jobStatus: status?.status || "missing",
      finishedAt: status?.finishedAt || null,
      ageMinutes,
      count: status?.count ?? null,
      error: status?.error || null,
    };
  } catch (error) {
    return { status: "failed", jobStatus: "missing", error: error.message };
  }
}

async function run() {
  const result = { status: "failed", checkedAt: new Date().toISOString(), checks: {} };
  try {
    result.checks.website = await checkWebsite();
    result.checks.json = checkJsonFiles();
    result.checks.scraper = checkScraperStatus();
    const checksPassed = Object.values(result.checks).every((check) => check.status === "ok");
    result.status = checksPassed ? "healthy" : "failed";
    if (!checksPassed) throw new Error("One or more health checks failed");
    console.log("Health monitor passed: website, scraper status, and frontend JSON are healthy.");
  } catch (error) {
    result.error = error.message;
    console.error(`Health monitor failed: ${error.message}`);
  }

  fs.writeFileSync(statusPath, JSON.stringify(result, null, 2), "utf-8");
  void notifyHealthCheck(result);
  process.exitCode = result.status === "healthy" ? 0 : 1;
}

run();