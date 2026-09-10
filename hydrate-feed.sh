#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_PUBLIC_DIR="$ROOT_DIR/frontend/public"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_JSON_REL="frontend/public/soccer/allSoccerGamesToday.json"
FRONTEND_JSON_BASKETBALL_REL="frontend/public/basketball/allBasketballGamesToday.json"
LOCK_DIR="$BACKEND_DIR/.cache/hydrate.lock"
LOCK_PID_FILE="$LOCK_DIR/pid"

RAW_JSON="$BACKEND_DIR/.cache/allSoccerGamesToday.raw.json"
ENRICHED_JSON="$BACKEND_DIR/public/soccer/allSoccerGamesToday.json"
FRONTEND_JSON="$FRONTEND_PUBLIC_DIR/soccer/allSoccerGamesToday.json"
ENRICHED_JSON_BASKETBALL="$BACKEND_DIR/public/basketball/allBasketballGamesToday.json"
FRONTEND_JSON_BASKETBALL="$FRONTEND_PUBLIC_DIR/basketball/allBasketballGamesToday.json"

WATCH_MODE=0
INTERVAL_SECONDS=900
GIT_SYNC=0
GIT_REMOTE="origin"
GIT_BRANCH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --watch)
      WATCH_MODE=1
      shift
      ;;
    --git-sync)
      GIT_SYNC=1
      shift
      ;;
    --git-remote)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --git-remote requires a value (example: --git-remote origin)"
        exit 1
      fi
      GIT_REMOTE="$2"
      shift 2
      ;;
    --git-branch)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --git-branch requires a value (example: --git-branch main)"
        exit 1
      fi
      GIT_BRANCH="$2"
      shift 2
      ;;
    --interval)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --interval requires seconds (example: --interval 900)"
        exit 1
      fi
      INTERVAL_SECONDS="$2"
      shift 2
      ;;
    *)
      echo "ERROR: Unknown argument: $1"
      echo "Usage: ./hydrate-feed.sh [--watch] [--interval 900] [--git-sync] [--git-remote origin] [--git-branch main]"
      exit 1
      ;;
  esac
done

if ! [[ "$INTERVAL_SECONDS" =~ ^[0-9]+$ ]] || [[ "$INTERVAL_SECONDS" -lt 1 ]]; then
  echo "ERROR: --interval must be a positive integer (seconds)."
  exit 1
fi

ensure_backend_env() {
  if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
    echo "ERROR: Missing required backend env file: $BACKEND_ENV_FILE"
    echo "Create $BACKEND_ENV_FILE and set FEED_BASE_URL, FEED_HOME_PATH, FEED_EVENT_PATH_SEGMENT."
    exit 1
  fi
}

ensure_backend_env

acquire_lock() {
  mkdir -p "$(dirname "$LOCK_DIR")"

  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_PID_FILE"
    return 0
  fi

  local existing_pid=""
  if [[ -f "$LOCK_PID_FILE" ]]; then
    existing_pid="$(tr -dc '0-9' < "$LOCK_PID_FILE")"
  fi

  if [[ -n "$existing_pid" ]] && kill -0 "$existing_pid" >/dev/null 2>&1; then
    echo "ERROR: Another hydrate process is already running (pid: $existing_pid)."
    echo "Stop it or wait for it to finish, then retry."
    exit 1
  fi

  # Legacy lock dirs may not have a pid file; detect active hydrators before recovering.
  local other_pids=""
  if command -v pgrep >/dev/null 2>&1; then
    other_pids="$(pgrep -f "hydrate-feed.sh" 2>/dev/null | awk -v me="$$" '$1 != me {print $1}' | tr '\n' ' ' || true)"
  else
    other_pids="$(ps 2>/dev/null | awk -v me="$$" 'index($0, "hydrate-feed.sh") && $1 != me {print $1}' | tr '\n' ' ' || true)"
  fi
  if [[ -n "${other_pids// /}" ]]; then
    echo "ERROR: Another hydrate process appears to be running (pid(s): $other_pids)."
    echo "Stop it or wait for it to finish, then retry."
    exit 1
  fi

  echo "WARNING: Found stale hydrate lock. Recovering..."
  rm -rf "$LOCK_DIR"

  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "ERROR: Unable to acquire hydrate lock at $LOCK_DIR"
    exit 1
  fi

  echo "$$" > "$LOCK_PID_FILE"
}

