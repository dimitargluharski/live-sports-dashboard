#!/usr/bin/env node
/**
 * Fly.io Scheduler for Feed Scraping
 * 
 * Runs periodic tasks:
 * - Top feed: every 10 minutes
 * - Days feed: every 15 minutes
 * - Main feed: every 60 minutes (optional)
 */

const cron = require("node-cron");
const { spawn } = require("child_process");
const simpleGit = require("simple-git");

// Environment setup
const GITHUB_TOKEN = (process.env.GITHUB_TOKEN || "").trim();
const GITHUB_OWNER = (process.env.GITHUB_OWNER || "dimitargluharski").trim();
const GITHUB_REPO = process.env.GITHUB_REPO || "live-sports-dashboard";
const GITHUB_BRANCH = (process.env.GITHUB_BRANCH || "main").trim();
const GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || "scheduler-bot";
const GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || "scheduler@example.com";
const DISCORD_WEBHOOK_URL = (
  process.env.SCRAPE_DISCORD_WEBHOOK_URL ||
  process.env.CRON_DISCORD_WEBHOOK_URL ||
  ""
).trim();

const git = simpleGit();

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
  try {
    const feedFiles = ["public/matches-feed-top.json", "public/matches-feed-days.json"];
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

    await git.push("origin", `HEAD:${GITHUB_BRANCH}`);
    console.log(`✓ Committed and pushed: "${message}"`);
    return { committed: true, reason: "pushed" };
  } catch (error) {
    console.error(`✗ Git operation failed:`, error.message);
    // Don't fail the scheduler on git errors
    return { committed: false, reason: "git_error", error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Task: Refresh top feed
 */
async function taskTopFeed() {
  console.log("\n[TASK] Running top feed scraper...");
  const startedAt = Date.now();

  try {
    await notifyDiscord("🟡 [Fly Scheduler] TOP: run started (every 10m).");
    await runScript("scrape:feed:top");
    const gitResult = await commitAndPush("chore(feed): refresh top matches");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 [Fly Scheduler] TOP: completed in ${durationSec}s. Changes pushed to ${GITHUB_OWNER}/${GITHUB_REPO}.`);
    } else if (gitResult.reason === "no_changes") {
      await notifyDiscord(`🟢 [Fly Scheduler] TOP: completed in ${durationSec}s. No feed changes to commit.`);
    } else {
      await notifyDiscord(`🟠 [Fly Scheduler] TOP: scrape finished in ${durationSec}s, but git push failed. ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Top feed task failed:", error.message);
    await notifyDiscord(`🔴 [Fly Scheduler] TOP: failed. ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Task: Refresh days feed
 */
async function taskDaysFeed() {
  console.log("\n[TASK] Running days feed scraper...");
  const startedAt = Date.now();

  try {
    await notifyDiscord("🟡 [Fly Scheduler] DAYS: run started (every 15m).");
    await runScript("scrape:feed:days");
    const gitResult = await commitAndPush("chore(feed): refresh day matches");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 [Fly Scheduler] DAYS: completed in ${durationSec}s. Changes pushed to ${GITHUB_OWNER}/${GITHUB_REPO}.`);
    } else if (gitResult.reason === "no_changes") {
      await notifyDiscord(`🟢 [Fly Scheduler] DAYS: completed in ${durationSec}s. No feed changes to commit.`);
    } else {
      await notifyDiscord(`🟠 [Fly Scheduler] DAYS: scrape finished in ${durationSec}s, but git push failed. ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Days feed task failed:", error.message);
    await notifyDiscord(`🔴 [Fly Scheduler] DAYS: failed. ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Task: Refresh main feed (optional, less frequent)
 */
async function taskMainFeed() {
  console.log("\n[TASK] Running main feed scraper...");
  const startedAt = Date.now();

  try {
    await notifyDiscord("🟡 [Fly Scheduler] MAIN: run started (every 60m).");
    await runScript("scrape:feed");
    const gitResult = await commitAndPush("chore(feed): refresh main feed");
    const durationSec = Math.round((Date.now() - startedAt) / 1000);

    if (gitResult.committed) {
      await notifyDiscord(`🟢 [Fly Scheduler] MAIN: completed in ${durationSec}s. Changes pushed to ${GITHUB_OWNER}/${GITHUB_REPO}.`);
    } else if (gitResult.reason === "no_changes") {
      await notifyDiscord(`🟢 [Fly Scheduler] MAIN: completed in ${durationSec}s. No feed changes to commit.`);
    } else {
      await notifyDiscord(`🟠 [Fly Scheduler] MAIN: scrape finished in ${durationSec}s, but git push failed. ${gitResult.error || "Unknown git error"}`);
    }
  } catch (error) {
    console.error("Main feed task failed:", error.message);
    await notifyDiscord(`🔴 [Fly Scheduler] MAIN: failed. ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Startup: Log configuration and validate env
 */
function startup() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║         Feed Scheduler (Fly.io) Started              ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  const feedBaseUrl = (process.env.FEED_BASE_URL || "").trim();
  if (!feedBaseUrl) {
    console.error("ERROR: FEED_BASE_URL environment variable is missing!");
    process.exit(1);
  }

  console.log("Configuration:");
  console.log(`  FEED_BASE_URL: ${feedBaseUrl}`);
  console.log(`  GITHUB_REPO: ${GITHUB_OWNER}/${GITHUB_REPO} (${GITHUB_BRANCH})`);
  console.log(`  GIT_AUTHOR: ${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>`);
  console.log(`  GitHub Token: ${GITHUB_TOKEN ? "SET" : "NOT SET (git push will fail)"}`);
  console.log("\nSchedule:");
  console.log("  Top feed: every 10 minutes");
  console.log("  Days feed: every 15 minutes");
  console.log("  Main feed: every 60 minutes\n");

  console.log("Ready. Waiting for scheduled tasks...\n");

  notifyDiscord(
    `🟢 [Fly Scheduler] Booted successfully for ${GITHUB_OWNER}/${GITHUB_REPO}. Top: 10m, Days: 15m, Main: 60m.`,
  );
}

/**
 * Initialize scheduler tasks
 */
function initializeScheduler() {
  // Top feed: every 10 minutes
  cron.schedule("*/10 * * * *", taskTopFeed, {
    name: "top-feed",
    runOnInit: false,
  });

  // Days feed: every 15 minutes
  cron.schedule("*/15 * * * *", taskDaysFeed, {
    name: "days-feed",
    runOnInit: false,
  });

  // Main feed: every 60 minutes
  cron.schedule("0 * * * *", taskMainFeed, {
    name: "main-feed",
    runOnInit: false,
  });

  console.log("Cron tasks registered successfully.");
}

/**
 * Main entry point
 */
function main() {
  startup();
  initializeScheduler();

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("\nShutdown signal received. Cleaning up...");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("\nInterrupt signal received. Cleaning up...");
    process.exit(0);
  });
}

// Start the scheduler
main();
