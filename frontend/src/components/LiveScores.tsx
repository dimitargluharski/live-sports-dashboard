import { useEffect, useMemo, useState } from 'react';
import { LIVE_SCORES_URL, TEAM_LOGO_BASE_URL } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import type { LiveScoreMatch } from '../types/game';

const REFRESH_MS = 30_000;

function TeamLogo({ path }: { path?: string }) {
  if (!path || !TEAM_LOGO_BASE_URL) return <span className="h-5 w-5" aria-hidden="true" />;
  return <img src={`${TEAM_LOGO_BASE_URL}${path}`} alt="" className="h-5 w-5 object-contain" loading="lazy" referrerPolicy="no-referrer" />;
}

export function LiveScores() {
  const { isDarkTheme } = useTheme();
  const [matches, setMatches] = useState<LiveScoreMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const response = await fetch(LIVE_SCORES_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Failed to load live scores (${response.status})`);
        const data = await response.json() as LiveScoreMatch[];
        if (!isMounted) return;
        setMatches(Array.isArray(data) ? data : []);
        setError(null);
      } catch (loadError) {
        if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Unknown error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const leagues = useMemo(() => {
    const groups = new Map<string, { country: string; league: string; flag: string; matches: LiveScoreMatch[] }>();
    matches.forEach((match) => {
      const key = `${match.country}|${match.league}`;
      const group = groups.get(key) ?? { country: match.country, league: match.league, flag: match.flag, matches: [] };
      group.matches.push(match);
      groups.set(key, group);
    });
    return [...groups.values()];
  }, [matches]);

  const muted = isDarkTheme ? 'text-slate-400' : 'text-slate-500';
  const card = isDarkTheme ? 'border-white/10 bg-[#1b1b1b]' : 'border-black/10 bg-white';

  if (isLoading) return <p className={`py-10 text-center text-sm ${muted}`}>Loading live scores…</p>;
  if (error) return <p role="alert" className="py-10 text-center text-sm font-semibold text-rose-600">{error}</p>;
  if (leagues.length === 0) return <p className={`py-10 text-center text-sm ${muted}`}>No live scores available</p>;

  return (
    <div className="space-y-4">
      {leagues.map((group) => (
        <section key={`${group.country}|${group.league}`} className={`overflow-hidden rounded-md border ${card}`}>
          <h2 className={`flex items-center gap-2 border-b px-3 py-2 text-xs font-bold ${isDarkTheme ? 'border-white/10 text-slate-200' : 'border-black/10 text-slate-800'}`}>
            {group.flag && <img src={group.flag} alt="" className="h-3 w-5 object-cover" loading="lazy" />}
            <span>{group.country && `${group.country} · `}{group.league}</span>
          </h2>
          <ul>
            {group.matches.map((match, index) => (
              <li
                key={`${match.homeTeam}-${match.awayTeam}-${index}`}
                className={`grid grid-cols-[3.5rem_3rem_1fr_1.25rem_3.5rem_1.25rem_1fr] items-center gap-2 px-3 py-2 text-sm ${index > 0 ? (isDarkTheme ? 'border-t border-white/5' : 'border-t border-black/5') : ''}`}
              >
                <span className={`text-xs ${muted}`}>{match.time}</span>
                <span className={`text-[10px] font-bold uppercase ${match.status === 'live' ? 'text-rose-500' : muted}`}>
                  {match.status === 'live' ? '● Live' : 'FT'}
                </span>
                <span className="truncate text-right font-medium">{match.homeTeam}</span>
                <TeamLogo path={match.homeLogo} />
                <span className="text-center font-black">{match.score}</span>
                <TeamLogo path={match.awayLogo} />
                <span className="truncate font-medium">{match.awayTeam}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