cleanup_lock() {
  rm -rf "$LOCK_DIR" >/dev/null 2>&1 || true
}

acquire_lock
trap cleanup_lock EXIT

resolve_git_branch() {
  if [[ -n "$GIT_BRANCH" ]]; then
    return
  fi

  if git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    GIT_BRANCH="$(git -C "$ROOT_DIR" branch --show-current)"
  fi

  if [[ -z "$GIT_BRANCH" ]]; then
    GIT_BRANCH="main"
  fi
}

git_sync_json() {
  local did_update="$1"
  if [[ "$GIT_SYNC" -ne 1 ]]; then
    return 0
  fi

  if [[ "$did_update" -ne 1 ]]; then
    echo "Git sync enabled, but no JSON changes to commit."
    return 0
  fi

  if ! git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "ERROR: --git-sync requested but project is not a git repository."
    return 1
  fi

  resolve_git_branch

  git -C "$ROOT_DIR" add "$FRONTEND_JSON_REL" "$FRONTEND_JSON_BASKETBALL_REL"

  if git -C "$ROOT_DIR" diff --cached --quiet -- "$FRONTEND_JSON_REL" "$FRONTEND_JSON_BASKETBALL_REL"; then
    echo "Git sync: no staged diff for $FRONTEND_JSON_REL or $FRONTEND_JSON_BASKETBALL_REL"
    return 0
  fi

  local commit_msg="chore(feed): refresh soccer & basketball feeds ($(date -u '+%Y-%m-%d %H:%M UTC'))"
  git -C "$ROOT_DIR" commit -m "$commit_msg"
  if ! git -C "$ROOT_DIR" push "$GIT_REMOTE" "$GIT_BRANCH"; then
    echo "ERROR: Git sync failed while pushing $GIT_BRANCH to $GIT_REMOTE."
    return 1
  fi
  echo "Git sync complete: pushed $FRONTEND_JSON_REL and $FRONTEND_JSON_BASKETBALL_REL to $GIT_REMOTE/$GIT_BRANCH"
}

json_changed_meaningfully() {
  local old_file="$1"
  local new_file="$2"

  if [[ ! -f "$old_file" ]]; then
    return 0
  fi

  node - "$old_file" "$new_file" <<'NODE'
const fs = require("fs");

const oldPath = process.argv[2];
const newPath = process.argv[3];

const VOLATILE_KEYS = new Set([
  "scrapedAt",
  "enrichedAt",
  "sourceFile",
  "healthCheckedAt",
]);

function normalize(value) {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (value && typeof value === "object") {
    const output = {};
    const keys = Object.keys(value)
      .filter((key) => !VOLATILE_KEYS.has(key))
      .sort();

    for (const key of keys) {
      output[key] = normalize(value[key]);
    }

    return output;
  }

  return value;
}

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

const oldJson = safeReadJson(oldPath);
const newJson = safeReadJson(newPath);

if (!oldJson || !newJson) {
  process.exit(1);
}

const left = JSON.stringify(normalize(oldJson));
const right = JSON.stringify(normalize(newJson));

process.exit(left === right ? 0 : 1);
NODE

  if [[ $? -eq 0 ]]; then
    return 1
  fi

  return 0
}

