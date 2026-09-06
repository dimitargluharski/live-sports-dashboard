import { useEffect, useState } from 'react';
import { FEED_REFRESH_INTERVAL_MS, STATUS_REFRESH_INTERVAL_MS } from '../constants/app';
import { isFreshSourceLive } from '../utils/isFreshSourceLive';
import { isGameEnded } from '../utils/isGameEnded';
import { isStartedBySchedule } from '../utils/isStartedBySchedule';
import { getPreviewGames } from '../utils/getPreviewGames';
import { getSourceStatusAt } from '../utils/getSourceStatusAt';
import { normalizeGame } from '../utils/normalizeGame';
import type { Game, GamesPayload } from '../types/game';

interface UseGamesFeedResult {
  games: Game[];
  isLoading: boolean;
  error: Error | null;
}

export function useGamesFeed(): UseGamesFeedResult {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadGames = async () => {
      try {
        const response = await fetch('/allSoccerGamesToday.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load games JSON (${response.status})`);

        const data = await response.json() as GamesPayload;
        const sourceStatusAt = getSourceStatusAt(data);
        const normalizedGames = Array.isArray(data.matches)
          ? data.matches.map((game, index) => normalizeGame(
            game,
            index,
            sourceStatusAt,
          ))
          : [];

        if (!isMounted) return;
        setGames([...normalizedGames, ...getPreviewGames()]);
        setError(null);
      } catch (loadError) {
        if (!isMounted) return;
        const nextError = loadError instanceof Error ? loadError : new Error('Unknown feed error');
        setError(nextError);
        console.error('Failed to load allSoccerGamesToday.json:', nextError);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadGames();
    const feedTimer = window.setInterval(loadGames, FEED_REFRESH_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(feedTimer);
    };
  }, []);

  useEffect(() => {
    const statusTimer = window.setInterval(() => {
      setGames((currentGames) => currentGames.map((game) => {
        const isEnded = isGameEnded(game.scheduledStartAt, game.sourceIsLive, game.sourceStatusAt);
        return {
          ...game,
          isEnded,
          isLive: !isEnded && (isFreshSourceLive(game.sourceIsLive, game.sourceStatusAt)
            || isStartedBySchedule(game.scheduledStartAt)),
        };
      }));
    }, STATUS_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(statusTimer);
  }, []);

  return { games, isLoading, error };
}
