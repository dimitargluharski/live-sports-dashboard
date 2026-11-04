import { GameCard } from './GameCard';
import type { GameSegment } from '../utils/groupGamesByTournamentLabel';

interface StageSectionsProps {
  leagueLabel: string;
  segments: GameSegment[];
  isDarkTheme: boolean;
}

// Tournament stages (e.g. "Europe Cup") render as sub-headings inside one compact list, like every other competition.
export function StageSections({ leagueLabel, segments, isDarkTheme }: StageSectionsProps) {
  return (
    <section className={`mb-4 overflow-hidden rounded-md border ${isDarkTheme ? 'border-white/10 bg-[#1b1b1b]' : 'border-black/10 bg-white'}`}>
      <h3 className={`border-b px-3 py-2 text-xs font-bold ${isDarkTheme ? 'border-white/10 text-slate-200' : 'border-black/10 text-slate-800'}`}>
        {leagueLabel}
      </h3>
      {segments.map((segment, index) => {
        if (!segment.matches.length) return null;
        return (
          <div key={segment.label?.id ?? `plain-${index}`}>
            {segment.label && (
              <h4 className={`truncate border-t px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${isDarkTheme ? 'border-white/5 bg-white/[0.04] text-slate-400' : 'border-black/5 bg-black/[0.04] text-slate-500'}`}>
                {segment.label.title}
              </h4>
            )}
            {segment.matches.map((game) => <GameCard key={game.id} isDarkTheme={isDarkTheme} {...game} />)}
          </div>
        );
      })}
    </section>
  );
}
