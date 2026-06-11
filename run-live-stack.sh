#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WITH_CHAT=0

if [[ "${1:-}" == "--with-chat" ]]; then
  WITH_CHAT=1
fi

cleanup() {
  if [[ -n "${HYDRATE_PID:-}" ]] && kill -0 "$HYDRATE_PID" >/dev/null 2>&1; then
    kill "$HYDRATE_PID" >/dev/null 2>&1 || true
  fi

  if [[ -n "${CHAT_PID:-}" ]] && kill -0 "$CHAT_PID" >/dev/null 2>&1; then
    kill "$CHAT_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

cd "$ROOT_DIR"

./hydrate-feed.sh --watch --interval 900 &
HYDRATE_PID=$!

if [[ "$WITH_CHAT" -eq 1 ]]; then
  pnpm --dir backend run chat:server &
  CHAT_PID=$!
fi

pnpm --dir frontend dev
