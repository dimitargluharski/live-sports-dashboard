export function formatLocalMatchTime(startAt?: number, fallbackTimeLabel?: string): string | undefined {
  if (startAt === undefined) return fallbackTimeLabel || undefined;

  const sourceDate = new Date(startAt);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(sourceDate);

  if (sourceDate.toDateString() === new Date().toDateString()) return time;

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const dayLabel = sourceDate.toDateString() === tomorrow.toDateString()
    ? 'Tomorrow'
    : new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(sourceDate);
  return `${dayLabel}, ${time}`;
}
