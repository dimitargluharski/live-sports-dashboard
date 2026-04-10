const fs = require("fs");
const path = require("path");

const STATUS_PATH = path.join(__dirname, "../public/scrape-status.json");

function createEmptyStatus() {
  return {
    updatedAt: new Date().toISOString(),
    jobs: {
      main: {
        running: false,
        startedAt: null,
        finishedAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastCount: null,
      },
      top: {
        running: false,
        startedAt: null,
        finishedAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastCount: null,
      },
      days: {
        running: false,
        startedAt: null,
        finishedAt: null,
        lastSuccessAt: null,
        lastError: null,
        lastCount: null,
      },
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
    running: true,
    startedAt: now,
    finishedAt: null,
    lastError: null,
  };

  writeStatus(status);
}

function markJobSucceeded(jobName, count) {
  const status = readStatus();
  const now = new Date().toISOString();

  if (!status.jobs[jobName]) return;

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    running: false,
    finishedAt: now,
    lastSuccessAt: now,
    lastError: null,
    lastCount: Number.isFinite(count) ? count : status.jobs[jobName].lastCount,
  };

  writeStatus(status);
}

function markJobFailed(jobName, errorMessage) {
  const status = readStatus();
  const now = new Date().toISOString();

  if (!status.jobs[jobName]) return;

  status.jobs[jobName] = {
    ...status.jobs[jobName],
    running: false,
    finishedAt: now,
    lastError: errorMessage || "Unknown error",
  };

  writeStatus(status);
}

module.exports = {
  STATUS_PATH,
  readStatus,
  markJobStarted,
  markJobSucceeded,
  markJobFailed,
};
