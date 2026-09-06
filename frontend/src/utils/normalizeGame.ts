import type { Game } from '../types/game';
import { formatLocalMatchTime } from './formatLocalMatchTime';
import { isFreshSourceLive } from './isFreshSourceLive';
import { isGameEnded } from './isGameEnded';
import { isStartedBySchedule } from './isStartedBySchedule';
import { parseScheduledStart } from './parseScheduledStart';

export function normalizeGame(game: Partial<Game>, index: number, sourceStatusAt?: number): Game {
  const scheduledStartAt = parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime();
  const sourceIsLive = Boolean(game.sourceIsLive ?? game.isLive);
  const isEnded = isGameEnded(scheduledStartAt, sourceIsLive, sourceStatusAt);

  return {
    id: Number.isFinite(game.id) ? Number(game.id) : index + 1,
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
    isLive: !isEnded && (isFreshSourceLive(sourceIsLive, sourceStatusAt) || isStartedBySchedule(scheduledStartAt)),
    streams: Array.isArray(game.streams) ? game.streams : [],
    headToHead: game.headToHead || null,
    teams: game.teams,
  };
}
