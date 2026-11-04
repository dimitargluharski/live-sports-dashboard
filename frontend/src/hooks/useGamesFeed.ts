import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FEED_REFRESH_INTERVAL_MS, STATUS_REFRESH_INTERVAL_MS } from '../constants/app';
import { fetchGames, gamesQueryKey } from '../services/fetchGames';
import type { Game, Sport } from '../types/game';
import { resolveGameStatus } from '../utils/resolveGameStatus';

interface UseGamesFeedResult {
  games: Game[];
  isLoading: boolean;
  error: Error | null;
  lastUpdatedAt: number | null;
}

export function useGamesFeed(sport: Sport, enabled = true): UseGamesFeedResult {
  const { data, isPending, error, dataUpdatedAt } = useQuery({
    queryKey: gamesQueryKey(sport),
    queryFn: ({ signal }) => fetchGames(sport, signal),
    refetchInterval: FEED_REFRESH_INTERVAL_MS,
    enabled,
  });

  // Live/ended flags depend on the clock, so they are re-derived between feed refreshes.
  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStatusTick((tick) => tick + 1), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const games = useMemo(
    () => (data ?? []).map((game) => ({ ...game, sport, ...resolveGameStatus(game) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- statusTick forces the clock-based status to be recomputed
    [data, statusTick, sport],
  );

  return { games, isLoading: enabled && isPending, error, lastUpdatedAt: dataUpdatedAt || null };
}
