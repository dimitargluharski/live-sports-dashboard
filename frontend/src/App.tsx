import { useEffect, useState } from "react";
import { GamesGrid } from "./components/GamesGrid";
import type { Game } from "./components/GamesGrid";

type GamesPayload = {
  matches?: Array<Partial<Game>>;
};

function formatLocalMatchTime(dateLabel?: string, timeLabel?: string) {
  if (!dateLabel || !timeLabel) return timeLabel || undefined;

  const sourceDate = new Date(`${dateLabel} ${new Date().getFullYear()} ${timeLabel} UTC`);
  sourceDate.setUTCHours(sourceDate.getUTCHours() - 1);
  if (Number.isNaN(sourceDate.getTime())) return timeLabel;

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(sourceDate);
}

function App() {
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetch("/allSoccerGamesToday.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to load games JSON (${res.status})`);
        return res.json();
      })
      .then((data: GamesPayload) => {
        if (!isMounted) return;
        const normalizedGames: Game[] = Array.isArray(data?.matches)
          ? data.matches.map((game, index) => ({
              id: Number.isFinite(game.id) ? Number(game.id) : index + 1,
              title: game.title || "Unknown match",
              dateLabel: game.dateLabel || undefined,
              timeLabel: formatLocalMatchTime(game.dateLabel, game.timeLabel),
              leagueLabel: game.leagueLabel || undefined,
              streamCount: Number.isFinite(game.streamCount)
                ? Number(game.streamCount)
                : Array.isArray(game.streams)
                  ? game.streams.length
                  : 0,
              isLive: Boolean(game.isLive),
              streams: Array.isArray(game.streams) ? game.streams : [],
              headToHead: game.headToHead || null,
              teams: game.teams,
            }))
          : [];

        setGames(normalizedGames);
      })
      .catch((error) => {
        console.error("Failed to load allSoccerGamesToday.json:", error);
        if (!isMounted) return;
        setGames([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen py-8 text-slate-950">
      <GamesGrid games={games} />
    </div>
  );
}

export default App;
