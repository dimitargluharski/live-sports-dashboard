# Live Sports Dashboard

## Quick Start

1. Install dependencies:
   - `cd backend && pnpm install`
   - `cd ../frontend && pnpm install`
   - `cd ..`

2. Configure backend env file:
  - Create `backend/.env`
  - Set at least:
    - `FEED_BASE_URL=https://your-source-domain.example`
    - `FEED_HOME_PATH=/enx/allupcomingsports/1/`
    - `FEED_EVENT_PATH_SEGMENT=/eventinfo/`

3. Next runs:
   - `./hydrate-feed.sh`

## One-command scripts (from project root)

- Run hydrate once:
  - `pnpm run hydrate`

- Run hydrate once + auto commit/push changed JSON:
  - `pnpm run hydrate:git`

- Run hydrate watcher every 15 min:
  - `pnpm run hydrate:watch`

- Run hydrate watcher every 15 min + auto commit/push:
  - `pnpm run hydrate:watch:git`

- Run hydrate watcher every 1 min (debug):
  - `pnpm run hydrate:watch:1m`

- Run hydrate watcher + frontend dev together:
  - `pnpm run stack:dev`

- Start frontend dev server:
  - `pnpm run frontend:dev`

- Build frontend:
  - `pnpm run frontend:build`

- Check backend scraper syntax:
  - `pnpm run backend:check`

## Notes

- `hydrate-feed.sh` updates `frontend/public/allSoccerGamesToday.json` only when there is a meaningful JSON change.
- Generated backend cache and local env are ignored in git.
