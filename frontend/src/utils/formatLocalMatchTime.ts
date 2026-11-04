import { parseScheduledStart } from './parseScheduledStart';

export function formatLocalMatchTime(dateLabel?: string, timeLabel?: string): string | undefined {
  if (!dateLabel || !timeLabel) return timeLabel || undefined;

  const sourceDate = parseScheduledStart(dateLabel, timeLabel);
  if (!sourceDate) return timeLabel;

  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(sourceDate);

  if (sourceDate.toDateString() === new Date().toDateString()) return time;

  const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(sourceDate);
  return `${date}, ${time}`;
}
