import { parseScheduledStart } from './parseScheduledStart';

// Prefers the backend's absolute `startsAt`; the label parser is only a fallback for feeds that predate it.
export function resolveScheduledStart(game: { startsAt?: string; dateLabel?: string; timeLabel?: string }): number | undefined {
  if (game.startsAt) {
    const parsed = Date.parse(game.startsAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return parseScheduledStart(game.dateLabel, game.timeLabel)?.getTime();
}
