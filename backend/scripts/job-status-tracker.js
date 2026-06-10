const fs = require("fs");
const path = require("path");

const STATUS_PATH = path.join(__dirname, "../public/scrape-status.json");

function ensureDir() {
  const dir = path.dirname(STATUS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStatus() {
  try {
    if (!fs.existsSync(STATUS_PATH)) return {};
    const raw = fs.readFileSync(STATUS_PATH, "utf-8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeJobState(kind, patch) {
  ensureDir();
  const state = readStatus();
  state[kind] = {
    ...(state[kind] || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(STATUS_PATH, JSON.stringify(state, null, 2), "utf-8");
}

function markJobStarted(kind) {
  writeJobState(kind, {
    status: "running",
    startedAt: new Date().toISOString(),
    error: null,
  });
}

function markJobSucceeded(kind, count, meta = {}) {
  writeJobState(kind, {
    status: "success",
    finishedAt: new Date().toISOString(),
    count: Number.isFinite(count) ? count : 0,
    meta,
    error: null,
  });
}

function markJobFailed(kind, error) {
  writeJobState(kind, {
    status: "failed",
    finishedAt: new Date().toISOString(),
    error: error || "Unknown error",
  });
}

module.exports = {
  markJobStarted,
  markJobSucceeded,
  markJobFailed,
};
