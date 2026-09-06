import { GameCard } from './GameCard';
import type { Game } from '../types/game';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { isQualificationLeague } from '../utils/isQualificationLeague';

interface CompetitionGroupProps {
  leagueLabel: string;
  games: Game[];
  isDarkTheme: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export function CompetitionGroup({
  leagueLabel,
  games,
  isDarkTheme,
  isExpanded,
  onToggle,
}: CompetitionGroupProps) {
  const country = extractCountryFromLeague(leagueLabel);
  const isQualificationSection = isQualificationLeague(leagueLabel);

  return (
    <div className={`mb-5 ${isQualificationSection ? isDarkTheme ? 'overflow-hidden rounded-xl border border-amber-300/20 bg-amber-200/[0.025]' : 'overflow-hidden rounded-xl border border-amber-600/25 bg-amber-50/35' : ''}`}>
      <button
        type="button"
        onClick={isQualificationSection ? onToggle : undefined}
        aria-expanded={isQualificationSection ? isExpanded : undefined}
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
            <h3 className={isDarkTheme ? 'truncate text-sm font-black text-white' : 'truncate text-sm font-black text-slate-950'}>{leagueLabel.split('.')[1]?.trim() || leagueLabel}</h3>
          </div>
          {country && <p className={isDarkTheme ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{country}</p>}
        </div>
        {isQualificationSection && <span className={isDarkTheme ? 'shrink-0 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200' : 'shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900'}>{games.length} matches</span>}
        {isQualificationSection && <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>}
      </button>
      {isExpanded && <div className={`grid grid-cols-1 gap-2 ${isQualificationSection ? 'p-3' : ''}`}>
        {games.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />)}
      </div>}
    </div>
  );
}
