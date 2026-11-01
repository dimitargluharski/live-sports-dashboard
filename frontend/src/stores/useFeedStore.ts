import { create } from 'zustand';
import { SPORT_FEED_URLS } from '../constants/app';
import { getPreviewGames } from '../utils/getPreviewGames';
import { getSourceStatusAt } from '../utils/getSourceStatusAt';
import { normalizeGame } from '../utils/normalizeGame';
import { resolveGameStatus } from '../utils/resolveGameStatus';
import type { Game, GamesPayload, Sport } from '../types/game';

interface SportFeed {
  games: Game[];
  isLoading: boolean;
  error: Error | null;
}

interface FeedState {
  feeds: Record<Sport, SportFeed>;
  lastRefreshAt: number | null;
  loadSport: (sport: Sport) => Promise<void>;
  refreshStatuses: () => void;
}

const emptyFeed = (): SportFeed => ({ games: [], isLoading: true, error: null });

const toError = (value: unknown) => (value instanceof Error ? value : new Error('Unknown feed error'));

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

function withStatus(game: Game): Game {
  return { ...game, ...resolveGameStatus(game) };
}

export const useFeedStore = create<FeedState>((set) => ({
  feeds: { soccer: emptyFeed(), basketball: emptyFeed() },
  lastRefreshAt: null,

  loadSport: async (sport) => {
    const feedUrl = SPORT_FEED_URLS[sport];
    try {
      const data = await fetchJson<GamesPayload>(feedUrl);
      const sourceStatusAt = getSourceStatusAt(data);
      const sourceGames = Array.isArray(data.matches)
        ? data.matches.map((game, index) => normalizeGame(game, index, sourceStatusAt))
        : [];
      const previewDateLabel = sourceGames.find((game) => game.dateLabel)?.dateLabel;
      const previewGames = getPreviewGames().map((game) => (
        previewDateLabel ? { ...game, dateLabel: previewDateLabel } : game
      ));
      set((state) => ({
        lastRefreshAt: Date.now(),
        feeds: {
          ...state.feeds,
          [sport]: { games: [...sourceGames, ...previewGames], isLoading: false, error: null },
        },
      }));
    } catch (loadError) {
      const error = toError(loadError);
      console.error(`Failed to load ${feedUrl}:`, error);
      set((state) => ({
        feeds: { ...state.feeds, [sport]: { ...state.feeds[sport], isLoading: false, error } },
      }));
    }
  },

  refreshStatuses: () => set((state) => ({
    feeds: {
      soccer: { ...state.feeds.soccer, games: state.feeds.soccer.games.map(withStatus) },
      basketball: { ...state.feeds.basketball, games: state.feeds.basketball.games.map(withStatus) },
    },
  })),
}));
