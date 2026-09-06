import { SOURCE_TIME_OFFSET_HOURS } from '../constants/app';

export function parseScheduledStart(dateLabel?: string, timeLabel?: string): Date | null {
  if (!dateLabel || !timeLabel) return null;

  const sourceDate = new Date(`${dateLabel} ${new Date().getFullYear()} ${timeLabel} UTC`);
  sourceDate.setUTCHours(sourceDate.getUTCHours() + SOURCE_TIME_OFFSET_HOURS);
  return Number.isNaN(sourceDate.getTime()) ? null : sourceDate;
}
