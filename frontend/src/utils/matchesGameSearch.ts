import type { Game } from '../types/game';

function getSearchableText(game: Game): string {
  return [
    game.title,
    game.leagueLabel,
    game.teams?.home?.name,
    game.teams?.away?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesGameSearch(game: Game, normalizedSearchTerm: string): boolean {
  return !normalizedSearchTerm
    || getSearchableText(game).includes(normalizedSearchTerm);
}
