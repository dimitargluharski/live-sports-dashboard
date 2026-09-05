import React, { useEffect, useMemo, useState } from 'react';
import { GameCard } from './GameCard';

interface TeamForm {
  matches?: Array<{
    date: string;
    competition: string;
    opponent: string;
    score: string;
    result: 'W' | 'D' | 'L';
  }>;
  summary?: { W: number; D: number; L: number };
}

export interface Game {
  id: number;
  title: string;
  dateLabel?: string;
  timeLabel?: string;
  scheduledStartAt?: number;
  sourceIsLive?: boolean;
  sourceStatusAt?: number;
  isEnded?: boolean;
  leagueLabel?: string;
  streamCount: number;
  isLive: boolean;
  streams?: Array<{
    id: number;
    label: string;
    url: string;
    language?: string | null;
    bitrate?: string | null;
    healthStatus?: 'healthy' | 'failed' | 'unknown';
    healthCheckedAt?: string;
    healthHttpStatus?: number;
    healthError?: string;
  }>;
  headToHead?: {
    homeTeam?: string;
    awayTeam?: string;
    matches?: Array<{
      date: string;
      competition: string;
      homeTeam: string;
      awayTeam: string;
      score: string;
      result: 'W' | 'D' | 'L';
      winner: 'home' | 'away' | 'draw';
    }>;
    form?: {
      home?: TeamForm;
      away?: TeamForm;
    } | null;
  } | null;
  teams?: {
    home?: {
      name?: string | null;
      logoUrl?: string | null;
    };
    away?: {
      name?: string | null;
      logoUrl?: string | null;
    };
  };
}

interface GamesGridProps {
  games: Game[];
}

const COUNTRY_CODES: Record<string, string> = {
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Brazil: 'br',
  Bulgaria: 'bg',
  Canada: 'ca',
  Chile: 'cl',
  China: 'cn',
  Colombia: 'co',
  Croatia: 'hr',
  Cyprus: 'cy',
  Czechia: 'cz',
  Denmark: 'dk',
  Ecuador: 'ec',
  Egypt: 'eg',
  England: 'gb-eng',
  Estonia: 'ee',
  Finland: 'fi',
  France: 'fr',
  Georgia: 'ge',
  Germany: 'de',
  Greece: 'gr',
  Hungary: 'hu',
  Iceland: 'is',
  India: 'in',
  Indonesia: 'id',
  Ireland: 'ie',
  Israel: 'il',
  Italy: 'it',
  Japan: 'jp',
  Kazakhstan: 'kz',
  Latvia: 'lv',
  Lithuania: 'lt',
  Luxembourg: 'lu',
  Malaysia: 'my',
  Mexico: 'mx',
  Moldova: 'md',
  Montenegro: 'me',
  Netherlands: 'nl',
  'New Zealand': 'nz',
  Nigeria: 'ng',
  Norway: 'no',
  Paraguay: 'py',
  Peru: 'pe',
  Poland: 'pl',
  Portugal: 'pt',
  Romania: 'ro',
  Russia: 'ru',
  Scotland: 'gb-sct',
  Serbia: 'rs',
  Singapore: 'sg',
  Slovakia: 'sk',
  Slovenia: 'si',
  'South Africa': 'za',
  'South Korea': 'kr',
  Spain: 'es',
  Sweden: 'se',
  Switzerland: 'ch',
  Thailand: 'th',
  Tunisia: 'tn',
  Turkey: 'tr',
  Ukraine: 'ua',
  Uruguay: 'uy',
  USA: 'us',
  Uzbekistan: 'uz',
  Wales: 'gb-wls',
  World: 'un',
};

const THEME_STORAGE_KEY = 'sportix-theme';
const LIVE_FILTER_STORAGE_KEY = 'sportix-filter-live';
const STREAMS_FILTER_STORAGE_KEY = 'sportix-filter-streams';
function extractCountryFromLeague(leagueLabel?: string): string | null {
  if (!leagueLabel) return null;
  const firstToken = leagueLabel.split('.')[0]?.trim();
  if (!firstToken) return null;
  return firstToken;
}

function isQualificationLeague(leagueLabel: string): boolean {
  return /\bqualifications?\b/i.test(leagueLabel);
}

function getCountryFlagUrl(country: string | null): string | null {
  const code = country ? COUNTRY_CODES[country] : null;
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}

