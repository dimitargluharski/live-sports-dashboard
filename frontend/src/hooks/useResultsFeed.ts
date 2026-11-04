import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { FEED_REFRESH_INTERVAL_MS, RESULTS_FEED_URLS, SPORTS, STATUS_REFRESH_INTERVAL_MS } from '../constants/app';
import { fetchGames, resultsQueryKey } from '../services/fetchGames';
import type { Game } from '../types/game';
import { resolveGameStatus } from '../utils/resolveGameStatus';

interface UseResultsFeedResult {
  games: Game[];
  isLoading: boolean;
  lastUpdatedAt: number | null;
}

// Loads every sport's feed so the Results page can list finished games across sports.
// A sport whose feed is missing or broken is skipped instead of failing the whole page.
export function useResultsFeed(enabled: boolean): UseResultsFeedResult {
  const queries = useQueries({
    queries: SPORTS.map((sport) => ({
      queryKey: resultsQueryKey(sport),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchGames(sport, signal, RESULTS_FEED_URLS[sport]),
      refetchInterval: FEED_REFRESH_INTERVAL_MS,
      retry: false,
      enabled,
    })),
  });

  const [statusTick, setStatusTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStatusTick((tick) => tick + 1), STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const dataSignature = queries.map((query) => query.dataUpdatedAt).join('|');
  const games = useMemo(
    () => queries.flatMap((query, index) => (query.data ?? []).map((game) => ({ ...game, sport: SPORTS[index], ...resolveGameStatus(game) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dataSignature tracks query data; statusTick recomputes clock-based status
    [dataSignature, statusTick],
  );

  return {
    games,
    isLoading: enabled && queries.some((query) => query.isPending),
    lastUpdatedAt: Math.max(0, ...queries.map((query) => query.dataUpdatedAt)) || null,
  };
}
