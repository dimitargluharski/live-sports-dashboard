#!/usr/bin/env node
/**
 * Local Scheduler for Feed Scraping
 * 
 * Runs periodic tasks:
 * - Top feed: every 10 minutes
 * - Days feed: every 15 minutes
 * - Main feed: manual only (optional)
 */

const cron = require("node-cron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const simpleGit = require("simple-git");
const { clearTransientStates, markJobPreparing } = require("./scripts/scrape-status");

const LOCK_PATH = path.join(process.cwd(), ".scheduler.lock");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

// Environment setup
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim();
const GITHUB_OWNER = (process.env.GITHUB_OWNER || "dimitargluharski").trim();
const GITHUB_REPO = process.env.GITHUB_REPO || "live-sports-dashboard";
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || "main").trim();
const GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || "scheduler-bot";
const GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || "scheduler@example.com";
const NOTIFY_ON_START = process.env.DISCORD_NOTIFY_START === "1";
const NOTIFY_ON_NO_CHANGES = process.env.DISCORD_NOTIFY_NO_CHANGES === "1";
const DISCORD_WEBHOOK_URL = (
  process.env.SCRAPE_DISCORD_WEBHOOK_URL ||
  process.env.CRON_DISCORD_WEBHOOK_URL ||
  ""
).trim();

const git = simpleGit();
let gitOperationQueue = Promise.resolve();
const taskState = {
  top: false,
  days: false,
  main: false,
};

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  if (fs.existsSync(LOCK_PATH)) {
    try {
      const existingPid = Number(fs.readFileSync(LOCK_PATH, "utf-8").trim());
      if (isProcessRunning(existingPid)) {
        console.error(`Another scheduler instance is already running (pid ${existingPid}).`);
        process.exit(1);
      }
    } catch {
      // Ignore stale/invalid lock content.
    }
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid), "utf-8");
}

function releaseLock() {
  try {
    if (!fs.existsSync(LOCK_PATH)) return;
    const existingPid = Number(fs.readFileSync(LOCK_PATH, "utf-8").trim());
    if (existingPid === process.pid) {
      fs.unlinkSync(LOCK_PATH);
    }
  } catch {
    // Best-effort cleanup.
  }
}

async function runTaskOnce(taskName, taskFn) {
  if (taskState[taskName]) {
    console.log(`[TASK] Skipping ${taskName}; previous run still in progress.`);
    return;
  }

  taskState[taskName] = true;
  try {
    await taskFn();
  } finally {
    taskState[taskName] = false;
  }
}

async function notifyDiscord(message) {
  if (!DISCORD_WEBHOOK_URL) return;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message }),
    });
  } catch (error) {
    console.warn("Discord notification failed:", error instanceof Error ? error.message : String(error));
  }
}

function runGitExclusive(operation) {
  const next = gitOperationQueue.then(operation, operation);
  gitOperationQueue = next.catch(() => undefined);
  return next;
}

