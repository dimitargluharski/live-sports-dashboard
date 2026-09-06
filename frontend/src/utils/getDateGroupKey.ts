import { toDateKey } from './toDateKey';

export function getDateGroupKey(dateLabel?: string): string {
  if (!dateLabel) return 'date-tba';

  const date = new Date(`${dateLabel} ${new Date().getFullYear()}`);
  return Number.isNaN(date.getTime()) ? 'date-tba' : toDateKey(date);
}
