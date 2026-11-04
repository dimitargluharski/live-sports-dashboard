import { MatchTime } from './MatchTime';
import { TeamVisual } from './TeamVisual';
import type { WinChances } from '../types/game';

interface CompactGameRowProps {
  timeLabel?: string;
  isLive: boolean;
  isEnded: boolean;
  isDarkTheme: boolean;
  canExpand: boolean;
  isExpanded: boolean;
  canWatchStreams: boolean;
  hasStreams: boolean;
  streamCount: number;
  h2hCount: number;
  hasForm: boolean;
  score?: string;
  homeTeam: string;
  awayTeam: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  flagUrl?: string | null;
  showWinChances: boolean;
  winChances?: WinChances | null;
  onToggle: () => void;
}

const iconProps = { className: 'h-4 w-4', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export function CompactGameRow({
  timeLabel,
  isLive,
  isEnded,
  isDarkTheme,
  canExpand,
  isExpanded,
  canWatchStreams,
  hasStreams,
  streamCount,
  h2hCount,
  hasForm,
  score,
  homeTeam,
  awayTeam,
  homeLogoUrl,
  awayLogoUrl,
  flagUrl,
  showWinChances,
  winChances,
  onToggle,
}: CompactGameRowProps) {
  const muted = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const nameClass = isEnded ? muted : isDarkTheme ? 'text-white' : 'text-slate-950';
  const streamLabel = isEnded ? 'Stream over' : hasStreams ? `Watch streams (${streamCount})` : 'No stream';
  const emptyIconClass = isDarkTheme ? 'text-slate-600' : 'text-slate-300';
  const isUpcoming = !score && !isLive && !isEnded;
  const shownChances = showWinChances && isUpcoming ? winChances : null;

  const middle = score
    ? <span className={`text-center font-black ${nameClass}`}>{score}</span>
    : isLive || isEnded
      ? <span title="Score not available" className={`text-center text-[10px] font-bold uppercase tracking-wide ${muted}`}>N/A</span>
      : shownChances
        ? (
          <span
            title="Estimated win chances from recent form"
            aria-label={`Estimated win chances: home ${shownChances.home} percent, away ${shownChances.away} percent`}
            className="flex w-full flex-col items-center"
          >
            <span className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)_1.75rem] items-center gap-1 text-[10px] font-bold leading-none tabular-nums">
              <span className={`text-right ${shownChances.home >= shownChances.away ? 'text-emerald-500' : muted}`}>{shownChances.home}%</span>
              <span className={`flex h-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`} aria-hidden="true">
                <span className="h-full bg-emerald-500" style={{ width: `${shownChances.home}%` }} />
              </span>
              <span className={`text-left ${shownChances.away > shownChances.home ? 'text-emerald-500' : muted}`}>{shownChances.away}%</span>
            </span>
          </span>
        )
        : <span className={`text-center text-xs font-black ${muted}`}>vs</span>;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      disabled={!canExpand}
      className={`block w-full text-left text-sm ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className={showWinChances
        ? 'grid grid-cols-[3rem_2.5rem_minmax(0,1fr)_1.75rem_5.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[3.5rem_3rem_minmax(0,1fr)_1.75rem_6rem_1.75rem_minmax(0,1fr)_8rem]'
        : 'grid grid-cols-[3rem_2.5rem_minmax(0,1fr)_1.75rem_1.5rem_1.75rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[3.5rem_3rem_minmax(0,1fr)_1.75rem_3.5rem_1.75rem_minmax(0,1fr)_8rem]'}
      >
        <span className={`whitespace-nowrap text-[10px] tabular-nums sm:text-xs ${isLive || isEnded ? 'font-bold uppercase' : 'col-span-2'} ${isLive ? 'text-rose-500' : muted}`}>
          {isLive ? 'Live' : isEnded ? 'FT' : timeLabel ? <MatchTime label={timeLabel} /> : '--:--'}
        </span>
        {(isLive || isEnded) && <span aria-hidden="true" />}
        <span className={`truncate text-right font-medium ${nameClass}`}>{homeTeam}</span>
        <TeamVisual teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="small" />
        {middle}
        {awayTeam ? <TeamVisual teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="small" /> : <span />}
        <span className={`truncate font-medium ${nameClass}`}>{awayTeam}</span>
        <span className={`col-span-full flex items-center justify-end gap-1.5 sm:col-span-1 ${muted}`}>
          <span title={streamLabel} aria-label={streamLabel} className={`relative inline-flex h-5 w-5 items-center justify-center ${canWatchStreams ? 'text-emerald-500' : emptyIconClass}`}>
            <svg {...iconProps} className="h-5 w-5 shrink-0">
              {canWatchStreams ? (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M10 8.5l5.5 3.5-5.5 3.5z" fill="currentColor" />
                </>
              ) : (
                <>
                  <path d="M15 10l5-3v10l-5-3" />
                  <rect x="3" y="6" width="12" height="12" rx="2" />
                  <path d="M3 3l18 18" />
                </>
              )}
            </svg>
            {canWatchStreams && streamCount > 0 && (
              <span className="absolute -bottom-1.5 -right-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-emerald-500 px-0.5 text-[9px] font-black leading-none tabular-nums text-white">{streamCount}</span>
            )}
          </span>
          <span title={h2hCount > 0 ? `Head to head (${h2hCount})` : 'No head to head'} className={`inline-flex h-5 w-5 items-center justify-center ${h2hCount > 0 ? 'text-blue-500' : emptyIconClass}`}>
            <svg {...iconProps}><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" /></svg>
          </span>
          <span title={hasForm ? 'Recent form' : 'No form data'} className={`inline-flex h-5 w-5 items-center justify-center ${hasForm ? 'text-amber-500' : emptyIconClass}`}>
            <svg {...iconProps}><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></svg>
          </span>
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
            {canExpand && (
              <svg className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
            )}
          </span>
        </span>
      </div>
    </button>
  );
}
