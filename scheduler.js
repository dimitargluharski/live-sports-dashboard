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
const GIT_AUTHOR_NAME = process.env.GIT_AUTHOR_NAME || "scheduler-bot";
const GIT_AUTHOR_EMAIL = process.env.GIT_AUTHOR_EMAIL || "scheduler@example.com";

const git = simpleGit();

/**
 * Execute npm script and return promise
 */
function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const process = spawn("npm", ["run", scriptName], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
    });

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`✓ Script '${scriptName}' completed successfully`);
        resolve(true);
      } else {
        console.error(`✗ Script '${scriptName}' failed with code ${code}`);
        reject(new Error(`Script ${scriptName} failed`));
      }
    });

    process.on("error", (err) => {
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
    // Check if there are changes
    const status = await git.status();
    const hasChanges = status.files.length > 0;

    if (!hasChanges) {
      console.log("No feed changes to commit.");
      return;
    }

    // Stage only feed files
    await git.add("public/matches-feed-top.json");
    await git.add("public/matches-feed-days.json");

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

    await git.push();
    console.log(`✓ Committed and pushed: "${message}"`);
  } catch (error) {
    console.error(`✗ Git operation failed:`, error.message);
    // Don't fail the scheduler on git errors
  }
}

/**
 * Task: Refresh top feed
 */
async function taskTopFeed() {
  console.log("\n[TASK] Running top feed scraper...");
  try {
    await runScript("scrape:feed:top");
    await commitAndPush("chore(feed): refresh top matches");
  } catch (error) {
    console.error("Top feed task failed:", error.message);
  }
}

/**
 * Task: Refresh days feed
 */
async function taskDaysFeed() {
  console.log("\n[TASK] Running days feed scraper...");
  try {
    await runScript("scrape:feed:days");
    await commitAndPush("chore(feed): refresh day matches");
  } catch (error) {
    console.error("Days feed task failed:", error.message);
  }
}

/**
 * Task: Refresh main feed (optional, less frequent)
 */
async function taskMainFeed() {
  console.log("\n[TASK] Running main feed scraper...");
  try {
    await runScript("scrape:feed");
    await commitAndPush("chore(feed): refresh main feed");
  } catch (error) {
    console.error("Main feed task failed:", error.message);
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
  console.log(`  GITHUB_REPO: ${GITHUB_OWNER}/${GITHUB_REPO}`);
  console.log(`  GIT_AUTHOR: ${GIT_AUTHOR_NAME} <${GIT_AUTHOR_EMAIL}>`);
  console.log(`  GitHub Token: ${GITHUB_TOKEN ? "SET" : "NOT SET (git push will fail)"}`);
  console.log("\nSchedule:");
  console.log("  Top feed: every 10 minutes");
  console.log("  Days feed: every 15 minutes");
  console.log("  Main feed: every 60 minutes\n");

  console.log("Ready. Waiting for scheduled tasks...\n");
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
