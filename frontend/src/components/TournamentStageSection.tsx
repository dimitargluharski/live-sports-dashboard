import { useState } from 'react';
import { ChampionsLeagueCarousel } from './ChampionsLeagueCarousel';
import type { Game } from '../types/game';

interface TournamentStageSectionProps {
  title: string;
  badgeLabel?: string;
  games: Game[];
  isDarkTheme: boolean;
}

// Renders a tournament-stage label (e.g. "Europe Cup") as its own Champions-League-style section.
export function TournamentStageSection({ title, badgeLabel, games, isDarkTheme }: TournamentStageSectionProps) {
  const [background, setBackground] = useState<string | undefined>();
  const liveCount = games.filter((game) => game.isLive).length;

  if (!games.length) return null;

  return (
    <div
      className={`champions-section mb-5 overflow-hidden rounded-lg border pb-0 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}
      style={background ? { background } : undefined}
    >
      <div className={`flex w-full items-center gap-3 px-2 py-2 ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
            <h3 className={`truncate text-base font-black uppercase tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{title}</h3>
            {badgeLabel && (
              <span className={isDarkTheme ? 'rounded-full border border-white/20 bg-neutral-800 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-200' : 'rounded-full border border-black/15 bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-700'}>
                {badgeLabel}
              </span>
            )}
            <span className={isDarkTheme ? 'text-[11px] font-bold text-neutral-300' : 'text-[11px] font-bold text-neutral-600'}>{games.length} matches</span>
          </div>
        </div>
        {liveCount > 0 && (
          <div className="ml-auto flex shrink-0 items-center gap-1.5 text-[11px] font-bold tabular-nums">
            <span className={isDarkTheme ? 'inline-flex items-center gap-1 rounded-full border border-rose-300/25 bg-rose-500/10 px-2 py-1 font-black uppercase tracking-[0.08em] text-rose-200' : 'inline-flex items-center gap-1 rounded-full border border-rose-500/25 bg-rose-50 px-2 py-1 font-black uppercase tracking-[0.08em] text-rose-700'}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{liveCount} live
            </span>
          </div>
        )}
      </div>
      <div className="champions-stage px-3 pb-3 pt-3 sm:px-5">
        <ChampionsLeagueCarousel games={games} isDarkTheme={isDarkTheme} onBackgroundChange={setBackground} />
      </div>
    </div>
  );
}
