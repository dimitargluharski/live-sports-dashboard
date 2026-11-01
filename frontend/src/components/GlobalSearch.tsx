import { useTheme } from '../contexts/useTheme';
import { RefreshTimer } from './RefreshTimer';
import { useSearchStore } from '../stores/useSearchStore';

export function GlobalSearch() {
  const { isDarkTheme } = useTheme();
  const searchTerm = useSearchStore((state) => state.searchTerm);
  const setSearchTerm = useSearchStore((state) => state.setSearchTerm);

  return (
    <div className={`sticky top-0 z-30 border-b py-3 ${isDarkTheme ? 'border-white/10 bg-[#111111]' : 'border-black/10 bg-[#f2f1ed]'}`}>
      <div className="grid w-full grid-cols-[auto_minmax(0,80rem)_1fr] items-center md:grid-cols-[1fr_minmax(0,80rem)_1fr]">
        <div className="flex shrink-0 items-center gap-2.5 pl-4 md:pl-6">
          <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md border ${isDarkTheme ? 'border-white/15 text-slate-300' : 'border-black/15 text-slate-600'}`} aria-hidden="true">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" d="M7.75 7.75a6 6 0 0 0 0 8.5M16.25 7.75a6 6 0 0 1 0 8.5M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
            </svg>
          </span>
          <span className={`hidden text-xs font-bold tracking-[0.14em] sm:inline ${isDarkTheme ? 'text-slate-200' : 'text-slate-800'}`}>sportix.live</span>
        </div>
        <div className="min-w-0 px-4 md:px-6">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search team, league..."
            aria-label="Global search"
            className={isDarkTheme
              ? 'w-full rounded-md border border-white/15 bg-[#1b1b1b] px-4 py-2.5 text-sm text-white outline-none transition-all placeholder:text-slate-500 focus:border-white/50'
              : 'w-full rounded-md border border-black/15 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-slate-500'}
          />
        </div>
        <div className="flex justify-end pr-4 md:pr-6">
          <RefreshTimer />
        </div>
      </div>
    </div>
  );
}
