import type { Game } from '../types/game';
import { getDateGroupKey } from './getDateGroupKey';

export type DateGroup = [dateKey: string, games: Game[]];

export function groupGamesByDate(games: Game[]): DateGroup[] {
  const gamesByDate = new Map<string, Game[]>();

  for (const game of games) {
    const dateKey = getDateGroupKey(game.dateLabel);
    const dateGames = gamesByDate.get(dateKey);

    if (dateGames) {
      dateGames.push(game);
    } else {
      gamesByDate.set(dateKey, [game]);
    }
  }

  return [...gamesByDate.entries()].sort(([dateA], [dateB]) => {
    if (dateA === dateB) return 0;
    if (dateA === 'date-tba') return 1;
    if (dateB === 'date-tba') return -1;
    return dateA.localeCompare(dateB);
  });
}