function getDateGroupKey(dateLabel?: string): string {
  if (!dateLabel) return 'date-tba';

  const date = new Date(`${dateLabel} ${new Date().getFullYear()}`);
  if (Number.isNaN(date.getTime())) return 'date-tba';
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

function getDateGroupLabel(dateKey: string): string {
  if (dateKey === 'date-tba') return 'Date TBA';

  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const formatDayKey = (value: Date) => [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');

  if (dateKey === formatDayKey(today)) return '';
  if (dateKey === formatDayKey(tomorrow)) return 'Tomorrow';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export const GamesGrid: React.FC<GamesGridProps> = ({ games }) => {
  const [filterLiveOnly, setFilterLiveOnly] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem(LIVE_FILTER_STORAGE_KEY) === 'true'
  ));
  const [filterWithStreams, setFilterWithStreams] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem(STREAMS_FILTER_STORAGE_KEY) === 'true'
  ));
  const [isDarkTheme, setIsDarkTheme] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark'
  ));
  const [expandedLargeCompetitions, setExpandedLargeCompetitions] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const pageBackground = isDarkTheme ? '#111111' : '#f2f1ed';
    document.documentElement.style.backgroundColor = pageBackground;
    document.body.style.backgroundColor = pageBackground;
    document.body.style.color = isDarkTheme ? '#ffffff' : '#020617';

    return () => {
      document.documentElement.style.backgroundColor = '';
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, [isDarkTheme]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, isDarkTheme ? 'dark' : 'light');
    window.localStorage.setItem(LIVE_FILTER_STORAGE_KEY, String(filterLiveOnly));
    window.localStorage.setItem(STREAMS_FILTER_STORAGE_KEY, String(filterWithStreams));
  }, [isDarkTheme, filterLiveOnly, filterWithStreams]);

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

  const liveGamesCount = gamesWithResolvedFlags.filter((game) => game.isLive).length;
  const streamGamesCount = gamesWithResolvedFlags.filter((game) => game.streamCount > 0).length;

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
              onClick={() => setIsDarkTheme((dark) => !dark)}
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

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterLiveOnly(!filterLiveOnly)}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterLiveOnly
              ? 'border-rose-500 bg-rose-500 text-white hover:bg-rose-600'
              : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M12 8v4l2.5 1.5" /></svg>
            Live Now ({liveGamesCount})
          </span>
        </button>
        <button
          onClick={() => setFilterWithStreams(!filterWithStreams)}
          className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterWithStreams
              ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
              : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" /></svg>
            Has Streams ({streamGamesCount})
          </span>
        </button>
      </div>

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
                  const country = extractCountryFromLeague(leagueLabel);
                  const isQualificationSection = isQualificationLeague(leagueLabel);
                  const competitionKey = `${dateKey}:${leagueLabel}`;
                  const isCompetitionExpanded = !isQualificationSection || Boolean(expandedLargeCompetitions[competitionKey]);
                  return (
                    <div key={leagueLabel} className={`mb-5 ${isQualificationSection ? isDarkTheme ? 'overflow-hidden rounded-xl border border-amber-300/20 bg-amber-200/[0.025]' : 'overflow-hidden rounded-xl border border-amber-600/25 bg-amber-50/35' : ''}`}>
                      <button
                        type="button"
                        onClick={() => isQualificationSection && setExpandedLargeCompetitions((current) => ({ ...current, [competitionKey]: !isCompetitionExpanded }))}
                        aria-expanded={isQualificationSection ? isCompetitionExpanded : undefined}
                        className={`flex w-full items-center gap-3 text-left ${isQualificationSection ? isDarkTheme ? 'cursor-pointer border-b border-l-4 border-white/10 border-l-amber-300 bg-amber-200/[0.06] px-3 py-3 hover:bg-amber-200/[0.1]' : 'cursor-pointer border-b border-l-4 border-black/10 border-l-amber-600 bg-amber-100/60 px-3 py-3 hover:bg-amber-100/90' : 'mb-2 px-1'}`}
                      >
                        {isQualificationSection && (
                          <span className={isDarkTheme ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200' : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800'} aria-hidden="true">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-5h4v5M10 19v-9h4v9M14 19v-3h4v3" />
                            </svg>
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <h3 className={isDarkTheme ? "truncate text-sm font-black text-white" : "truncate text-sm font-black text-slate-950"}>{leagueLabel.split('.')[1]?.trim() || leagueLabel}</h3>
                          </div>
                          {country && <p className={isDarkTheme ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{country}</p>}
                        </div>
                        {isQualificationSection && <span className={isDarkTheme ? "shrink-0 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200" : "shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900"}>{gamesForLeague.length} matches</span>}
                        {isQualificationSection && <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isCompetitionExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>}
                      </button>
                      {isCompetitionExpanded && <div className={`grid grid-cols-1 gap-2 ${isQualificationSection ? 'p-3' : ''}`}>
                        {gamesForLeague.map((game) => (
                          <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />
                        ))}
                      </div>}
                    </div>
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
};
