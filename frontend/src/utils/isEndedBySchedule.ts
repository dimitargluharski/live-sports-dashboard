import { ASSUMED_MATCH_DURATION_MS } from '../constants/app';

export function isEndedBySchedule(scheduledStartAt?: number, now = Date.now()): boolean {
  if (!scheduledStartAt) return false;
  return now > scheduledStartAt + ASSUMED_MATCH_DURATION_MS;
}
