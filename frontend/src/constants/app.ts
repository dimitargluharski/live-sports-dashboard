import type { Sport } from '../types/game';

export const SOURCE_TIME_OFFSET_HOURS = -1;
export const ASSUMED_MATCH_DURATION_MS = 2 * 60 * 60 * 1000;
export const MAX_SOURCE_STATUS_AGE_MS = 10 * 60 * 1000;
export const FEED_REFRESH_INTERVAL_MS = 30_000;
export const STATUS_REFRESH_INTERVAL_MS = 30_000;
export const LARGE_COMPETITION_FILTER_SIZE = 10;

export const THEME_STORAGE_KEY = 'sportix-theme';
export const LIVE_FILTER_STORAGE_KEY = 'sportix-filter-live';
export const STREAMS_FILTER_STORAGE_KEY = 'sportix-filter-streams';
export const TODAY_FILTER_STORAGE_KEY = 'sportix-filter-today';
export const SPORT_STORAGE_KEY = 'sportix-sport';

export const TEAM_LOGO_BASE_URL = (import.meta.env.VITE_TEAM_LOGO_BASE_URL as string | undefined) ?? '';

export const SPORTS: Sport[] = ['soccer', 'basketball', 'hockey', 'tennis', 'volleyball', 'handball'];

export const SPORT_LABELS: Record<Sport, string> = {
  soccer: 'Soccer',
  basketball: 'Basketball',
  hockey: 'Ice Hockey',
  tennis: 'Tennis',
  volleyball: 'Volleyball',
  handball: 'Handball',
};

// Hockey, tennis, volleyball and handball have no schedule scraper yet, so their pages use the live-score feed.
export const SPORT_FEED_URLS: Record<Sport, string> = {
  soccer: '/soccer/matches.json',
  basketball: '/basketball/allBasketballGamesToday.json',
  hockey: '/hockey/liveMatches.json',
  tennis: '/tennis/liveMatches.json',
  volleyball: '/volleyball/liveMatches.json',
  handball: '/handball/liveMatches.json',
};

// The Results page needs scores, which basketball only has in its live-score feed.
export const RESULTS_FEED_URLS: Record<Sport, string> = {
  ...SPORT_FEED_URLS,
  basketball: '/basketball/liveMatches.json',
};
