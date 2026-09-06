import { isEndedBySchedule } from './isEndedBySchedule';
import { isFreshSourceLive } from './isFreshSourceLive';

export function isGameEnded(
  scheduledStartAt?: number,
  sourceIsLive?: boolean,
  sourceStatusAt?: number,
  now = Date.now(),
): boolean {
  if (isFreshSourceLive(sourceIsLive, sourceStatusAt, now)) return false;
  return isEndedBySchedule(scheduledStartAt, now);
}
