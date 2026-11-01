import type { Game } from '../types/game';
import { formatLocalMatchTime } from './formatLocalMatchTime';
import { parseScheduledStart } from './parseScheduledStart';
import { resolveGameStatus } from './resolveGameStatus';
import { TEAM_LOGO_BASE_URL } from '../constants/app';

// Live-only matches carry logo paths relative to the image host.
function resolveLogo(url?: string | null) {
  if (!url) return url;
  return url.startsWith('http') ? url : `${TEAM_LOGO_BASE_URL}${url}`;
}

function resolveTeams(teams: Game['teams']): Game['teams'] {
  if (!teams) return teams;
  return {
    home: teams.home && { ...teams.home, logoUrl: resolveLogo(teams.home.logoUrl) },
    away: teams.away && { ...teams.away, logoUrl: resolveLogo(teams.away.logoUrl) },
  };
}

export function normalizeGame(game: Partial<Game>, index: number, sourceStatusAt?: number): Game {
  const scheduledStartAt = parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime();
  const sourceIsLive = Boolean(game.sourceIsLive ?? game.isLive);
  const { isEnded, isLive } = resolveGameStatus({ scheduledStartAt, sourceIsLive, sourceStatusAt, liveStatus: game.liveStatus });

  return {
    id: Number.isFinite(game.id) ? Number(game.id) : index + 1,
    matchId: game.matchId,
    score: game.score,
    liveStatus: game.liveStatus,
    title: game.title || 'Unknown match',
    dateLabel: game.dateLabel || undefined,
    timeLabel: formatLocalMatchTime(game.dateLabel, game.timeLabel),
    scheduledStartAt,
    leagueLabel: game.leagueLabel || undefined,
    streamCount: Number.isFinite(game.streamCount)
      ? Number(game.streamCount)
      : Array.isArray(game.streams) ? game.streams.length : 0,
    sourceIsLive,
    sourceStatusAt,
    isEnded,
    isLive,
    streams: Array.isArray(game.streams) ? game.streams : [],
    headToHead: game.headToHead || null,
    teams: resolveTeams(game.teams),
  };
}
