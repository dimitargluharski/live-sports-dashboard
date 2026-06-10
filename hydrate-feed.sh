#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_PUBLIC_DIR="$ROOT_DIR/frontend/public"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
FRONTEND_JSON_REL="frontend/public/allSoccerGamesToday.json"

RAW_JSON="$BACKEND_DIR/.cache/allSoccerGamesToday.raw.json"
ENRICHED_JSON="$BACKEND_DIR/public/allSoccerGamesToday.json"
FRONTEND_JSON="$FRONTEND_PUBLIC_DIR/allSoccerGamesToday.json"

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
    echo "ERROR: Missing re quired backend env file: $BACKEND_ENV_FILE"
    echo "Create $BACKEND_ENV_FILE and set FEED_BASE_URL, FEED_HOME_PATH, FEED_EVENT_PATH_SEGMENT."
    exit 1
  fi
}

ensure_backend_env

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

  git -C "$ROOT_DIR" add "$FRONTEND_JSON_REL"

  if git -C "$ROOT_DIR" diff --cached --quiet -- "$FRONTEND_JSON_REL"; then
    echo "Git sync: no staged diff for $FRONTEND_JSON_REL"
    return 0
  fi

  local commit_msg="chore(feed): refresh allSoccerGamesToday.json ($(date -u '+%Y-%m-%d %H:%M UTC'))"
  git -C "$ROOT_DIR" commit -m "$commit_msg"
  git -C "$ROOT_DIR" push "$GIT_REMOTE" "$GIT_BRANCH"
  echo "Git sync complete: pushed $FRONTEND_JSON_REL to $GIT_REMOTE/$GIT_BRANCH"
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

  printf "\n[1/3] Running unified scraper (streams + logos + lineups + sanitize)...\n"
  (
    cd "$BACKEND_DIR"
    pnpm run scrape:soccer-today
  )

  if [[ ! -f "$ENRICHED_JSON" ]]; then
    echo "ERROR: Expected enriched JSON not found: $ENRICHED_JSON"
    exit 1
  fi

  printf "\n[2/3] Checking for meaningful JSON changes...\n"
  if json_changed_meaningfully "$FRONTEND_JSON" "$ENRICHED_JSON"; then
    cp "$ENRICHED_JSON" "$FRONTEND_JSON"
    echo "Updated frontend JSON: $FRONTEND_JSON"
    did_update=1
  else
    echo "No meaningful data changes. Frontend JSON unchanged."
  fi

  if ! git_sync_json "$did_update"; then
    echo "ERROR: Git sync failed."
    return 1
  fi

  printf "\n[3/3] Done.\n"
}

if [[ "$WATCH_MODE" -eq 1 ]]; then
  echo "Watch mode is ON. Running every $INTERVAL_SECONDS seconds."
  while true; do
    echo "----------------------------------------"
    echo "Cycle started: $(date '+%Y-%m-%d %H:%M:%S')"
    run_once
    echo "Next cycle in $INTERVAL_SECONDS seconds..."
    sleep "$INTERVAL_SECONDS"
  done
else
  run_once
fi
