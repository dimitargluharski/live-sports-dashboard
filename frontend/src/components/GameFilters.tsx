import React from 'react';

interface GameFiltersProps {
  isDarkTheme: boolean;
  filterLiveOnly: boolean;
  filterWithStreams: boolean;
  liveGamesCount: number;
  streamGamesCount: number;
  onToggleLive: () => void;
  onToggleStreams: () => void;
}

export const GameFilters: React.FC<GameFiltersProps> = ({
  isDarkTheme,
  filterLiveOnly,
  filterWithStreams,
  liveGamesCount,
  streamGamesCount,
  onToggleLive,
  onToggleStreams,
}) => (
  <div className="mb-5 flex flex-wrap items-center gap-2">
    <button
      type="button"
      onClick={onToggleLive}
      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        filterLiveOnly
          ? 'border-rose-500 bg-rose-500 text-white hover:bg-rose-600'
          : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8" /><path strokeLinecap="round" d="M12 8v4l2.5 1.5" /></svg>
        Live Now ({liveGamesCount})
      </span>
    </button>
    <button
      type="button"
      onClick={onToggleStreams}
      className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        filterWithStreams
          ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
          : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-200 hover:bg-[#252525]' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" /></svg>
        Has Streams ({streamGamesCount})
      </span>
    </button>
  </div>
);
