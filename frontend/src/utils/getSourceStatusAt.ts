import type { GamesPayload } from '../types/game';

export function getSourceStatusAt(payload: GamesPayload): number | undefined {
  const timestamp = Date.parse(payload.scrapedAt || '');
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
