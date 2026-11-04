const iconProps = { className: 'h-3 w-3 shrink-0', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true } as const;

// Renders "5 Nov, 21:00" as a calendar + date and clock + time; a time-only label gets just the clock.
export function MatchTime({ label, stacked = false }: { label: string; stacked?: boolean }) {
  const [datePart, timePart] = label.includes(', ') ? label.split(', ') : [undefined, label];
  return (
    <span className={`inline-flex ${stacked ? 'flex-col items-start gap-0.5' : 'items-center gap-1.5'} leading-none`}>
      {datePart && (
        <span className="inline-flex items-center gap-1">
          <svg {...iconProps}><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M3 10h18M8 3v4M16 3v4" /></svg>
          {datePart}
        </span>
      )}
      <span className="inline-flex items-center gap-1">
        <svg {...iconProps}><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
        {timePart}
      </span>
    </span>
  );
}
