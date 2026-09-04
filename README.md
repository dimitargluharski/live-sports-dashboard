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

3. Start the development stack:
   - `bash ./run-live-stack.sh`

4. Configure Discord bot alerts:
  - Add the Discord application references and bot credentials to `backend/.env`:
    - `DISCORD_APPLICATION_ID=<application-id>`
    - `DISCORD_PUBLIC_KEY=<public-key>`
    - `DISCORD_BOT_TOKEN=<bot-token>`
    - `DISCORD_CHANNEL_ID=<channel-id>`
  - The bot must be invited to the server with the `bot` scope and have `View Channel` and `Send Messages` permissions.
  - The scraper posts start, successful completion, and failure alerts. `DISCORD_WEBHOOK_URL` remains supported as a fallback.

5. Check feed health without scraping:
  - Run `pnpm run health` from the project root.
  - It checks that the configured website responds and that an expected event link is present.
  - It writes the result to `backend/public/health-status.json` and exits with code `1` when unhealthy.
  - Health checks automatically send their result through a separate Discord bot using `DISCORD_HEALTHCHECK_BOT_TOKEN=<health-bot-token>` and `DISCORD_HEALTHCHECK_CHANNEL_ID=<health-channel-id>` from `backend/.env`.
  - The health bot must be invited with `View Channel`, `Send Messages`, and `Embed Links` permissions. `DISCORD_HEALTHCHECK_WEBHOOK_URL` is supported as an alternative.
  - Run `pnpm run health:monitor` to check the live website, the last scraper result, JSON freshness, and that the frontend JSON matches the backend JSON.
  - The monitor writes to `backend/public/health-monitor-status.json`; set `HEALTHCHECK_MAX_JSON_AGE_MINUTES` to change the default 30-minute freshness limit.
  - The scraper feed window defaults to two days through `FEED_DAYS_WINDOW=2`; matches outside that window are removed from the next generated JSON update.

## Commands (from project root)

- Start frontend and one 15-minute scraper watcher:
  - `pnpm run dev`

- Run hydrate once:
  - `pnpm run hydrate`

- Run hydrate once + auto commit/push changed JSON:
  - `pnpm run hydrate:git`

- Run hydrate watcher every 15 min:
  - `pnpm run hydrate:watch`

- Run hydrate watcher every 10 min:
  - `pnpm run hydrate:watch:10`

- Run hydrate watcher every 15 min explicitly:
  - `pnpm run hydrate:watch:15`

- Run hydrate watcher every 15 min + auto commit/push:
  - `pnpm run hydrate:watch:git`

- Start frontend dev server:
  - `pnpm run frontend:dev`

- Build frontend:
  - `pnpm run frontend:build`

- Check backend scraper syntax:
  - `pnpm run backend:check`

## Notes

- `hydrate-feed.sh` updates `frontend/public/allSoccerGamesToday.json` only when there is a meaningful JSON change.
- The project stores the feed as JSON rather than a database. Each scrape rebuilds the feed for the configured two-day window, so matches older than two days disappear from the next update.
- Each hydration cycle runs `backend/scripts/health-check-monitor.js` after the frontend JSON update and before optional Git sync.
- Run only one `hydrate` or `dev` process at a time; the hydration script rejects duplicate watchers.
- The scraper writes the raw, logo, and enriched JSON outputs. `scrape-team-logos.js` is retained as an older standalone utility and is not part of the normal flow.
- Generated backend cache and local env are ignored in git.

