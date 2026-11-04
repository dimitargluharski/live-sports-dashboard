import { GameCardTeamRow } from './GameCardTeamRow';
import { MatchTime } from './MatchTime';
import { TeamVisual } from './TeamVisual';
import type { WinChances } from '../types/game';

interface CarouselCardHeaderProps {
  timeLabel?: string;
  isLive: boolean;
  isEnded: boolean;
  isDarkTheme: boolean;
  canExpand: boolean;
  isExpanded: boolean;
  canWatchStreams: boolean;
  hasStreams: boolean;
  streamCount: number;
  homeTeam: string;
  awayTeam: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  flagUrl?: string | null;
  winChances: WinChances;
  leagueLabel?: string;
  score?: string;
  onToggle: () => void;
}

const chevronPath = 'M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z';

function Chevron({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d={chevronPath} clipRule="evenodd" />
    </svg>
  );
}

function WinChanceBar({ chances, isDarkTheme }: { chances: WinChances; isDarkTheme: boolean }) {
  const muted = isDarkTheme ? 'text-neutral-400' : 'text-slate-500';
  return (
    <div
      className="flex w-full items-center gap-1.5 text-[9px] font-black tabular-nums sm:gap-2 sm:text-[10px]"
      title="Expected win chances from recent form"
      aria-label={`Expected win chances: home ${chances.home} percent, away ${chances.away} percent`}
    >
      <span className={chances.home >= chances.away ? 'text-emerald-500' : muted}>{chances.home}%</span>
      <div className={`relative h-2 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${isDarkTheme ? 'bg-neutral-400' : 'bg-slate-400'}`}
          style={{ width: `${Math.max(12, Math.min(88, chances.home))}%` }}
        />
      </div>
      <span className={chances.away > chances.home ? 'text-emerald-500' : muted}>{chances.away}%</span>
    </div>
  );
}

export function CarouselCardHeader({
  timeLabel,
  isLive,
  isEnded,
  isDarkTheme,
  canExpand,
  isExpanded,
  canWatchStreams,
  hasStreams,
  streamCount,
  homeTeam,
  awayTeam,
  homeLogoUrl,
  awayLogoUrl,
  flagUrl,
  winChances,
  leagueLabel,
  score,
  onToggle,
}: CarouselCardHeaderProps) {
  const isUpcoming = !isLive && !isEnded;
  const streamLabel = isEnded ? 'Stream over' : hasStreams ? `${streamCount} stream${streamCount !== 1 ? 's' : ''}` : 'No stream';
  const statusLabel = isLive ? 'LIVE' : isEnded ? 'ENDED' : timeLabel || 'TIME';
  const statusClass = isLive
    ? 'bg-rose-500 text-white'
    : isEnded
      ? isDarkTheme ? 'border border-white/25 bg-[#303030] text-neutral-100' : 'border border-stone-500 bg-stone-300 text-stone-900'
      : isDarkTheme ? 'bg-[#252525] text-neutral-200' : 'bg-[#f2f1ed] text-slate-800';
  const mobileBadgeClass = isLive
    ? 'border-rose-500/30 bg-rose-500 text-white'
    : isEnded
      ? isDarkTheme ? 'border-white/20 bg-[#252525] text-slate-200' : 'border-stone-500 bg-stone-400 text-stone-900'
      : isDarkTheme ? 'border-white/10 bg-[#252525] text-white' : 'border-black/10 bg-[#f2f1ed] text-slate-950';
  const buttonProps = { type: 'button' as const, onClick: onToggle, 'aria-expanded': isExpanded, disabled: !canExpand };
  const cursor = canExpand ? 'cursor-pointer' : 'cursor-default';
  const teamName = `mt-1 block max-w-24 truncate text-center text-xs font-black sm:max-w-32 sm:text-sm ${isDarkTheme ? 'text-white' : 'text-slate-950'}`;

  return (
    <>
      {leagueLabel && (
        <p className={`mb-2 truncate text-center text-[10px] font-black uppercase tracking-[0.14em] ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>{leagueLabel}</p>
      )}
      <button {...buttonProps} className={`hidden w-full sm:block ${cursor}`}>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9rem)_minmax(0,1fr)] items-start gap-2 sm:gap-8">
          <div className="flex min-w-0 flex-col items-center justify-self-center text-center">
            <TeamVisual teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="large" />
            <span className={teamName}>{homeTeam}</span>
          </div>
          <div className="col-start-2 flex w-full min-w-0 max-w-[9rem] flex-col items-center gap-2 self-center justify-self-center text-center sm:max-w-[10rem]">
            <div className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-black tabular-nums leading-none ${statusClass}`}>
              {isLive && <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
              {isUpcoming && timeLabel ? <MatchTime label={timeLabel} /> : <span>{statusLabel}</span>}
            </div>
            {score && <span aria-label={`Score ${score}`} className={`text-2xl font-black leading-none tabular-nums ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{score}</span>}
            {isUpcoming && <WinChanceBar chances={winChances} isDarkTheme={isDarkTheme} />}
          </div>
          {awayTeam ? (
            <div className="flex min-w-0 flex-col items-center justify-self-center text-center">
              <TeamVisual teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="large" />
              <span className={teamName}>{awayTeam}</span>
            </div>
          ) : <span />}
        </div>
        <div className={`mt-3 flex items-center justify-end gap-2 border-t pt-2 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
          <span className={`text-xs font-bold ${canWatchStreams ? 'text-emerald-600' : isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>{streamLabel}</span>
          <Chevron className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <button {...buttonProps} className={`block w-full sm:hidden ${cursor}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {(isLive || isEnded || timeLabel) && (
            <span className={`inline-flex h-10 min-w-20 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-black tabular-nums ${mobileBadgeClass}`}>
              {isEnded ? (
                <span className="text-xs font-black tracking-wide">ENDED</span>
              ) : isLive ? (
                <span className="inline-flex items-center gap-1 text-sm font-black leading-none tracking-wide">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                  LIVE
                </span>
              ) : (
                <MatchTime label={timeLabel ?? ''} stacked={Boolean(timeLabel?.includes(', '))} />
              )}
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <GameCardTeamRow label="Home" teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />
            {awayTeam && <GameCardTeamRow label="Away" teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />}
          </div>
          {score && <span aria-label={`Score ${score}`} className={`shrink-0 text-xl font-black tabular-nums ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{score}</span>}
        </div>
        {isUpcoming && <div className="mt-2"><WinChanceBar chances={winChances} isDarkTheme={isDarkTheme} /></div>}
        <div className={`mt-2 flex items-center justify-end gap-2 border-t pt-2 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
          <span className={`text-xs font-bold ${canWatchStreams ? 'text-emerald-700' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>{streamLabel}</span>
          <Chevron className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`} />
        </div>
      </button>
    </>
  );
}
