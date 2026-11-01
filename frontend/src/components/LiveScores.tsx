import { useEffect, useMemo, useState } from 'react';
import { LIVE_SCORES_URL, TEAM_LOGO_BASE_URL } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import { GameCardStreams } from './GameCardStreams';
import { StreamModal } from './StreamModal';
import type { Game, GamesPayload, LiveScoreMatch, Stream } from '../types/game';

const REFRESH_MS = 30_000;

function TeamLogo({ path }: { path?: string }) {
  if (!path || !TEAM_LOGO_BASE_URL) return <span className="h-5 w-5" aria-hidden="true" />;
  return <img src={`${TEAM_LOGO_BASE_URL}${path}`} alt="" className="h-5 w-5 object-contain" loading="lazy" referrerPolicy="no-referrer" />;
}

function normalizeTeamName(name: string | null | undefined) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getTeamPairKey(homeTeam: string, awayTeam: string) {
  return [normalizeTeamName(homeTeam), normalizeTeamName(awayTeam)].sort().join('|');
}

function getTeamLogoUrl(path?: string) {
  if (!path) return null;
  return path.startsWith('http') ? path : `${TEAM_LOGO_BASE_URL}${path}`;
}

export function LiveScores() {
  const { isDarkTheme } = useTheme();
  const [matches, setMatches] = useState<LiveScoreMatch[]>([]);
  const [soccerGames, setSoccerGames] = useState<Partial<Game>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedMatchKey, setExpandedMatchKey] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<LiveScoreMatch | null>(null);
  const [initialStream, setInitialStream] = useState<Stream | null>(null);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [scoresResponse, gamesResponse] = await Promise.all([
          fetch(LIVE_SCORES_URL, { cache: 'no-store' }),
          fetch('/soccer/allSoccerGamesToday.json', { cache: 'no-store' }),
        ]);
        if (!scoresResponse.ok) throw new Error(`Failed to load live scores (${scoresResponse.status})`);
        if (!gamesResponse.ok) throw new Error(`Failed to load soccer games (${gamesResponse.status})`);
        const [data, gamesData] = await Promise.all([
          scoresResponse.json() as Promise<LiveScoreMatch[]>,
          gamesResponse.json() as Promise<GamesPayload>,
        ]);
        if (!isMounted) return;
        setMatches(Array.isArray(data) ? data : []);
        setSoccerGames(Array.isArray(gamesData.matches) ? gamesData.matches : []);
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

  const streamsByTeamPair = useMemo(() => {
    const candidates = new Map<string, Partial<Game>[]>();
    soccerGames.forEach((game) => {
      const homeTeam = game.teams?.home?.name;
      const awayTeam = game.teams?.away?.name;
      if (!homeTeam || !awayTeam) return;

      const key = getTeamPairKey(homeTeam, awayTeam);
      candidates.set(key, [...(candidates.get(key) || []), game]);
    });

    const uniqueMatches = new Map<string, Stream[]>();
    candidates.forEach((games, key) => {
      if (games.length !== 1) return;
      const streams = games[0].streams;
      if (streams?.length) uniqueMatches.set(key, streams);
    });
    return uniqueMatches;
  }, [soccerGames]);

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
                className={`relative px-3 py-2 text-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[""] ${index > 0 ? (isDarkTheme ? 'border-t border-white/5' : 'border-t border-black/5') : ''} ${match.status === 'live' ? 'before:bg-rose-500' : isDarkTheme ? 'before:bg-slate-700' : 'before:bg-stone-700'}`}
              >
                <div className="grid grid-cols-[3.5rem_3rem_minmax(0,1fr)_1.25rem_3.5rem_1.25rem_minmax(0,1fr)_8.5rem] items-center gap-2">
                  <span className={`text-xs ${muted}`}>{match.time}</span>
                  <span className={`text-[10px] font-bold uppercase ${match.status === 'live' ? 'text-rose-500' : muted}`}>
                    {match.status === 'live' ? 'Live' : 'FT'}
                  </span>
                  <span className="truncate text-right font-medium">{match.homeTeam}</span>
                  <TeamLogo path={match.homeLogo} />
                  <span className="text-center font-black">{match.score}</span>
                  <TeamLogo path={match.awayLogo} />
                  <span className="truncate font-medium">{match.awayTeam}</span>
                  {(() => {
                    const matchKey = `${group.country}|${group.league}|${match.homeTeam}|${match.awayTeam}|${index}`;
                    const streams = streamsByTeamPair.get(getTeamPairKey(match.homeTeam, match.awayTeam));
                    if (!streams) return <span aria-hidden="true" />;
                    const isExpanded = expandedMatchKey === matchKey;
                    return (
                      <>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedMatchKey(isExpanded ? null : matchKey)}
                          className={`cursor-pointer justify-self-end whitespace-nowrap rounded border px-2.5 py-1 text-xs font-bold transition-colors ${isDarkTheme ? 'border-white/15 text-slate-300 hover:bg-white/5' : 'border-black/10 text-slate-600 hover:bg-black/[0.03]'}`}
                        >
                          {isExpanded ? 'Hide streams' : `Watch streams (${streams.length})`}
                        </button>
                        {isExpanded && (
                          <div className="col-span-full mt-1">
                            <GameCardStreams
                              streams={streams}
                              isDarkTheme={isDarkTheme}
                              onSelect={(stream) => {
                                setSelectedMatch(match);
                                setInitialStream(stream);
                              }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {selectedMatch && initialStream && (
        <StreamModal
          isOpen
          gameTitle={`${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}`}
          homeTeamName={selectedMatch.homeTeam}
          awayTeamName={selectedMatch.awayTeam}
          homeTeamVisual={getTeamLogoUrl(selectedMatch.homeLogo) || selectedMatch.flag}
          awayTeamVisual={getTeamLogoUrl(selectedMatch.awayLogo) || selectedMatch.flag}
          streams={streamsByTeamPair.get(getTeamPairKey(selectedMatch.homeTeam, selectedMatch.awayTeam)) || []}
          initialStream={initialStream}
          isDarkTheme={isDarkTheme}
          onClose={() => {
            setSelectedMatch(null);
            setInitialStream(null);
          }}
        />
      )}
    </div>
  );
}
