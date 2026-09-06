import { ASSUMED_MATCH_DURATION_MS } from '../constants/app';

export function isStartedBySchedule(scheduledStartAt?: number, now = Date.now()): boolean {
  if (!scheduledStartAt) return false;
  return now >= scheduledStartAt && now <= scheduledStartAt + ASSUMED_MATCH_DURATION_MS;
}
