import type { Game } from '../types/game';

export function isSimulcastGame(game: Partial<Game>): boolean {
  return [game.title, game.leagueLabel]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes('simulcast'));
}