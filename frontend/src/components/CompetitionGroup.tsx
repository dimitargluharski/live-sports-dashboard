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
  const isChampionsLeagueSection = leagueLabel.trim().toLowerCase() === 'champions league';
  const isQualificationSection = isQualificationLeague(leagueLabel);

  return (
    <div className={`mb-5 ${isChampionsLeagueSection ? isDarkTheme ? 'overflow-hidden rounded-2xl border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(11,35,58,0.9),rgba(8,18,31,0.96))] shadow-[0_16px_40px_rgba(5,25,45,0.25)]' : 'overflow-hidden rounded-2xl border border-cyan-900/15 bg-[linear-gradient(135deg,#f2fbff,#ffffff_58%,#fff9e8)] shadow-[0_14px_35px_rgba(8,47,73,0.12)]' : isQualificationSection ? isDarkTheme ? 'overflow-hidden rounded-xl border border-amber-300/20 bg-amber-200/[0.025]' : 'overflow-hidden rounded-xl border border-amber-600/25 bg-amber-50/35' : ''}`}>
      <button
        type="button"
        onClick={isQualificationSection ? onToggle : undefined}
        aria-expanded={isQualificationSection ? isExpanded : undefined}
        className={`flex w-full items-center gap-3 text-left ${isChampionsLeagueSection ? isDarkTheme ? 'border-b border-cyan-100/10 bg-cyan-200/[0.06] px-4 py-4' : 'border-b border-cyan-900/10 bg-white/60 px-4 py-4' : isQualificationSection ? isDarkTheme ? 'cursor-pointer border-b border-l-4 border-white/10 border-l-amber-300 bg-amber-200/[0.06] px-3 py-3 hover:bg-amber-200/[0.1]' : 'cursor-pointer border-b border-l-4 border-black/10 border-l-amber-600 bg-amber-100/60 px-3 py-3 hover:bg-amber-100/90' : 'mb-2 px-1'}`}
      >
        {isChampionsLeagueSection && (
          <span className={isDarkTheme ? 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-200/10 text-cyan-200 ring-1 ring-inset ring-cyan-100/20' : 'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 ring-1 ring-inset ring-cyan-900/10'} aria-hidden="true">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v3a5 5 0 01-10 0V4ZM9 12h6M12 12v4M8 20h8M9 16h6" />
              <path strokeLinecap="round" d="M7 6H4a4 4 0 004 4M17 6h3a4 4 0 01-4 4" />
            </svg>
          </span>
        )}
        {isQualificationSection && (
          <span className={isDarkTheme ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200' : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800'} aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-5h4v5M10 19v-9h4v9M14 19v-3h4v3" />
            </svg>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className={isDarkTheme ? `truncate font-black text-white ${isChampionsLeagueSection ? 'text-base tracking-tight' : 'text-sm'}` : `truncate font-black text-slate-950 ${isChampionsLeagueSection ? 'text-base tracking-tight' : 'text-sm'}`}>{leagueLabel.split('.')[1]?.trim() || leagueLabel}</h3>
            {isChampionsLeagueSection && <span className={isDarkTheme ? 'rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200' : 'rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-900'}>UEFA</span>}
          </div>
          {isChampionsLeagueSection ? <p className={isDarkTheme ? 'text-xs text-cyan-100/60' : 'text-xs text-cyan-950/60'}>Europe's biggest nights</p> : country && <p className={isDarkTheme ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{country}</p>}
        </div>
        {isChampionsLeagueSection && <span className={isDarkTheme ? 'ml-auto shrink-0 rounded-full border border-cyan-100/15 bg-cyan-100/10 px-2.5 py-1 text-xs font-bold text-cyan-100/80' : 'ml-auto shrink-0 rounded-full border border-cyan-900/10 bg-white/75 px-2.5 py-1 text-xs font-bold text-cyan-950/70'}>{games.length} matches</span>}
        {isQualificationSection && <span className={isDarkTheme ? 'shrink-0 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200' : 'shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900'}>{games.length} matches</span>}
        {isQualificationSection && <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>}
      </button>
      {isExpanded && <div className={`grid grid-cols-1 gap-2 ${isChampionsLeagueSection ? 'p-3 sm:p-4' : isQualificationSection ? 'p-3' : ''}`}>
        {games.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />)}
      </div>}
    </div>
  );
}
