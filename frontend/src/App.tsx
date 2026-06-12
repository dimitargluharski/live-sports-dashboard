import { useEffect, useState } from "react";
import { addHours } from "date-fns";
import { GamesGrid } from "./components/GamesGrid";
import type { Game } from "./components/GamesGrid";

type GamesPayload = {
  matches?: Array<Partial<Game>>;
};

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
              timeLabel: game.timeLabel
                ? addHours(new Date(game.timeLabel), 2)
                : undefined,
              leagueLabel: game.leagueLabel || undefined,
              streamCount: Number.isFinite(game.streamCount)
                ? Number(game.streamCount)
                : Array.isArray(game.streams)
                  ? game.streams.length
                  : 0,
              isLive: Boolean(game.isLive),
              streams: Array.isArray(game.streams) ? game.streams : [],
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fafc_45%,_#f1f5f9_100%)] py-8">
      <GamesGrid games={games} />
    </div>
  );
}

export default App;
