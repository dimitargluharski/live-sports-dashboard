import { useMemo } from 'react';
import { groupGamesByDate } from '../utils/groupGamesByDate';
import { getGameDateKey } from '../utils/getGameDateKey';
import { toDateKey } from '../utils/toDateKey';
import { matchesGameSearch } from '../utils/matchesGameSearch';
import { prepareGamesForGrid } from '../utils/prepareGamesForGrid';
import type { Game } from '../types/game';
import type { GameGridItem } from '../utils/prepareGamesForGrid';

interface GamesGridFilters {
  liveOnly: boolean;
  withStreams: boolean;
  todayOnly: boolean;
  searchTerm: string;
}

interface GamesGridData {
  gamesForDisplay: GameGridItem[];
  filteredGamesByDate: Array<[string, Game[]]>;
  liveGamesCount: number;
  streamGamesCount: number;
  todayGamesCount: number;
}


export function useGamesGridData(
  games: Game[],
  { liveOnly, withStreams, todayOnly, searchTerm }: GamesGridFilters,
): GamesGridData {
  const gamesForDisplay = useMemo(() => prepareGamesForGrid(games), [games]);
  const todayKey = toDateKey(new Date());
  const filteredGames = useMemo(
    () => gamesForDisplay.filter((game) => (
      (!liveOnly || game.isLive)
      && (!withStreams || game.streamCount > 0)
      && (!todayOnly || getGameDateKey(game) === todayKey)
      && matchesGameSearch(game, searchTerm)
    )),
    [gamesForDisplay, liveOnly, searchTerm, withStreams, todayOnly, todayKey],
  );
  const { liveGamesCount, streamGamesCount, todayGamesCount } = useMemo(
    () => gamesForDisplay.reduce(
      (counts, game) => ({
        liveGamesCount: counts.liveGamesCount + Number(game.isLive),
        streamGamesCount: counts.streamGamesCount + Number(game.streamCount > 0),
        todayGamesCount: counts.todayGamesCount + Number(getGameDateKey(game) === todayKey),
      }),
      { liveGamesCount: 0, streamGamesCount: 0, todayGamesCount: 0 },
    ),
    [gamesForDisplay, todayKey],
  );
  const filteredGamesByDate = useMemo(() => groupGamesByDate(filteredGames), [filteredGames]);

  return {
    gamesForDisplay,
    filteredGamesByDate,
    liveGamesCount,
    streamGamesCount,
    todayGamesCount,
  };
}
