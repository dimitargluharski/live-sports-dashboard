import React from 'react';
import { GameCardTeamRow } from './GameCardTeamRow';
import { TeamVisual } from './TeamVisual';
import type { TeamForm } from '../types/game';
import { getFormWinProbabilities } from '../utils/getFormWinProbabilities';

interface GameCardHeaderProps {
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
  hideScheduledTime?: boolean;
  horizontalTeams?: boolean;
  homeForm?: TeamForm;
  awayForm?: TeamForm;
  onToggle: () => void;
}

export const GameCardHeader: React.FC<GameCardHeaderProps> = ({
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
  hideScheduledTime = false,
  horizontalTeams = false,
  homeForm,
  awayForm,
  onToggle,
}) => {
  if (horizontalTeams) {
    const statusLabel = isLive ? 'LIVE' : isEnded ? 'ENDED' : timeLabel || 'TIME';
    const statusClass = isLive
      ? 'bg-rose-500 text-white'
      : isEnded
        ? isDarkTheme ? 'border border-white/25 bg-[#303030] text-neutral-100' : 'border border-stone-500 bg-stone-300 text-stone-900'
        : isDarkTheme ? 'bg-[#252525] text-neutral-200' : 'bg-[#f2f1ed] text-slate-800';
    const formProbabilities = getFormWinProbabilities(homeForm, awayForm);
    const clockIcon = (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" d="M12 7v5l3 2" />
      </svg>
    );
    const timeStatus = (
      <div className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-black tabular-nums leading-none ${statusClass}`}>
        {isLive ? (
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
        ) : !isEnded ? (
          <span className="inline-flex items-center justify-center">{clockIcon}</span>
        ) : null}
        <span>{statusLabel}</span>
      </div>
    );
    const customDesktopHeader = (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        disabled={!canExpand}
        className={`hidden w-full sm:block ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9rem)_minmax(0,1fr)] items-start gap-2 sm:gap-8">
          <div className="flex min-w-0 justify-self-center flex-col items-center gap-1.5 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="flex min-w-0 flex-col items-center">
                <TeamVisual teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="large" />
                <span className={`mt-1 block max-w-24 truncate text-center text-xs font-black sm:max-w-32 sm:text-sm ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{homeTeam}</span>
              </div>
            </div>
          </div>
          <div className="col-start-2 flex min-w-0 w-full max-w-[9rem] self-center justify-self-center flex-col items-center gap-2 text-center sm:max-w-[10rem]">
            {timeStatus}
            <div
              className="flex w-full items-center gap-1.5 text-[9px] font-black tabular-nums sm:gap-2 sm:text-[10px]"
              title="Estimated win chances from recent form"
              aria-label={`Estimated win chances: home ${formProbabilities.home} percent, away ${formProbabilities.away} percent`}
            >
              <span className={isDarkTheme ? 'text-neutral-300' : 'text-slate-600'}>{formProbabilities.home}%</span>
              <div className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${isDarkTheme ? 'bg-white/10' : 'bg-slate-200'}`}>
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${isDarkTheme ? 'bg-neutral-400' : 'bg-slate-400'}`}
                  style={{ width: `${Math.max(12, Math.min(88, formProbabilities.home))}%` }}
                />
              </div>
              <span className={isDarkTheme ? 'text-neutral-300' : 'text-slate-600'}>{formProbabilities.away}%</span>
            </div>
          </div>
          {awayTeam ? (
            <div className="flex min-w-0 justify-self-center flex-col items-center gap-1.5 text-center">
              <div className="flex min-w-0 flex-col items-center">
                <TeamVisual teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} size="large" />
                <span className={`mt-1 block max-w-24 truncate text-center text-xs font-black sm:max-w-32 sm:text-sm ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{awayTeam}</span>
              </div>
            </div>
          ) : <span />}
        </div>
        <div className={`mt-3 flex items-center justify-end gap-2 border-t pt-2 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
          <span className={`text-xs font-bold ${canWatchStreams ? 'text-emerald-600' : isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
            {isEnded ? 'Stream over' : hasStreams ? `${streamCount} stream${streamCount !== 1 ? 's' : ''}` : 'No stream'}
          </span>
          <svg className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
        </div>
      </button>
    );

    const standardMobileHeader = (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        disabled={!canExpand}
        className={`block w-full sm:hidden ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {(isLive || isEnded || (timeLabel && !hideScheduledTime)) && (
            <span className={`inline-flex h-10 w-20 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-black tabular-nums ${isLive ? 'border-rose-500/30 bg-rose-500 text-white' : isEnded ? isDarkTheme ? 'border-white/20 bg-[#252525] text-slate-200' : 'border-stone-500 bg-stone-400 text-stone-900' : isDarkTheme ? 'border-white/10 bg-[#252525] text-white' : 'border-black/10 bg-[#f2f1ed] text-slate-950'}`}>
              {isEnded ? (
                <span className="text-xs font-black tracking-wide">ENDED</span>
              ) : isLive ? (
                <span className="flex flex-col items-center gap-0.5 leading-none">
                  <span className="inline-flex items-center gap-1 text-sm font-black tracking-wide">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                    LIVE
                  </span>
                </span>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
                  {timeLabel}
                </>
              )}
            </span>
          )}
          {!horizontalTeams && <div className={`h-10 w-px shrink-0 ${isDarkTheme ? 'bg-white/10' : 'bg-black/10'}`} />}
          <div className={'min-w-0 space-y-1'}>
            <GameCardTeamRow label="Home" teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />
            {awayTeam && <GameCardTeamRow label="Away" teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />}
          </div>
        </div>
        <div className={`mt-2 flex items-center justify-end gap-2 border-t pt-2 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
          <span className={`text-xs font-bold ${canWatchStreams ? 'text-emerald-700' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
            <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" /></svg>{isEnded ? 'Stream over' : hasStreams ? `${streamCount} stream${streamCount !== 1 ? 's' : ''}` : 'No stream'}</span>
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center text-slate-600" aria-hidden="true">
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
          </span>
        </div>
      </button>
    );

    return (
      <>
        {customDesktopHeader}
        {standardMobileHeader}
      </>
    );
  }

  return (
  <button
    type="button"
    onClick={onToggle}
    aria-expanded={isExpanded}
    disabled={!canExpand}
    className={`flex w-full flex-col gap-2 text-left lg:flex-row lg:items-center lg:justify-between ${canExpand ? 'cursor-pointer' : 'cursor-default'}`}
  >
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {(isLive || isEnded || (timeLabel && !hideScheduledTime)) && (
        <span className={`inline-flex h-10 w-20 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-black tabular-nums ${isLive ? 'border-rose-500/30 bg-rose-500 text-white' : isEnded ? isDarkTheme ? 'border-white/20 bg-[#252525] text-slate-200' : 'border-stone-500 bg-stone-400 text-stone-900' : isDarkTheme ? 'border-white/10 bg-[#252525] text-white' : 'border-black/10 bg-[#f2f1ed] text-slate-950'}`}>
          {isEnded ? (
            <span className="text-xs font-black tracking-wide">ENDED</span>
          ) : isLive ? (
            <span className="flex flex-col items-center gap-0.5 leading-none">
              <span className="inline-flex items-center gap-1 text-sm font-black tracking-wide">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                LIVE
              </span>
            </span>
          ) : (
            <>
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
              {timeLabel}
            </>
          )}
        </span>
      )}
      {!horizontalTeams && <div className={`h-10 w-px shrink-0 ${isDarkTheme ? 'bg-white/10' : 'bg-black/10'}`} />}
      <div className={horizontalTeams ? 'grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4' : 'min-w-0 space-y-1'}>
        <GameCardTeamRow label="Home" teamName={homeTeam} logoUrl={homeLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />
          {horizontalTeams && <span className={`text-center text-[10px] font-black uppercase tracking-[0.14em] ${isDarkTheme ? 'text-teal-200/70' : 'text-teal-700/70'}`}>vs</span>}
        {awayTeam && <GameCardTeamRow label="Away" teamName={awayTeam} logoUrl={awayLogoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />}
      </div>
    </div>
    <div className={`flex flex-wrap items-center gap-2 border-t pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
      <span className={`text-xs font-bold ${canWatchStreams ? 'text-emerald-700' : isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" /></svg>{isEnded ? 'Stream over' : hasStreams ? `${streamCount} stream${streamCount !== 1 ? 's' : ''}` : 'No stream'}</span>
      </span>
      <span className="inline-flex h-8 w-8 items-center justify-center text-slate-600" aria-hidden="true">
        <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" /></svg>
      </span>
    </div>
  </button>
  );
};