async function pushWithRetry() {
  try {
    await git.push("origin", `HEAD:${GITHUB_BRANCH}`);
    return { retried: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isNonFastForward = /non-fast-forward|\[rejected\]|fetch first|tip of your current branch is behind/i.test(message);

    if (!isNonFastForward) {
      throw error;
    }

    console.warn("Push rejected (non-fast-forward). Rebasing from remote and retrying push...");
    await git.pull("origin", GITHUB_BRANCH, { "--rebase": "true" });
    await git.push("origin", `HEAD:${GITHUB_BRANCH}`);
    return { retried: true };
  }
}

/**
 * Execute npm script and return promise
 */
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", scriptName], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        // Keep Discord notifications centralized in scheduler messages.
        SCRAPE_DISCORD_WEBHOOK_URL: "",
      },
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✓ Script '${scriptName}' completed successfully`);
        resolve(true);
      } else {
        console.error(`✗ Script '${scriptName}' failed with code ${code}`);
        reject(new Error(`Script ${scriptName} failed`));
      }
    });

    child.on("error", (err) => {
      console.error(`✗ Failed to run script '${scriptName}':`, err.message);
      reject(err);
    });
  });
}

/**
 * Commit and push changes safely
 */
async function commitAndPush(message) {
  return runGitExclusive(async () => {
    try {
      const feedFiles = [
        "public/matches-feed-main.json",
        "public/matches-feed-top.json",
        "public/matches-feed-days.json",
      ];
      const scopedStatus = (await git.raw(["status", "--porcelain", "--", ...feedFiles])).trim();
      const hasChanges = Boolean(scopedStatus);

      if (!hasChanges) {
        console.log("No feed changes to commit.");
        return { committed: false, reason: "no_changes" };
      }

      // Stage only feed files
      await git.add(feedFiles);

      // Set git config for commit
      await git.addConfig("user.name", GIT_AUTHOR_NAME);
      await git.addConfig("user.email", GIT_AUTHOR_EMAIL);

      // Commit
      await git.commit(message);

      // Push with auth if token available
      if (GITHUB_TOKEN) {
        console.log("Pushing with GitHub token...");
        const remoteUrl = `https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git`;
        try {
          await git.exec(["remote", "set-url", "origin", remoteUrl]);
        } catch (e) {
          // Ignore if remote doesn't exist
        }
      }

      const pushResult = await pushWithRetry();
      console.log(`✓ Committed and pushed: "${message}"`);
      return { committed: true, reason: pushResult.retried ? "pushed_after_rebase" : "pushed" };
    } catch (error) {
      console.error(`✗ Git operation failed:`, error.message);
      // Don't fail the scheduler on git errors
      return { committed: false, reason: "git_error", error: error instanceof Error ? error.message : String(error) };
    }
  });
}

/**
 * Task: Refresh top feed
 */
async function taskTopFeed() {
  console.log("\n[TASK] Running top feed scraper...");
  const startedAt = Date.now();

  try {
    if (NOTIFY_ON_START) {
      await notifyDiscord("🟡 Top Matches Feed update started (every 15 min)");
    }
    await runScript("scrape:feed:top");
    const gitResult = await commitAndPush("chore(feed): refresh top matches");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 Top Matches Feed updated in ${durationSec}s.`);
    } else if (gitResult.reason === "no_changes") {
      if (NOTIFY_ON_NO_CHANGES) {
        await notifyDiscord(`ℹ️ No changes in Top Matches Feed.`);
      }
    } else {
      await notifyDiscord(`🟠 Top Matches Feed sync error: ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Top feed task failed:", error.message);
    await notifyDiscord(`🔴 Top Matches Feed update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Task: Refresh days feed
 */
async function taskDaysFeed() {
  console.log("\n[TASK] Running days feed scraper...");
  const startedAt = Date.now();

  try {
    if (NOTIFY_ON_START) {
      await notifyDiscord("🟡 Day Matches Feed update started (every 15 min)");
    }
    await runScript("scrape:feed:days");
    const gitResult = await commitAndPush("chore(feed): refresh day matches");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 Day Matches Feed updated in ${durationSec}s.`);
    } else if (gitResult.reason === "no_changes") {
      if (NOTIFY_ON_NO_CHANGES) {
        await notifyDiscord(`ℹ️ No changes in Day Matches Feed.`);
      }
    } else {
      await notifyDiscord(`🟠 Day Matches Feed sync error: ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Days feed task failed:", error.message);
    await notifyDiscord(`🔴 Day Matches Feed update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Task: Refresh main feed (optional, less frequent)
 */
async function taskMainFeed() {
  console.log("\n[TASK] Running main feed scraper...");
  const startedAt = Date.now();

  try {
    if (NOTIFY_ON_START) {
      await notifyDiscord("🟡 Main Feed update started (manual/less frequent)");
    }
    await runScript("scrape:feed");
    const gitResult = await commitAndPush("chore(feed): refresh main feed");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 Main Feed updated in ${durationSec}s.`);
    } else if (gitResult.reason === "no_changes") {
      if (NOTIFY_ON_NO_CHANGES) {
        await notifyDiscord(`ℹ️ No changes in Main Feed.`);
      }
    } else {
      await notifyDiscord(`🟠 Main Feed sync error: ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Main feed task failed:", error.message);
    await notifyDiscord(`🔴 Main Feed update failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Startup: Log configuration and validate env
 */
function startup() {
  clearTransientStates();
  console.log("\n╔════════════════════════════════════════════════════════╗");
  // console.log("║        Feed Scheduler (Local Host) Started           ║");
  // console.log("╚════════════════════════════════════════════════════════╝\n");

  const feedBaseUrl = (process.env.FEED_BASE_URL || "").trim();
  if (!feedBaseUrl) {
    console.error("ERROR: FEED_BASE_URL environment variable is missing!");
    process.exit(1);
  }

  // console.log("Configuration:");
  // console.log(`  FEED_BASE_URL: ${feedBaseUrl}`);
  // console.log(`  GITHUB_REPO: ${GITHUB_OWNER}/${GITHUB_REPO} (${GITHUB_BRANCH})`);
  // console.log(`  GIT_AUTHOR: ${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>`);
  // console.log(`  GitHub Token: ${GITHUB_TOKEN ? "SET" : "NOT SET (git push will fail)"}`);
  console.log("\nSchedule:");
  console.log("  Top feed: every 15 minutes");
  console.log("  Days feed: every 15 minutes");
  console.log("  Main feed: manual only\n");

  console.log("Ready. Waiting for scheduled tasks...\n");

  notifyDiscord(
    "🟢 Scheduler started successfully!\nAll automated scrape and sync processes are active.\n\nTo stop: Ctrl+C или kill process.\nЗа логове: виж терминала или GitHub commits."
  );
}

function markUpcomingFeedRefresh() {
  const startsAt = new Date(Date.now() + 60_000).toISOString();
  markJobPreparing("top", startsAt);
  markJobPreparing("days", startsAt);
}

/**
 * Initialize scheduler tasks
 */
function initializeScheduler() {
  // Show informational update state one minute before the quarter-hour sync.
  cron.schedule("14,29,44,59 * * * *", markUpcomingFeedRefresh, {
    name: "feed-prep",
    runOnInit: false,
  });

  // Top feed: every 15 minutes
  cron.schedule("0,15,30,45 * * * *", () => runTaskOnce("top", taskTopFeed), {
    name: "top-feed",
    runOnInit: false,
  });

  // Days feed: every 15 minutes
  cron.schedule("0,15,30,45 * * * *", () => runTaskOnce("days", taskDaysFeed), {
    name: "days-feed",
    runOnInit: false,
  });

  console.log("Cron tasks registered successfully.");
}

/**
 * Main entry point
 */
function main() {
  acquireLock();
  startup();
  initializeScheduler();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("\nShutdown signal received. Cleaning up...");
    clearTransientStates();
    releaseLock();
    notifyDiscord("🔴 Scheduler stopped (SIGTERM). All automated scrape and sync processes are terminated.");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("\nInterrupt signal received. Cleaning up...");
    clearTransientStates();
    releaseLock();
    notifyDiscord("🔴 Scheduler stopped (Ctrl+C / SIGINT). All automated scrape and sync processes are terminated.");
    process.exit(0);
  });

  process.on("exit", (code) => {
    clearTransientStates();
    releaseLock();
    if (code !== 0) {
      notifyDiscord(`🔴 Scheduler stopped unexpectedly with code ${code}. Check the logs!`);
    }
  });
}

// Run health check before starting scheduler
async function runWithHealthCheck() {
  const { spawnSync } = require("child_process");
  const healthCheck = spawnSync("node", [path.join(__dirname, "scripts/health-check.js")], {
    stdio: "inherit",
    env: process.env,
  });
  if (healthCheck.status !== 0) {
    console.error("Health check failed. Scheduler will not start.");
    process.exit(1);
  }
  main();
}

runWithHealthCheck();

async function handleShutdown(type) {
  console.log(type === "SIGINT" ? "\nInterrupt signal received. Cleaning up..." : "\nShutdown signal received. Cleaning up...");
  clearTransientStates();
  releaseLock();
  await notifyDiscord(type === "SIGINT"
    ? "\ud83d\udd34 Scheduler stopped (Ctrl+C / SIGINT). All automated scrape and sync processes are terminated."
    : "\ud83d\udd34 Scheduler stopped (SIGTERM). All automated scrape and sync processes are terminated.");
  process.exit(0);
}

process.on("SIGTERM", () => {
  handleShutdown("SIGTERM");
});

process.on("SIGINT", () => {
  handleShutdown("SIGINT");
});
