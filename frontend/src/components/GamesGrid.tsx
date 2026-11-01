import { useState } from 'react';
import { GameFilters } from './GameFilters';
import { GameDateGroup } from './GameDateGroup';
import { TournamentStories } from './TournamentStories';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import { useGamesGridData } from '../hooks/useGamesGridData';
import { LIVE_FILTER_STORAGE_KEY, STREAMS_FILTER_STORAGE_KEY } from '../constants/app';
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
  const [expandedLargeCompetitions, setExpandedLargeCompetitions] = useState<Record<string, boolean>>({});
  const searchTerm = useDebouncedSearchTerm();

  const {
    gamesForDisplay,
    filteredGamesByDate,
    liveGamesCount,
    streamGamesCount,
  } = useGamesGridData(games, {
    liveOnly: filterLiveOnly,
    withStreams: filterWithStreams,
    searchTerm,
  });
  const firstDateKey = filteredGamesByDate[0]?.[0];

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
            liveGamesCount={liveGamesCount}
            streamGamesCount={streamGamesCount}
            onToggleLive={() => setFilterLiveOnly((current) => !current)}
            onToggleStreams={() => setFilterWithStreams((current) => !current)}
          />
        )}
      />

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
        <div className="rounded-2xl bg-white/70 py-16 text-center">
          <p className="text-lg font-medium text-slate-500">
            No games match your filters
          </p>
        </div>
      )}
    </section>
  );
}
