const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});

export function formatDateGroupDate(dateKey: string): string {
  if (dateKey === 'date-tba') {
    return '';
  }

  return DATE_FORMATTER.format(new Date(`${dateKey}T00:00:00`));
}
