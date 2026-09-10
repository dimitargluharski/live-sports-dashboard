import type { Game } from '../types/game';
import { splitGameTitle } from './splitGameTitle';

// Some scraped rows are a tournament/stage label (e.g. "Europe Cup"), not an actual two-team match.
export function isTournamentLabelGame(game: Pick<Game, 'title' | 'teams'>): boolean {
  const [, awayFromTitle] = splitGameTitle(game.title);
  const hasExplicitTeams = Boolean(game.teams?.home?.name?.trim() && game.teams?.away?.name?.trim());
  return !awayFromTitle && !hasExplicitTeams;
}
