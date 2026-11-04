import { ChampionsLeagueCarousel } from './ChampionsLeagueCarousel';
import type { Game } from '../types/game';
import { getGameDateKey } from '../utils/getGameDateKey';
import { isSpecialTournament } from '../utils/isSpecialTournament';
import { isTournamentLabelGame } from '../utils/isTournamentLabelGame';
import { toDateKey } from '../utils/toDateKey';

interface FeaturedMatchesProps {
  games: Game[];
  isDarkTheme: boolean;
}

// Live matches and today's remaining matches from every featured tournament, live first, then by kickoff.
function getFeaturedMatches(games: Game[]): Game[] {
  const todayKey = toDateKey(new Date());
  return games
    .filter((game) => (
      isSpecialTournament(game.leagueLabel)
      && !isTournamentLabelGame(game)
      && !game.isEnded
      && (game.isLive || getGameDateKey(game) === todayKey)
    ))
    .sort((a, b) => Number(b.isLive) - Number(a.isLive) || (a.scheduledStartAt ?? 0) - (b.scheduledStartAt ?? 0));
}

export function FeaturedMatches({ games, isDarkTheme }: FeaturedMatchesProps) {
  const featured = getFeaturedMatches(games);
  if (featured.length === 0) return null;

  const liveCount = featured.filter((game) => game.isLive).length;

  return (
    <div className={`champions-section mb-5 overflow-hidden rounded-lg border pb-0 ${isDarkTheme ? 'border-white/10 bg-white/[0.02]' : 'border-black/10 bg-black/[0.02]'}`}>
      <div className={`flex w-full items-center gap-3 px-3 py-2 ${isDarkTheme ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}`}>
        <h3 className={`truncate text-base font-black tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>Featured matches</h3>
        <span className={`text-[11px] font-bold ${isDarkTheme ? 'text-neutral-300' : 'text-neutral-600'}`}>{featured.length} matches</span>
        {liveCount > 0 && (
          <span className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black uppercase tracking-[0.08em] tabular-nums ${isDarkTheme ? 'border-rose-300/25 bg-rose-500/10 text-rose-200' : 'border-rose-500/25 bg-rose-50 text-rose-700'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{liveCount} live
          </span>
        )}
      </div>
      <div className="champions-stage px-3 pb-3 pt-3 sm:px-5">
        <ChampionsLeagueCarousel games={featured} isDarkTheme={isDarkTheme} />
      </div>
    </div>
  );
}
