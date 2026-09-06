import { useEffect, useMemo, useState } from 'react';
import { CompetitionGroup } from './CompetitionGroup';
import { GameFilters } from './GameFilters';
import { LIVE_FILTER_STORAGE_KEY, STREAMS_FILTER_STORAGE_KEY } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import { usePersistentState } from '../hooks/usePersistentState';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { getCountryFlagUrl } from '../utils/getCountryFlagUrl';
import { isQualificationLeague } from '../utils/isQualificationLeague';
import type { Game } from '../types/game';
import { getDateGroupKey } from '../utils/getDateGroupKey';
import { getDateGroupLabel } from '../utils/getDateGroupLabel';

interface GamesGridProps {
  games: Game[];
}

export function GamesGrid({ games }: GamesGridProps) {
  const { isDarkTheme, toggleTheme } = useTheme();
  const [filterLiveOnly, setFilterLiveOnly] = usePersistentState(LIVE_FILTER_STORAGE_KEY, false);
  const [filterWithStreams, setFilterWithStreams] = usePersistentState(STREAMS_FILTER_STORAGE_KEY, false);
  const [expandedLargeCompetitions, setExpandedLargeCompetitions] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const gamesWithResolvedFlags = useMemo(() => {
    return games.map((game) => {
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

  return (
    <section className={isDarkTheme ? "dark mx-auto min-h-screen w-full max-w-7xl bg-[#111111] px-4 pb-8 text-white md:px-6" : "mx-auto min-h-screen w-full max-w-7xl bg-[#f2f1ed] px-4 pb-8 text-slate-950 md:px-6"}>
      <header className={isDarkTheme ? "mb-4 border-b border-white/10 pb-4" : "mb-4 border-b border-black/10 pb-4"}>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className={isDarkTheme ? "inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/15 text-slate-300" : "inline-flex h-7 w-7 items-center justify-center rounded-md border border-black/15 text-slate-600"} aria-hidden="true">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
                <path strokeLinecap="round" d="M7.75 7.75a6 6 0 0 0 0 8.5M16.25 7.75a6 6 0 0 1 0 8.5M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
              </svg>
            </span>
            <h1 className={isDarkTheme ? "text-xs font-bold tracking-[0.14em] text-slate-200" : "text-xs font-bold tracking-[0.14em] text-slate-800"}>sportix.live</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="group relative flex items-center">
              <button
                type="button"
                aria-label="About stream content"
                aria-describedby="stream-disclaimer"
                className={isDarkTheme ? "inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-white/25 text-[11px] font-bold text-slate-300 transition-colors hover:border-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-400" : "inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-black/20 text-[11px] font-bold text-slate-600 transition-colors hover:border-black/50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-400"}
              >
                i
              </button>
              <span id="stream-disclaimer" role="tooltip" className={isDarkTheme ? "pointer-events-none absolute right-0 top-7 z-20 hidden w-72 rounded-md border border-white/15 bg-[#252525] p-3 text-left text-xs font-normal leading-relaxed text-slate-200 shadow-xl group-hover:block group-focus-within:block" : "pointer-events-none absolute right-0 top-7 z-20 hidden w-72 rounded-md border border-black/10 bg-white p-3 text-left text-xs font-normal leading-relaxed text-slate-600 shadow-xl group-hover:block group-focus-within:block"}>
                Stream content is provided by external sources. sportix.live does not host, store, or control the third-party streams. Availability and legality may vary by source and location.
              </span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              role="switch"
              aria-checked={isDarkTheme}
              aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              className={isDarkTheme ? "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full bg-slate-500 p-1 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-slate-400" : "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full bg-slate-300 p-1 transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-slate-400"}
            >
            <span className={isDarkTheme ? "inline-flex h-5 w-5 translate-x-5 items-center justify-center rounded-full bg-black text-white transition-transform" : "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 transition-transform"}>
              {isDarkTheme ? (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M21 12.8A8.5 8.5 0 1111.2 3 6.7 6.7 0 0021 12.8z" />
                </svg>
              )}
            </span>
            </button>
          </div>
        </div>
        <div>
          <div className="w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quick search: team, league..."
              className={isDarkTheme ? "w-full rounded-md border border-white/15 bg-[#1b1b1b] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-white/50" : "w-full rounded-md border border-black/15 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-500"}
            />
          </div>
        </div>
      </header>

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
                {dateGroupLabel && (
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
                {Object.entries(leaguesForDate).sort(([leagueA], [leagueB]) => leagueA.localeCompare(leagueB)).map(([leagueLabel, gamesForLeague]) => {
                  const competitionKey = `${dateKey}:${leagueLabel}`;
                  const hasSearchResult = debouncedSearchTerm.length > 0 && gamesForLeague.length > 0;
                  const isCompetitionExpanded = !isQualificationLeague(leagueLabel)
                    || hasSearchResult
                    || Boolean(expandedLargeCompetitions[competitionKey]);
                  return (
                    <CompetitionGroup
                      key={leagueLabel}
                      leagueLabel={leagueLabel}
                      games={gamesForLeague}
                      isDarkTheme={isDarkTheme}
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
