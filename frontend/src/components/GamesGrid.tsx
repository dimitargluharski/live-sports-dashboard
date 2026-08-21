import React, { useEffect, useMemo, useState } from 'react';
import { GameCard } from './GameCard';

export interface Game {
  id: number;
  title: string;
  dateLabel?: string;
  timeLabel?: string;
  leagueLabel?: string;
  streamCount: number;
  isLive: boolean;
  streams?: Array<{
    id: number;
    label: string;
    url: string;
    language?: string | null;
    bitrate?: string | null;
  }>;
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

const COUNTRY_NAME_OVERRIDES: Record<string, string> = {
  'Czech Republic': 'Czechia',
  England: 'United Kingdom',
};

function extractCountryFromLeague(leagueLabel?: string): string | null {
  if (!leagueLabel) return null;
  const firstToken = leagueLabel.split('.')[0]?.trim();
  if (!firstToken) return null;
  return firstToken;
}

export const GamesGrid: React.FC<GamesGridProps> = ({ games }) => {
  const [filterLiveOnly, setFilterLiveOnly] = useState(false);
  const [filterWithStreams, setFilterWithStreams] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [flagByCountry, setFlagByCountry] = useState<Record<string, string>>({});
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
    const uniqueCountries = Array.from(
      new Set(
        games
          .map((game) => extractCountryFromLeague(game.leagueLabel))
          .filter((value): value is string => Boolean(value)),
      ),
    ).filter((country) => !flagByCountry[country]);

    if (uniqueCountries.length === 0) return;

    let isCancelled = false;

    async function loadFlags() {
      const results = await Promise.all(
        uniqueCountries.map(async (country) => {
          const query = COUNTRY_NAME_OVERRIDES[country] || country;
          try {
            const res = await fetch(
              `https://restcountries.com/v3.1/name/${encodeURIComponent(query)}?fields=name,flags`,
            );
            if (!res.ok) return [country, null] as const;

            const data = (await res.json()) as Array<{
              name?: { common?: string };
              flags?: { svg?: string; png?: string };
            }>;

            const exact = data.find((item) => {
              const common = item.name?.common?.toLowerCase() || '';
              return common === country.toLowerCase() || common === query.toLowerCase();
            });
            const picked = exact || data[0];
            const flagUrl = picked?.flags?.svg || picked?.flags?.png || null;
            return [country, flagUrl] as const;
          } catch {
            return [country, null] as const;
          }
        }),
      );

      if (isCancelled) return;

      setFlagByCountry((prev) => {
        const next = { ...prev };
        for (const [country, flagUrl] of results) {
          if (flagUrl) next[country] = flagUrl;
        }
        return next;
      });
    }

    loadFlags();

    return () => {
      isCancelled = true;
    };
  }, [games, flagByCountry]);

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
      const fallbackFlagUrl = country ? flagByCountry[country] || null : null;

      return {
        ...game,
        countryOrLeagueLabel: game.leagueLabel || country || 'League TBD',
        homeLogoUrl,
        awayLogoUrl,
        flagUrl: fallbackFlagUrl,
      };
    });
  }, [games, flagByCountry]);

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

  const groupedByLeague = useMemo(() => {
    const groups: Record<string, typeof filteredGames> = {};
    filteredGames.forEach((game) => {
      const leagueKey = game.leagueLabel || 'League TBD';
      if (!groups[leagueKey]) {
        groups[leagueKey] = [];
      }
      groups[leagueKey].push(game);
    });
    return Object.entries(groups).sort(([leagueA], [leagueB]) => leagueA.localeCompare(leagueB));
  }, [filteredGames]);

  return (
    <section className={isDarkTheme ? "dark mx-auto min-h-screen w-full max-w-7xl bg-[#111111] px-4 pb-8 text-white md:px-6" : "mx-auto min-h-screen w-full max-w-7xl bg-[#f2f1ed] px-4 pb-8 text-slate-950 md:px-6"}>
      <div className={isDarkTheme ? "mb-5 border-b border-white/10 bg-[#111111] p-4" : "mb-5 border-b border-black/10 bg-[#f2f1ed] p-4"}>
        <div className="mb-3">
          <div className="flex w-full items-center gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quick search: team, league..."
              className={isDarkTheme ? "min-w-0 flex-1 border border-white/15 bg-[#1b1b1b] px-4 py-3 text-base text-white outline-none transition-all placeholder:text-slate-500 focus:border-white/50" : "min-w-0 flex-1 border border-black/15 bg-white px-4 py-3 text-base text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-500"}
            />
            <button
              type="button"
              onClick={() => setIsDarkTheme((dark) => !dark)}
              role="switch"
              aria-checked={isDarkTheme}
              aria-label={isDarkTheme ? "Switch to light theme" : "Switch to dark theme"}
              className={isDarkTheme ? "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-white p-1" : "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full bg-slate-300 p-1"}
            >
              <span className={isDarkTheme ? "inline-flex h-6 w-6 translate-x-6 items-center justify-center rounded-full bg-black text-white transition-transform" : "inline-flex h-6 w-6 translate-x-0 items-center justify-center rounded-full bg-white text-slate-700 transition-transform"}>
                {isDarkTheme ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
        <p className={isDarkTheme ? "text-sm font-semibold text-slate-300" : "text-sm font-semibold text-slate-700"}>
          Showing {filteredGames.length} of {gamesWithResolvedFlags.length} matches
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterLiveOnly(!filterLiveOnly)}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterLiveOnly
              ? 'border-rose-500 bg-rose-500 text-white'
              : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Live Now
        </button>
        <button
          onClick={() => setFilterWithStreams(!filterWithStreams)}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterWithStreams
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Has Streams
        </button>
        {(filterLiveOnly || filterWithStreams) && (
          <button
            onClick={() => {
              setFilterLiveOnly(false);
              setFilterWithStreams(false);
            }}
            className={isDarkTheme ? "rounded-lg border border-white/15 bg-[#1b1b1b] px-3 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-[#252525]" : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"}
          >
            Reset
          </button>
        )}
      </div>

      {filteredGames.length > 0 ? (
        <div>
          {groupedByLeague.map(([leagueLabel, gamesForLeague]) => {
            const country = extractCountryFromLeague(leagueLabel);
            return (
            <div key={leagueLabel} className="mb-5">
              <div className="mb-2 flex items-center gap-3 px-1">
                <div className="min-w-0 flex-1">
                  <h2 className={isDarkTheme ? "truncate text-sm font-black text-white" : "truncate text-sm font-black text-slate-950"}>{leagueLabel.split('.')[1]?.trim() || leagueLabel}</h2>
                  {country && <p className={isDarkTheme ? "text-xs text-slate-400" : "text-xs text-slate-500"}>{country}</p>}
                </div>
              </div>
              <div className="mb-6 grid grid-cols-1 gap-2">
                {gamesForLeague.map((game) => (
                  <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />
                ))}
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-16 text-center">
          <p className="text-lg font-medium text-slate-500">
            No games match your filters
          </p>
        </div>
      )}
    </section>
  );
};
