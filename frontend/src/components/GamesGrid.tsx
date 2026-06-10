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

type ViewMode = 'grid' | 'list';

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [flagByCountry, setFlagByCountry] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filteredGames> = {};
    filteredGames.forEach((game) => {
      const dateKey = game.dateLabel || 'Unknown Date';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(game);
    });
    return Object.entries(groups).sort((a, b) => {
      const dateA = new Date(a[0]);
      const dateB = new Date(b[0]);
      return dateA.getTime() - dateB.getTime();
    });
  }, [filteredGames]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-8 md:px-6">
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <div className="w-full">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Quick search: team, league..."
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-500"
            />
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-700">
          Showing {filteredGames.length} of {gamesWithResolvedFlags.length} matches
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="mr-2 inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
              viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            List
          </button>
        </div>

        <button
          onClick={() => setFilterLiveOnly(!filterLiveOnly)}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterLiveOnly
              ? 'border-rose-500 bg-rose-500 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Live Now
        </button>
        <button
          onClick={() => setFilterWithStreams(!filterWithStreams)}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
            filterWithStreams
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
          >
            Reset
          </button>
        )}
      </div>

      {filteredGames.length > 0 ? (
        <div>
          {groupedByDate.map(([dateLabel, gamesForDate]) => (
            <div key={dateLabel}>
              <div className="mb-6 flex items-center gap-4 px-1">
                <div className="h-px flex-1 bg-gradient-to-r from-slate-300 to-transparent"></div>
                <h2 className="text-lg font-bold text-slate-800 whitespace-nowrap">{dateLabel}</h2>
                <div className="h-px flex-1 bg-gradient-to-l from-slate-300 to-transparent"></div>
              </div>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 mb-6'
                    : 'grid grid-cols-1 gap-3 mb-6'
                }
              >
                {gamesForDate.map((game) => (
                  <GameCard key={game.id} viewMode={viewMode} {...game} />
                ))}
              </div>
            </div>
          ))}
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
