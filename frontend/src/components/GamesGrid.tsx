import { useState } from 'react';
import { GameFilters } from './GameFilters';
import { GameDateGroup } from './GameDateGroup';
import { FeaturedMatches } from './FeaturedMatches';
import { TournamentStories } from './TournamentStories';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import { useGamesGridData } from '../hooks/useGamesGridData';
import { LIVE_FILTER_STORAGE_KEY, STREAMS_FILTER_STORAGE_KEY, TODAY_FILTER_STORAGE_KEY } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import { usePersistentState } from '../hooks/usePersistentState';
import type { Game } from '../types/game';

interface GamesGridProps {
  games: Game[];
}

export function GamesGrid({ games }: GamesGridProps) {
  const { isDarkTheme } = useTheme();
  const [filterLiveOnly, setFilterLiveOnly] = usePersistentState(LIVE_FILTER_STORAGE_KEY, false);
  const [filterWithStreams, setFilterWithStreams] = usePersistentState(STREAMS_FILTER_STORAGE_KEY, false);
  const [filterTodayOnly, setFilterTodayOnly] = usePersistentState(TODAY_FILTER_STORAGE_KEY, false);
  const [expandedLargeCompetitions, setExpandedLargeCompetitions] = useState<Record<string, boolean>>({});
  const searchTerm = useDebouncedSearchTerm();

  const {
    gamesForDisplay,
    filteredGamesByDate,
    liveGamesCount,
    streamGamesCount,
    todayGamesCount,
  } = useGamesGridData(games, {
    liveOnly: filterLiveOnly,
    withStreams: filterWithStreams,
    todayOnly: filterTodayOnly,
    searchTerm,
  });
  const firstDateKey = filteredGamesByDate[0]?.[0];
  const hasActiveFilters = filterLiveOnly || filterWithStreams || filterTodayOnly;
  const clearFilters = () => {
    setFilterLiveOnly(false);
    setFilterWithStreams(false);
    setFilterTodayOnly(false);
  };

  const toggleCompetition = (competitionKey: string, isExpanded: boolean) => {
    setExpandedLargeCompetitions((current) => ({
      ...current,
      [competitionKey]: !isExpanded,
    }));
  };

  return (
    <section className={isDarkTheme
      ? 'dark mx-auto min-h-screen w-full max-w-7xl bg-[#111111] px-4 pb-8 pt-4 text-white md:px-6'
      : 'mx-auto min-h-screen w-full max-w-7xl bg-[#f2f1ed] px-4 pb-8 pt-4 text-slate-950 md:px-6'}
    >
      <TournamentStories
        games={gamesForDisplay}
        isDarkTheme={isDarkTheme}
        leading={(
          <GameFilters
            isDarkTheme={isDarkTheme}
            filterLiveOnly={filterLiveOnly}
            filterWithStreams={filterWithStreams}
            filterTodayOnly={filterTodayOnly}
            liveGamesCount={liveGamesCount}
            streamGamesCount={streamGamesCount}
            todayGamesCount={todayGamesCount}
            onToggleLive={() => setFilterLiveOnly((current) => !current)}
            onToggleStreams={() => setFilterWithStreams((current) => !current)}
            onToggleToday={() => setFilterTodayOnly((current) => !current)}
          />
        )}
      />

      <FeaturedMatches games={filteredGamesByDate.flatMap(([, gamesForDate]) => gamesForDate)} isDarkTheme={isDarkTheme} />

      {filteredGamesByDate.length > 0 ? (
        <div>
          {filteredGamesByDate.map(([dateKey, gamesForDate]) => (
            <GameDateGroup
              key={dateKey}
              dateKey={dateKey}
              games={gamesForDate}
              firstDateKey={firstDateKey}
              searchTerm={searchTerm}
              isDarkTheme={isDarkTheme}
              expandedCompetitions={expandedLargeCompetitions}
              onToggleCompetition={toggleCompetition}
            />
          ))}
        </div>
      ) : (
        <div className={`rounded-2xl py-16 text-center ${isDarkTheme ? 'bg-white/5' : 'bg-white/70'}`}>
          <p className={`text-lg font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
            No games match your filters
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {searchTerm ? `Nothing found for "${searchTerm}".` : 'Try a different filter or check back later.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-4 cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold outline-offset-2 focus-visible:outline-2 focus-visible:outline-sky-500 ${isDarkTheme ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
