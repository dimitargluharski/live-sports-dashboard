import { useEffect } from 'react';
import { FEED_REFRESH_INTERVAL_MS, STATUS_REFRESH_INTERVAL_MS } from '../constants/app';
import { useFeedStore } from '../stores/useFeedStore';
import type { Game, Sport } from '../types/game';

interface UseGamesFeedResult {
  games: Game[];
  isLoading: boolean;
  error: Error | null;
}

export function useGamesFeed(sport: Sport): UseGamesFeedResult {
  const { games, isLoading, error } = useFeedStore((state) => state.feeds[sport]);
  const loadSport = useFeedStore((state) => state.loadSport);
  const refreshStatuses = useFeedStore((state) => state.refreshStatuses);

  useEffect(() => {
    void loadSport(sport);
    const feedTimer = window.setInterval(() => void loadSport(sport), FEED_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(feedTimer);
  }, [sport, loadSport]);

  useEffect(() => {
    const statusTimer = window.setInterval(refreshStatuses, STATUS_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(statusTimer);
  }, [refreshStatuses]);

  return { games, isLoading, error };
}
