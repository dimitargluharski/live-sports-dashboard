import type { Game } from '../types/game';
import { extractCountryFromLeague } from './extractCountryFromLeague';
import { getCountryFlagUrl } from './getCountryFlagUrl';
import { isSimulcastGame } from './isSimulcastGame';

export interface GameGridItem extends Game {
  flagUrl: string | null;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
}

export function prepareGamesForGrid(games: Game[]): GameGridItem[] {
  return games
    .filter((game) => !isSimulcastGame(game))
    .map((game) => ({
      ...game,
      homeLogoUrl: game.teams?.home?.logoUrl || null,
      awayLogoUrl: game.teams?.away?.logoUrl || null,
      flagUrl: getCountryFlagUrl(extractCountryFromLeague(game.leagueLabel)),
    }));
}
