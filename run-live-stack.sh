#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  if [[ -n "${HYDRATE_PID:-}" ]] && kill -0 "$HYDRATE_PID" >/dev/null 2>&1; then
    kill "$HYDRATE_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

./hydrate-feed.sh --watch --interval 900 &
HYDRATE_PID=$!

pnpm --dir frontend dev
