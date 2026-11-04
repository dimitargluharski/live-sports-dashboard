import { getDateGroupKey } from './getDateGroupKey';
import { toDateKey } from './toDateKey';
import type { Game } from '../types/game';

// Local calendar day of kickoff, so late games land on the day the viewer actually sees them.
export function getGameDateKey(game: Pick<Game, 'scheduledStartAt' | 'dateLabel'>): string {
  if (game.scheduledStartAt) return toDateKey(new Date(game.scheduledStartAt));
  return getDateGroupKey(game.dateLabel);
}
