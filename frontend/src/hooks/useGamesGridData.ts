import { useMemo } from 'react';
import { groupGamesByDate } from '../utils/groupGamesByDate';
import { matchesGameSearch } from '../utils/matchesGameSearch';
import { prepareGamesForGrid } from '../utils/prepareGamesForGrid';
import type { Game } from '../types/game';
import type { GameGridItem } from '../utils/prepareGamesForGrid';

interface GamesGridFilters {
  liveOnly: boolean;
  withStreams: boolean;
  searchTerm: string;
}

interface GamesGridData {
  gamesForDisplay: GameGridItem[];
  filteredGamesByDate: Array<[string, Game[]]>;
  liveGamesCount: number;
  streamGamesCount: number;
}


export function useGamesGridData(
  games: Game[],
  { liveOnly, withStreams, searchTerm }: GamesGridFilters,
): GamesGridData {
  const gamesForDisplay = useMemo(() => prepareGamesForGrid(games), [games]);
  const filteredGames = useMemo(
    () => gamesForDisplay.filter((game) => (
      (!liveOnly || game.isLive)
      && (!withStreams || game.streamCount > 0)
      && matchesGameSearch(game, searchTerm)
    )),
    [gamesForDisplay, liveOnly, searchTerm, withStreams],
  );
  const { liveGamesCount, streamGamesCount } = useMemo(
    () => gamesForDisplay.reduce(
      (counts, game) => ({
        liveGamesCount: counts.liveGamesCount + Number(game.isLive),
        streamGamesCount: counts.streamGamesCount + Number(game.streamCount > 0),
      }),
      { liveGamesCount: 0, streamGamesCount: 0 },
    ),
    [gamesForDisplay],
  );
  const filteredGamesByDate = useMemo(() => groupGamesByDate(filteredGames), [filteredGames]);

  return {
    gamesForDisplay,
    filteredGamesByDate,
    liveGamesCount,
    streamGamesCount,
  };
}
