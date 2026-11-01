import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CompetitionGroup } from './CompetitionGroup';
import type { Game } from '../types/game';
import { extractCountryFromLeague } from '../utils/extractCountryFromLeague';
import { getCountryFlagUrl } from '../utils/getCountryFlagUrl';
import { isSpecialTournament } from '../utils/isSpecialTournament';

interface TournamentStoriesProps {
  games: Game[];
  isDarkTheme: boolean;
  leading?: ReactNode;
}

interface Story {
  leagueLabel: string;
  shortName: string;
  initials: string;
  flagUrl: string | null;
  liveCount: number;
  games: Game[];
}

function buildStories(games: Game[]): Story[] {
  const byLeague = new Map<string, Game[]>();
  games.forEach((game) => {
    const label = game.leagueLabel;
    if (!label || !isSpecialTournament(label)) return;
    byLeague.set(label, [...(byLeague.get(label) ?? []), game]);
  });

  return [...byLeague.entries()]
    .map(([leagueLabel, leagueGames]) => {
      const country = extractCountryFromLeague(leagueLabel);
      const flagUrl = getCountryFlagUrl(country);
      // Only drop the "Country." prefix when it is a real country; "Women." etc. must stay to tell tournaments apart.
      const shortName = flagUrl && country && leagueLabel.toLowerCase().startsWith(`${country.toLowerCase()}.`)
        ? leagueLabel.slice(country.length + 1).trim()
        : leagueLabel;
      const initials = shortName.split(/[\s.]+/).filter((word) => /^[A-Za-z]/.test(word)).map((word) => word[0]).join('').slice(0, 3).toUpperCase();
      return {
        leagueLabel,
        shortName,
        initials,
        flagUrl,
        liveCount: leagueGames.filter((game) => game.isLive).length,
        games: leagueGames,
      };
    })
    .sort((a, b) => b.liveCount - a.liveCount || a.shortName.localeCompare(b.shortName));
}

export function TournamentStories({ games, isDarkTheme, leading }: TournamentStoriesProps) {
  const stories = useMemo(() => buildStories(games), [games]);
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const openStory = stories.find((story) => story.leagueLabel === openLabel) ?? null;

  const isOpen = openStory !== null;

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = window.setTimeout(() => setEntered(true), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenLabel(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKeyDown);
      setEntered(false);
    };
  }, [isOpen]);

  if (stories.length === 0 && !leading) return null;

  const muted = isDarkTheme ? 'text-slate-400' : 'text-slate-500';

  return (
    <>
      <div className="px-1 pb-2 pt-1">
        {stories.length > 0 && (
          <section className="min-w-0" aria-label="Featured tournaments">
            <h2 className={`mb-2 text-[10px] font-bold uppercase tracking-[0.14em] ${muted}`}>Featured tournaments</h2>
            <div className="flex gap-3 overflow-x-auto pt-1" role="list" aria-label="Tournaments in progress">
        {stories.map((story) => (
          <button
            key={story.leagueLabel}
            type="button"
            role="listitem"
            onClick={() => setOpenLabel(story.leagueLabel)}
            className="group flex w-20 shrink-0 cursor-pointer flex-col items-center gap-1.5"
            title={`${story.leagueLabel} · ${story.liveCount > 0 ? `${story.liveCount} live` : `${story.games.length} matches`}`}
          >
            <span className="relative">
              <span className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border transition-colors duration-200 ${story.liveCount > 0 ? 'border-2 border-rose-500 group-hover:border-rose-400' : isDarkTheme ? 'border-white/15 group-hover:border-white/50' : 'border-black/15 group-hover:border-black/50'} ${isDarkTheme ? 'bg-[#252525] group-hover:bg-[#383838]' : 'bg-white group-hover:bg-slate-200'}`}>
                {story.flagUrl
                  ? <img src={story.flagUrl} alt="" className="h-full w-full object-cover" />
                  : <span className={`text-xs font-black ${muted}`}>{story.initials}</span>}
              </span>
              {story.liveCount > 0 && (
                <span className={`absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none tabular-nums text-white ring-2 ${isDarkTheme ? 'ring-[#111111]' : 'ring-[#f2f1ed]'}`} aria-label={`${story.liveCount} live`}>{story.liveCount}</span>
              )}
            </span>
            <span className={`line-clamp-2 w-full break-words text-center text-[11px] font-medium leading-tight transition-colors ${isDarkTheme ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-950'}`}>{story.shortName}</span>
          </button>
        ))}
            </div>
          </section>
        )}
      </div>

      {leading && (
        <div className="mb-3 flex items-center justify-end gap-4 px-1 pr-3" role="group" aria-label="Filters">
          {leading}
        </div>
      )}

      {openStory && (
        <div className="fixed inset-y-0 left-16 right-0 z-50" role="dialog" aria-modal="true" aria-label={openStory.shortName}>
          <button
            type="button"
            aria-label="Close tournament"
            onClick={() => setOpenLabel(null)}
            className={`absolute inset-0 cursor-default backdrop-blur-md transition-opacity duration-300 ${isDarkTheme ? 'bg-black/70' : 'bg-transparent'} ${entered ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto shadow-2xl transition-transform duration-300 ease-out ${entered ? 'translate-y-0' : '-translate-y-full'} ${isDarkTheme ? 'bg-[#111111] text-white' : 'bg-[#f2f1ed] text-slate-950'}`}
          >
            <div className="mx-auto w-full max-w-7xl px-4 pb-2 pt-4 md:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-xs font-bold">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white ${openStory.liveCount > 0 ? 'bg-rose-500' : 'bg-slate-500'}`}>
                    {openStory.liveCount > 0 ? `${openStory.liveCount} live` : `${openStory.games.length} matches`}
                  </span>
                  <span className={muted}>{openStory.leagueLabel}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setOpenLabel(null)}
                  aria-label="Close"
                  className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border ${isDarkTheme ? 'border-white/15 hover:bg-white/10' : 'border-black/15 hover:bg-black/5'}`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                </button>
              </div>
              <CompetitionGroup
                leagueLabel={openStory.leagueLabel}
                games={openStory.games}
                isDarkTheme={isDarkTheme}
                isToday={false}
                isExpanded
                onToggle={() => undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
