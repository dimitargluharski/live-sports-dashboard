import { useMemo, useState } from 'react';
import { CompetitionGroup } from './CompetitionGroup';
import { GameFilters } from './GameFilters';
import { TournamentStories } from './TournamentStories';
import { useDebouncedSearchTerm } from '../stores/useSearchStore';
import { LIVE_FILTER_STORAGE_KEY, STREAMS_FILTER_STORAGE_KEY } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import { usePersistentState } from '../hooks/usePersistentState';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { getCountryFlagUrl } from '../utils/getCountryFlagUrl';
import { groupGamesByTournamentLabel } from '../utils/groupGamesByTournamentLabel';
import { isQualificationLeague } from '../utils/isQualificationLeague';
import type { Game } from '../types/game';
import { getDateGroupKey } from '../utils/getDateGroupKey';
import { getDateGroupLabel } from '../utils/getDateGroupLabel';
import { isSimulcastGame } from '../utils/isSimulcastGame';
import { toDateKey } from '../utils/toDateKey';

interface GamesGridProps {
  games: Game[];
}

export function GamesGrid({ games }: GamesGridProps) {
  const { isDarkTheme } = useTheme();
  const [filterLiveOnly, setFilterLiveOnly] = usePersistentState(LIVE_FILTER_STORAGE_KEY, false);
  const [filterWithStreams, setFilterWithStreams] = usePersistentState(STREAMS_FILTER_STORAGE_KEY, false);
  const [expandedLargeCompetitions, setExpandedLargeCompetitions] = useState<Record<string, boolean>>({});
  const debouncedSearchTerm = useDebouncedSearchTerm();

  const gamesWithResolvedFlags = useMemo(() => {
    return games.filter((game) => !isSimulcastGame(game)).map((game) => {
      const country = extractCountryFromLeague(game.leagueLabel);
      const homeLogoUrl = game.teams?.home?.logoUrl || null;
      const awayLogoUrl = game.teams?.away?.logoUrl || null;
      const fallbackFlagUrl = getCountryFlagUrl(country);

      return {
        ...game,
        countryOrLeagueLabel: game.leagueLabel || country || 'League TBD',
        homeLogoUrl,
        awayLogoUrl,
        flagUrl: fallbackFlagUrl,
      };
    });
  }, [games]);

  const filteredGames = useMemo(() => {
    return gamesWithResolvedFlags.filter((game) => {
      if (filterLiveOnly && !game.isLive) return false;
      if (filterWithStreams && game.streamCount === 0) return false;

      if (debouncedSearchTerm) {
        const searchableText = [game.title, game.leagueLabel, game.teams?.home?.name, game.teams?.away?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(debouncedSearchTerm)) return false;
      }

      return true;
    });
  }, [gamesWithResolvedFlags, filterLiveOnly, filterWithStreams, debouncedSearchTerm]);

  const { liveGamesCount, streamGamesCount } = useMemo(() => (
    gamesWithResolvedFlags.reduce(
      (counts, game) => ({
        liveGamesCount: counts.liveGamesCount + Number(game.isLive),
        streamGamesCount: counts.streamGamesCount + Number(game.streamCount > 0),
      }),
      { liveGamesCount: 0, streamGamesCount: 0 },
    )
  ), [gamesWithResolvedFlags]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Game[]> = {};
    filteredGames.forEach((game) => {
      const dateKey = getDateGroupKey(game.dateLabel);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(game);
    });

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === 'date-tba') return 1;
      if (dateB === 'date-tba') return -1;
      return dateA.localeCompare(dateB);
    });
  }, [filteredGames]);

  const firstDateKey = groupedByDate[0]?.[0];

  return (
    <section className={isDarkTheme ? "dark mx-auto min-h-screen w-full max-w-7xl bg-[#111111] px-4 pb-8 pt-4 text-white md:px-6" : "mx-auto min-h-screen w-full max-w-7xl bg-[#f2f1ed] px-4 pb-8 pt-4 text-slate-950 md:px-6"}>
      <TournamentStories games={gamesWithResolvedFlags} isDarkTheme={isDarkTheme} />

      <GameFilters
        isDarkTheme={isDarkTheme}
        filterLiveOnly={filterLiveOnly}
        filterWithStreams={filterWithStreams}
        liveGamesCount={liveGamesCount}
        streamGamesCount={streamGamesCount}
        onToggleLive={() => setFilterLiveOnly((current) => !current)}
        onToggleStreams={() => setFilterWithStreams((current) => !current)}
      />

      {filteredGames.length > 0 ? (
        <div>
          {groupedByDate.map(([dateKey, gamesForDate]) => {
            const leaguesForDate: Record<string, Game[]> = {};
            const isTodayDateKey = dateKey === toDateKey(new Date());
            const dateGroupLabel = getDateGroupLabel(dateKey);
            const dateGroupDate = dateKey === 'date-tba'
              ? ''
              : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(`${dateKey}T00:00:00`));
            gamesForDate.forEach((game) => {
              const leagueLabel = game.leagueLabel || 'League TBD';
              if (!leaguesForDate[leagueLabel]) leaguesForDate[leagueLabel] = [];
              leaguesForDate[leagueLabel].push(game);
            });

            return (
              <div key={dateKey} className="mb-7">
                {dateGroupLabel && dateKey !== firstDateKey && (
                  dateGroupLabel === 'Tomorrow' ? (
                    <div className="mb-4 flex items-center gap-4 py-3">
                      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-black/15 to-black/15 dark:via-white/15 dark:to-white/15" aria-hidden="true" />
                      <div className="flex shrink-0 items-baseline gap-2">
                        <h2 className={isDarkTheme ? "text-sm font-black uppercase tracking-[0.08em] text-white" : "text-sm font-black uppercase tracking-[0.08em] text-slate-950"}>Tomorrow</h2>
                        <span className={isDarkTheme ? "text-xs font-semibold text-slate-400" : "text-xs font-semibold text-slate-500"}>{dateGroupDate}</span>
                        <span className={isDarkTheme ? "text-[11px] font-medium text-slate-500" : "text-[11px] font-medium text-slate-400"}>
                          ({gamesForDate.length} {gamesForDate.length === 1 ? 'match' : 'matches'})
                        </span>
                      </div>
                      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-black/15 to-black/15 dark:via-white/15 dark:to-white/15" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center gap-3 border-b border-black/10 pb-2 dark:border-white/10">
                      <h2 className={isDarkTheme ? "text-base font-black text-white" : "text-base font-black text-slate-950"}>{dateGroupLabel}</h2>
                      <span className={isDarkTheme ? "text-xs font-semibold text-slate-500" : "text-xs font-semibold text-slate-400"}>
                        {gamesForDate.length} {gamesForDate.length === 1 ? 'match' : 'matches'}
                      </span>
                    </div>
                  )
                )}
                {Object.entries(leaguesForDate).sort(([leagueA, gamesA], [leagueB, gamesB]) => {
                  const isChampionsLeagueA = leagueA.trim().toLowerCase() === 'champions league';
                  const isChampionsLeagueB = leagueB.trim().toLowerCase() === 'champions league';
                  const hasTournamentStagesA = isTodayDateKey && groupGamesByTournamentLabel(gamesA).some((segment) => segment.label);
                  const hasTournamentStagesB = isTodayDateKey && groupGamesByTournamentLabel(gamesB).some((segment) => segment.label);
                  const priorityA = isChampionsLeagueA ? 0 : hasTournamentStagesA ? 1 : 2;
                  const priorityB = isChampionsLeagueB ? 0 : hasTournamentStagesB ? 1 : 2;

                  if (priorityA !== priorityB) return priorityA - priorityB;

                  return leagueA.localeCompare(leagueB);
                }).map(([leagueLabel, gamesForLeague]) => {
                  const competitionKey = `${dateKey}:${leagueLabel}`;
                  const hasSearchResult = debouncedSearchTerm.length > 0 && gamesForLeague.length > 0;
                  const isChampionsLeague = leagueLabel.trim().toLowerCase() === 'champions league';
                  const isQualification = isQualificationLeague(leagueLabel);
                  const isCompetitionExpanded = hasSearchResult
                    || (isChampionsLeague
                      ? true
                      : isQualification
                        ? Boolean(expandedLargeCompetitions[competitionKey])
                        : true);
                  return (
                    <CompetitionGroup
                      key={leagueLabel}
                      leagueLabel={leagueLabel}
                      games={gamesForLeague}
                      isDarkTheme={isDarkTheme}
                      isToday={isTodayDateKey}
                      isExpanded={isCompetitionExpanded}
                      onToggle={() => setExpandedLargeCompetitions((current) => ({ ...current, [competitionKey]: !isCompetitionExpanded }))}
                    />
                  );
                })}
              </div>
            );
          })}
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
