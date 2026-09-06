import { toDateKey } from './toDateKey';

export function getDateGroupLabel(dateKey: string): string {
  if (dateKey === 'date-tba') return 'Date TBA';

  const date = new Date(`${dateKey}T00:00:00`);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (dateKey === toDateKey(today)) return '';
  if (dateKey === toDateKey(tomorrow)) return 'Tomorrow';

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}
