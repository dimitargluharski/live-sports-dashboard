import { SPORT_FEED_URLS } from '../constants/app';
import type { Game, GamesPayload, Sport } from '../types/game';
import { getGameWinChances } from '../utils/getGameWinChances';
import { getPreviewGames } from '../utils/getPreviewGames';
import { getSourceStatusAt } from '../utils/getSourceStatusAt';
import { normalizeGame } from '../utils/normalizeGame';

export const gamesQueryKey = (sport: Sport) => ['games', sport] as const;

export async function fetchGames(sport: Sport, signal?: AbortSignal): Promise<Game[]> {
  const feedUrl = SPORT_FEED_URLS[sport];
  const response = await fetch(feedUrl, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Failed to load ${feedUrl} (${response.status})`);

  const data = (await response.json()) as GamesPayload;
  const sourceStatusAt = getSourceStatusAt(data);
  const sourceGames = Array.isArray(data.matches)
    ? data.matches.map((game, index) => normalizeGame(game, index, sourceStatusAt))
    : [];
  const previewDateLabel = sourceGames.find((game) => game.dateLabel)?.dateLabel;
  const previewGames = getPreviewGames().map((game) => ({
    ...game,
    winChances: getGameWinChances(game.headToHead),
    ...(previewDateLabel ? { dateLabel: previewDateLabel } : {}),
  }));

  return [...sourceGames, ...previewGames];
}
