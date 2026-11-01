import { useEffect, useState } from 'react';
import { FEED_REFRESH_INTERVAL_MS } from '../constants/app';
import { useTheme } from '../contexts/useTheme';
import { useFeedStore } from '../stores/useFeedStore';

export function RefreshTimer() {
  const { isDarkTheme } = useTheme();
  const lastRefreshAt = useFeedStore((state) => state.lastRefreshAt);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (lastRefreshAt === null) return null;

  const elapsed = Math.max(0, now - lastRefreshAt);
  const secondsLeft = Math.max(0, Math.ceil((FEED_REFRESH_INTERVAL_MS - elapsed) / 1000));
  const progress = Math.min(1, elapsed / FEED_REFRESH_INTERVAL_MS);

  if (secondsLeft > 10) return null;

  return (
    <div
      className={`flex shrink-0 items-center justify-end gap-2 text-xs font-medium tabular-nums ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}
      title="The page checks for new match data every 30 seconds"
    >
      <span className="relative inline-flex h-4 w-4">
        <svg className="h-4 w-4 -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2.5" className={isDarkTheme ? 'stroke-white/15' : 'stroke-black/10'} />
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 8}
            strokeDashoffset={2 * Math.PI * 8 * progress}
            className="stroke-emerald-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
      </span>
      <span className="hidden sm:inline">Data refreshes in</span>
      <span>{secondsLeft}s</span>
    </div>
  );
}
