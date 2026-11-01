import type { Game } from '../types/game';
import { isFreshSourceLive } from './isFreshSourceLive';
import { isGameEnded } from './isGameEnded';
import { isStartedBySchedule } from './isStartedBySchedule';

type StatusInput = Pick<Game, 'scheduledStartAt' | 'sourceIsLive' | 'sourceStatusAt' | 'liveStatus'>;

// The live results feed is authoritative when a match was paired with it; otherwise fall back to the schedule heuristics.
export function resolveGameStatus({ scheduledStartAt, sourceIsLive, sourceStatusAt, liveStatus }: StatusInput) {
  if (liveStatus === 'live') return { isEnded: false, isLive: true };
  if (liveStatus === 'finished') return { isEnded: true, isLive: false };

  const isEnded = isGameEnded(scheduledStartAt, sourceIsLive, sourceStatusAt);
  const isLive = !isEnded && (isFreshSourceLive(sourceIsLive, sourceStatusAt) || isStartedBySchedule(scheduledStartAt));
  return { isEnded, isLive };
}
