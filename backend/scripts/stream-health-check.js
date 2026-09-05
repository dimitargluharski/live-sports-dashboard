const fs = require("fs");
const path = require("path");
const { Agent, fetch } = require("undici");

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

const inputPath = path.resolve(process.cwd(), process.env.FEED_ENRICHED_OUTPUT || "./public/allSoccerGamesToday.json");
const timeoutMs = Number(process.env.STREAM_HEALTH_TIMEOUT_MS || 12000);
const concurrency = Math.max(1, Number(process.env.STREAM_HEALTH_CONCURRENCY || 8));
const insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

function writeJsonAtomically(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temporaryPath, filePath);
}

function isM3u8Url(url) {
  return /\.m3u8(?:[?#]|$)/i.test(url);
}

function looksLikeM3u8(body) {
  return /^\s*#EXTM3U\b/m.test(body)
    && (/^#EXT-X-(?:STREAM-INF|TARGETDURATION|MEDIA-SEQUENCE|ENDLIST)\b/m.test(body)
      || /^#EXTINF:/m.test(body));
}

async function request(url, dispatcher) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      dispatcher,
      headers: {
        "user-agent": "Live Sports Dashboard stream health check",
        accept: isM3u8Url(url) ? "application/vnd.apple.mpegurl, application/x-mpegURL, */*" : "text/html, video/*, */*",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkStream(stream) {
  const checkedAt = new Date().toISOString();

  if (!stream?.url || !/^https?:\/\//i.test(stream.url)) {
    return { healthStatus: "failed", healthCheckedAt: checkedAt, healthError: "Invalid stream URL" };
  }

  let response;
  try {
    try {
      response = await request(stream.url);
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      if (code !== "UNABLE_TO_VERIFY_LEAF_SIGNATURE") throw error;
      response = await request(stream.url, insecureDispatcher);
    }

    const body = await response.text();
    const validM3u8 = isM3u8Url(stream.url) ? looksLikeM3u8(body) : true;
    const healthy = response.ok && validM3u8;

    return {
      healthStatus: healthy ? "healthy" : "failed",
      healthCheckedAt: checkedAt,
      healthHttpStatus: response.status,
      ...(healthy ? {} : { healthError: isM3u8Url(stream.url) && !validM3u8 ? "Invalid m3u8 playlist" : `HTTP ${response.status}` }),
    };
  } catch (error) {
    return {
      healthStatus: "failed",
      healthCheckedAt: checkedAt,
      healthError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapWithConcurrency(items, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runWorker));
  return results;
}

async function run() {
  const payload = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  const streamEntries = [];

  matches.forEach((match, matchIndex) => {
    (Array.isArray(match.streams) ? match.streams : []).forEach((stream, streamIndex) => {
      streamEntries.push({ matchIndex, streamIndex, stream });
    });
  });

  const checked = await mapWithConcurrency(streamEntries, ({ stream }) => checkStream(stream));
  checked.forEach((health, index) => {
    const { matchIndex, streamIndex } = streamEntries[index];
    matches[matchIndex].streams[streamIndex] = {
      ...matches[matchIndex].streams[streamIndex],
      ...health,
    };
  });

  writeJsonAtomically(inputPath, { ...payload, matches });
  const healthyCount = checked.filter((item) => item.healthStatus === "healthy").length;
  console.log(`Stream health check complete: ${healthyCount}/${checked.length} healthy.`);
}

run().catch((error) => {
  console.error(`Stream health check failed: ${error.message}`);
  process.exitCode = 1;
});
