import { parseScheduledStart } from './parseScheduledStart';

export function formatLocalMatchTime(dateLabel?: string, timeLabel?: string): string | undefined {
  if (!dateLabel || !timeLabel) return timeLabel || undefined;

  const sourceDate = parseScheduledStart(dateLabel, timeLabel);
  if (!sourceDate) return timeLabel;

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(sourceDate);
}