run_once() {
  local did_update=0

  printf "\n[1/7] Running soccer scraper (streams + logos + lineups + sanitize)...\n"
  if ! (
    cd "$BACKEND_DIR"
    node scripts/scrape-soccer-games-today.js
  ); then
    echo "WARNING: Soccer scraper failed this cycle. Skipping soccer update."
  fi

  if [[ ! -f "$ENRICHED_JSON" ]]; then
    echo "WARNING: Expected enriched JSON not found: $ENRICHED_JSON. Skipping soccer steps this cycle."
  else
    printf "\n[2/7] Checking soccer stream links...\n"
    if ! (
      cd "$BACKEND_DIR"
      node scripts/stream-health-check.js
    ); then
      echo "WARNING: Soccer stream health check failed this cycle."
    fi
  fi

  printf "\n[3/7] Running basketball scraper...\n"
  if ! (
    cd "$BACKEND_DIR"
    node scripts/scrape-basketball-games-today.js
  ); then
    echo "WARNING: Basketball scraper failed this cycle. Skipping basketball update."
  fi

  if [[ -f "$ENRICHED_JSON_BASKETBALL" ]]; then
    printf "\n[4/7] Checking basketball stream links...\n"
    if ! (
      cd "$BACKEND_DIR"
      FEED_ENRICHED_OUTPUT="public/basketball/allBasketballGamesToday.json" node scripts/stream-health-check.js
    ); then
      echo "WARNING: Basketball stream health check failed this cycle."
    fi
  else
    echo "WARNING: Expected basketball JSON not found: $ENRICHED_JSON_BASKETBALL. Skipping basketball stream check."
  fi

  printf "\n[5/7] Checking for meaningful JSON changes...\n"
  if [[ -f "$ENRICHED_JSON" ]] && json_changed_meaningfully "$FRONTEND_JSON" "$ENRICHED_JSON"; then
    mkdir -p "$(dirname "$FRONTEND_JSON")"
    cp "$ENRICHED_JSON" "$FRONTEND_JSON.$$.tmp"
    mv -f "$FRONTEND_JSON.$$.tmp" "$FRONTEND_JSON"
    echo "Updated frontend JSON: $FRONTEND_JSON"
    did_update=1
  else
    echo "No meaningful soccer data changes. Frontend JSON unchanged."
  fi

  if [[ -f "$ENRICHED_JSON_BASKETBALL" ]] && json_changed_meaningfully "$FRONTEND_JSON_BASKETBALL" "$ENRICHED_JSON_BASKETBALL"; then
    mkdir -p "$(dirname "$FRONTEND_JSON_BASKETBALL")"
    cp "$ENRICHED_JSON_BASKETBALL" "$FRONTEND_JSON_BASKETBALL.$$.tmp"
    mv -f "$FRONTEND_JSON_BASKETBALL.$$.tmp" "$FRONTEND_JSON_BASKETBALL"
    echo "Updated frontend JSON: $FRONTEND_JSON_BASKETBALL"
    did_update=1
  else
    echo "No meaningful basketball data changes. Frontend JSON unchanged."
  fi

  printf "\n[6/7] Running post-hydration health monitor (soccer)...\n"
  if ! (
    cd "$BACKEND_DIR"
    node scripts/health-check-monitor.js
  ); then
    echo "WARNING: Health monitor reported a problem. Feed update completed; inspect backend/public/health-monitor-status.json."
  fi

  if ! git_sync_json "$did_update"; then
    echo "ERROR: Git sync failed."
    return 1
  fi

  printf "\n[7/7] Done.\n"
}

if [[ "$WATCH_MODE" -eq 1 ]]; then
  echo "Watch mode is ON. Running every $INTERVAL_SECONDS seconds."
  while true; do
    echo "----------------------------------------"
    echo "Cycle started: $(date '+%Y-%m-%d %H:%M:%S')"
    if ! run_once; then
      echo "WARNING: Cycle failed. Will retry next interval."
    fi
    echo "Next cycle in $INTERVAL_SECONDS seconds..."
    sleep "$INTERVAL_SECONDS"
  done
else
  run_once
fi
