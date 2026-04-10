const fs = require("fs");
const path = require("path");

const STATUS_PATH = path.join(__dirname, "../public/scrape-status.json");

function createEmptyJob() {
  return {
    preparing: false,
    upcomingAt: null,
    running: false,
    startedAt: null,
    finishedAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastCount: null,
    lastDurationMs: null,
    lastOutputBytes: null,
    totalRuns: 0,
    recentRuns: [],
  };
}

function createEmptyStatus() {
  return {
    updatedAt: new Date().toISOString(),
    jobs: {
      main: createEmptyJob(),
      top: createEmptyJob(),
      days: createEmptyJob(),
    },
  };
}

function readStatus() {
  if (!fs.existsSync(STATUS_PATH)) {
    return createEmptyStatus();
  }

  try {
    const raw = fs.readFileSync(STATUS_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const empty = createEmptyStatus();

    return {
      ...empty,
      ...parsed,
      jobs: {
        ...empty.jobs,
        ...(parsed.jobs || {}),
        main: { ...empty.jobs.main, ...((parsed.jobs || {}).main || {}) },
        top: { ...empty.jobs.top, ...((parsed.jobs || {}).top || {}) },
        days: { ...empty.jobs.days, ...((parsed.jobs || {}).days || {}) },
      },
    };
  } catch {
    return createEmptyStatus();
  }
}

function writeStatus(status) {
  const next = {
    ...status,
    updatedAt: new Date().toISOString(),
  };

  const tempPath = `${STATUS_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(next, null, 2), "utf-8");
  fs.renameSync(tempPath, STATUS_PATH);
}

function markJobStarted(jobName) {
  const status = readStatus();
  const now = new Date().toISOString();

  if (!status.jobs[jobName]) return;

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    preparing: false,
    upcomingAt: null,
    running: true,
    startedAt: now,
    finishedAt: null,
    lastError: null,
  };

  writeStatus(status);
}

function markJobSucceeded(jobName, count, stats) {
  const { durationMs = null, outputBytes = null } = stats || {};
  const status = readStatus();
  const now = new Date().toISOString();

  if (!status.jobs[jobName]) return;

  const runEntry = {
    at: now,
    count: Number.isFinite(count) ? count : 0,
    durationMs: typeof durationMs === "number" ? Math.round(durationMs) : null,
    outputBytes: typeof outputBytes === "number" ? outputBytes : null,
  };

  const prevRuns = Array.isArray(status.jobs[jobName].recentRuns)
    ? status.jobs[jobName].recentRuns
    : [];

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    preparing: false,
    upcomingAt: null,
    running: false,
    finishedAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastCount: Number.isFinite(count) ? count : status.jobs[jobName].lastCount,
    lastDurationMs: runEntry.durationMs,
    lastOutputBytes: runEntry.outputBytes,
    totalRuns: (status.jobs[jobName].totalRuns || 0) + 1,
    recentRuns: [runEntry, ...prevRuns].slice(0, 20),
  };

  writeStatus(status);
}

function markJobFailed(jobName, errorMessage) {
  const status = readStatus();
  const now = new Date().toISOString();

  if (!status.jobs[jobName]) return;

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    preparing: false,
    upcomingAt: null,
    running: false,
    finishedAt: now,
    lastError: errorMessage || "Unknown error",
  };

  writeStatus(status);
}

function markJobPreparing(jobName, upcomingAt) {
  const status = readStatus();

  if (!status.jobs[jobName]) return;

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    preparing: true,
    upcomingAt: upcomingAt || null,
  };

  writeStatus(status);
}

function clearTransientStates() {
  const status = readStatus();

  for (const jobName of Object.keys(status.jobs)) {
    status.jobs[jobName] = {
      ...status.jobs[jobName],
      preparing: false,
      upcomingAt: null,
      running: false,
    };
  }

  writeStatus(status);
}

module.exports = {
  STATUS_PATH,
  readStatus,
  clearTransientStates,
  markJobPreparing,
  markJobStarted,
  markJobSucceeded,
  markJobFailed,
};
