import { useMemo, useState } from 'react';
import { PlainLeagueSection } from './PlainLeagueSection';
import { SPORT_LABELS, SPORTS } from '../constants/app';
import { useDebouncedSearchTerm } from '../hooks/useDebouncedSearchTerm';
import { useTheme } from '../contexts/useTheme';
import type { Game, Sport } from '../types/game';
import { formatDateGroupDate } from '../utils/formatDateGroupDate';
import { groupGamesByCompetition } from '../utils/groupGamesByCompetition';
import { groupGamesByDate } from '../utils/groupGamesByDate';
import { isTournamentLabelGame } from '../utils/isTournamentLabelGame';
import { matchesGameSearch } from '../utils/matchesGameSearch';
import { prepareGamesForGrid } from '../utils/prepareGamesForGrid';
import { toDateKey } from '../utils/toDateKey';

interface ResultsPageProps {
  games: Game[];
}

function getHeading(dateKey: string): string {
  if (dateKey === 'date-tba') return 'Date unknown';
  const date = new Date(`${dateKey}T00:00:00`);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toDateKey(new Date())) return 'Today';
  if (dateKey === toDateKey(yesterday)) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export function ResultsPage({ games }: ResultsPageProps) {
  const { isDarkTheme } = useTheme();
  const searchTerm = useDebouncedSearchTerm();
  const [selectedSport, setSelectedSport] = useState<Sport | 'all'>('all');

  const { days, sportCounts, availableSports } = useMemo(() => {
    const finished = prepareGamesForGrid(games).filter(
      (game) => game.isEnded && !game.isPreview && !isTournamentLabelGame(game) && matchesGameSearch(game, searchTerm),
    );
    const sportCounts = new Map<Sport, number>();
    for (const game of finished) {
      if (game.sport) sportCounts.set(game.sport, (sportCounts.get(game.sport) ?? 0) + 1);
    }
    const availableSports = SPORTS.filter((sport) => sportCounts.has(sport));
    const visible = selectedSport === 'all' ? finished : finished.filter((game) => game.sport === selectedSport);

    // Newest day first; inside a day games are split by sport, then by competition.
    const days = groupGamesByDate(visible)
      .reverse()
      .map(([dateKey, dayGames]) => ({
        dateKey,
        count: dayGames.length,
        sports: SPORTS
          .map((sport) => ({ sport, games: dayGames.filter((game) => game.sport === sport) }))
          .filter((entry) => entry.games.length > 0)
          .map(({ sport, games: sportGames }) => ({ sport, competitions: groupGamesByCompetition(sportGames, false) })),
      }));
    return { days, total: visible.length, sportCounts, availableSports };
  }, [games, searchTerm, selectedSport]);

  const muted = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const chipClass = (isActive: boolean) => `inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
    isActive
      ? isDarkTheme
        ? 'bg-white/15 text-white shadow-sm'
        : 'bg-white text-slate-950 shadow-sm ring-1 ring-black/5'
      : isDarkTheme
        ? 'text-slate-400 hover:text-white'
        : 'text-slate-500 hover:text-slate-900'
  }`;
  const countClass = (isActive: boolean) => `text-xs font-bold tabular-nums ${isActive ? 'text-emerald-500' : isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`;

  return (
    <section className={isDarkTheme
      ? 'dark mx-auto min-h-screen w-full max-w-7xl bg-[#111111] px-4 pb-8 pt-4 text-white md:px-6'
      : 'mx-auto min-h-screen w-full max-w-7xl bg-[#f2f1ed] px-4 pb-8 pt-4 text-slate-950 md:px-6'}
    >
      <div className="mb-5 max-w-full overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="group"
          aria-label="Filter results by sport"
          className={`inline-flex gap-1 rounded-xl p-1 ${isDarkTheme ? 'bg-white/5' : 'bg-black/5'}`}
        >
          <button type="button" aria-pressed={selectedSport === 'all'} onClick={() => setSelectedSport('all')} className={chipClass(selectedSport === 'all')}>
            All
            <span className={countClass(selectedSport === 'all')}>{availableSports.reduce((sum, sport) => sum + (sportCounts.get(sport) ?? 0), 0)}</span>
          </button>
          {availableSports.map((sport) => (
            <button key={sport} type="button" aria-pressed={selectedSport === sport} onClick={() => setSelectedSport(sport)} className={chipClass(selectedSport === sport)}>
              {SPORT_LABELS[sport]}
              <span className={countClass(selectedSport === sport)}>{sportCounts.get(sport)}</span>
            </button>
          ))}
        </div>
      </div>

      {days.length === 0 ? (
        <div className={`rounded-2xl py-16 text-center ${isDarkTheme ? 'bg-white/5' : 'bg-white/70'}`}>
          <p className={`text-lg font-medium ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>No finished matches yet</p>
          <p className="mt-1 text-sm text-slate-500">{searchTerm ? `Nothing found for "${searchTerm}".` : 'Final results will appear here.'}</p>
        </div>
      ) : (
        days.map(({ dateKey, sports, count }) => (
          <div key={dateKey} className="mb-7">
            <div className="mb-3 flex items-center gap-3 border-b border-black/10 pb-2 dark:border-white/10">
              <h2 className="text-base font-black">{getHeading(dateKey)}</h2>
              <span className={`text-xs font-semibold ${muted}`}>{formatDateGroupDate(dateKey)} · {count}</span>
            </div>
            {sports.map(({ sport, competitions }) => (
              <div key={sport}>
                {selectedSport === 'all' && (
                  <h3 className={`mb-2 mt-1 px-1 text-[11px] font-black uppercase tracking-[0.14em] ${muted}`}>{SPORT_LABELS[sport]}</h3>
                )}
                {competitions.map((competition) => (
                  <PlainLeagueSection
                    key={competition.label}
                    leagueLabel={competition.label}
                    games={competition.games}
                    isDarkTheme={isDarkTheme}
                    showWinChances={false}
                    muteEnded={false}
                  />
                ))}
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
