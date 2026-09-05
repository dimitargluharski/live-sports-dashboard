import { useEffect, useState } from "react";
import { GamesGrid } from "./components/GamesGrid";
import type { Game } from "./components/GamesGrid";

type GamesPayload = {
  matches?: Array<Partial<Game>>;
};

const SOURCE_TIME_OFFSET_HOURS = -1;
const ASSUMED_MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
const MAX_SOURCE_STATUS_AGE_MS = 10 * 60 * 1000;
const FEED_REFRESH_INTERVAL_MS = 30_000;

function parseScheduledStart(dateLabel?: string, timeLabel?: string) {
  if (!dateLabel || !timeLabel) return null;

  const sourceDate = new Date(`${dateLabel} ${new Date().getFullYear()} ${timeLabel} UTC`);
  sourceDate.setUTCHours(sourceDate.getUTCHours() + SOURCE_TIME_OFFSET_HOURS);
  return Number.isNaN(sourceDate.getTime()) ? null : sourceDate;
}

function formatLocalMatchTime(dateLabel?: string, timeLabel?: string) {
  if (!dateLabel || !timeLabel) return timeLabel || undefined;

  const sourceDate = parseScheduledStart(dateLabel, timeLabel);
  if (!sourceDate) return timeLabel;

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(sourceDate);
}

function isStartedBySchedule(scheduledStartAt?: number, now = Date.now()) {
  if (!scheduledStartAt) return false;
  return now >= scheduledStartAt && now <= scheduledStartAt + ASSUMED_MATCH_DURATION_MS;
}

function isEndedBySchedule(scheduledStartAt?: number, now = Date.now()) {
  if (!scheduledStartAt) return false;
  return now > scheduledStartAt + ASSUMED_MATCH_DURATION_MS;
}

function isFreshSourceLive(sourceIsLive?: boolean, sourceStatusAt?: number, now = Date.now()) {
  return Boolean(sourceIsLive && sourceStatusAt && now - sourceStatusAt <= MAX_SOURCE_STATUS_AGE_MS);
}

function isGameEnded(
  scheduledStartAt?: number,
  sourceIsLive?: boolean,
  sourceStatusAt?: number,
  now = Date.now(),
) {
  if (isFreshSourceLive(sourceIsLive, sourceStatusAt, now)) return false;
  return isEndedBySchedule(scheduledStartAt, now);
}

function App() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadGames = () => fetch("/allSoccerGamesToday.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load games JSON (${res.status})`);
        return res.json();
      })
      .then((data: GamesPayload) => {
        if (!isMounted) return;
        const sourceStatusAt = Date.parse((data as GamesPayload & { scrapedAt?: string }).scrapedAt || "");
        const normalizedGames: Game[] = Array.isArray(data?.matches)
          ? data.matches.map((game, index) => ({
              id: Number.isFinite(game.id) ? Number(game.id) : index + 1,
              title: game.title || "Unknown match",
              dateLabel: game.dateLabel || undefined,
              timeLabel: formatLocalMatchTime(game.dateLabel, game.timeLabel),
              scheduledStartAt: parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime(),
              leagueLabel: game.leagueLabel || undefined,
              streamCount: Number.isFinite(game.streamCount)
                ? Number(game.streamCount)
                : Array.isArray(game.streams)
                  ? game.streams.length
                  : 0,
              sourceIsLive: Boolean(game.isLive),
              sourceStatusAt: Number.isFinite(sourceStatusAt) ? sourceStatusAt : undefined,
              isEnded: isGameEnded(
                parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime(),
                Boolean(game.isLive),
                Number.isFinite(sourceStatusAt) ? sourceStatusAt : undefined,
              ),
              isLive: !isGameEnded(
                parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime(),
                Boolean(game.isLive),
                Number.isFinite(sourceStatusAt) ? sourceStatusAt : undefined,
              ) && (isFreshSourceLive(
                Boolean(game.isLive),
                Number.isFinite(sourceStatusAt) ? sourceStatusAt : undefined,
              ) || isStartedBySchedule(parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime())),
              streams: Array.isArray(game.streams) ? game.streams : [],
              headToHead: game.headToHead || null,
              teams: game.teams,
            }))
          : [];

        const searchParams = new URLSearchParams(window.location.search);
        const isTestMode = searchParams.has("tests");
        const previewGames: Game[] = isTestMode
          ? [{
              id: -1,
              title: "Preview United – Finished City",
              dateLabel: "1 September",
              timeLabel: "00:00",
              scheduledStartAt: parseScheduledStart("1 September", "00:00")?.getTime(),
              leagueLabel: "Demo. Ended match preview",
              streamCount: 0,
              isLive: false,
              isEnded: true,
              streams: [],
              teams: {
                home: { name: "Preview United" },
                away: { name: "Finished City" },
              },
            }]
          : [];

        setGames([...normalizedGames, ...previewGames]);

      })
      .catch((error) => {
        console.error("Failed to load allSoccerGamesToday.json:", error);
      });

    loadGames();
    const feedTimer = window.setInterval(loadGames, FEED_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(feedTimer);
    };
  }, []);

  useEffect(() => {
    const updateLiveStatuses = () => {
      setGames((currentGames) => currentGames.map((game) => ({
        ...game,
        isEnded: isGameEnded(game.scheduledStartAt, game.sourceIsLive, game.sourceStatusAt),
        isLive: !isGameEnded(game.scheduledStartAt, game.sourceIsLive, game.sourceStatusAt)
          && (isFreshSourceLive(game.sourceIsLive, game.sourceStatusAt)
            || isStartedBySchedule(game.scheduledStartAt)),
      })));
    };

    const statusTimer = window.setInterval(updateLiveStatuses, 30_000);
    return () => window.clearInterval(statusTimer);
  }, []);

  return (
    <div className="min-h-screen py-8 text-slate-950">
      <GamesGrid games={games} />
    </div>
  );
}

export default App;
