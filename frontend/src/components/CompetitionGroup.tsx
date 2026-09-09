import { useState } from 'react';
import { GameCard } from './GameCard';
import { ChampionsLeagueCarousel } from './ChampionsLeagueCarousel';
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
  const liveChampionsMatches = isChampionsLeagueSection ? games.filter((game) => game.isLive).length : 0;
  const [championsBackground, setChampionsBackground] = useState<string | undefined>();

  return (
    <div className={`mb-5 ${isChampionsLeagueSection ? isDarkTheme ? 'champions-section overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] pb-0' : 'champions-section overflow-hidden rounded-lg border border-black/10 bg-black/[0.02] pb-0' : isQualificationSection ? isDarkTheme ? 'overflow-hidden rounded-xl border border-amber-300/20 bg-amber-200/[0.025]' : 'overflow-hidden rounded-xl border border-amber-600/25 bg-amber-50/35' : ''}`} style={isChampionsLeagueSection && championsBackground ? { background: championsBackground } : undefined}>
      <button
        type="button"
        onClick={isQualificationSection ? onToggle : undefined}
        aria-expanded={isQualificationSection ? isExpanded : undefined}
        className={`flex w-full items-center gap-3 text-left ${isChampionsLeagueSection ? isDarkTheme ? 'cursor-pointer bg-white/[0.03] px-2 py-2 transition-colors hover:bg-white/[0.04]' : 'cursor-pointer bg-black/[0.03] px-2 py-2 transition-colors hover:bg-black/[0.04]' : isQualificationSection ? isDarkTheme ? 'cursor-pointer border-b border-l-4 border-white/10 border-l-amber-300 bg-amber-200/[0.06] px-3 py-3 hover:bg-amber-200/[0.1]' : 'cursor-pointer border-b border-l-4 border-black/10 border-l-amber-600 bg-amber-100/60 px-3 py-3 hover:bg-amber-100/90' : 'mb-2 px-1'}`}
      >
        {isQualificationSection && (
          <span className={isDarkTheme ? 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/15 text-amber-200' : 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800'} aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M6 19v-5h4v5M10 19v-9h4v9M14 19v-3h4v3" />
            </svg>
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <h3 className={isDarkTheme ? `truncate font-black text-white ${isChampionsLeagueSection ? 'text-base tracking-tight' : 'text-sm'}` : `truncate font-black text-slate-950 ${isChampionsLeagueSection ? 'text-base tracking-tight' : 'text-sm'}`}>{leagueLabel.split('.')[1]?.trim() || leagueLabel}</h3>
            {isChampionsLeagueSection && <span className={isDarkTheme ? 'rounded-full border border-white/20 bg-neutral-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-200' : 'rounded-full border border-black/15 bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-700'}>UEFA</span>}
            {isChampionsLeagueSection && <span className={isDarkTheme ? 'text-[11px] font-bold text-neutral-300' : 'text-[11px] font-bold text-neutral-600'}>{games.length} matches</span>}
          </div>
          {!isChampionsLeagueSection && country && <p className={isDarkTheme ? 'text-xs text-neutral-400' : 'text-xs text-slate-500'}>{country}</p>}
        </div>
        {isChampionsLeagueSection && <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] font-bold tabular-nums">
          {liveChampionsMatches > 0 && <span className={isDarkTheme ? 'inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-500/10 px-2 py-1 font-black uppercase tracking-[0.08em] text-rose-200' : 'inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-50 px-2 py-1 font-black uppercase tracking-[0.08em] text-rose-700'}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{liveChampionsMatches} live</span>}
        </div>}
        {isQualificationSection && <span className={isDarkTheme ? 'shrink-0 rounded-full bg-amber-300/15 px-2.5 py-1 text-xs font-bold text-amber-200' : 'shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900'}>{games.length} matches</span>}
        {(isChampionsLeagueSection || isQualificationSection) && <svg className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>}
      </button>
      {isExpanded && (isChampionsLeagueSection ? (
        <div className="champions-stage px-3 pb-3 pt-3 sm:px-5">
          <ChampionsLeagueCarousel games={games} isDarkTheme={isDarkTheme} onBackgroundChange={setChampionsBackground} />
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-2 ${isQualificationSection ? 'p-3' : ''}`}>
          {games.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />)}
        </div>
      ))}
    </div>
  );
}
