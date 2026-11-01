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

interface FilterItemProps {
  isActive: boolean;
  isDarkTheme: boolean;
  activeClass: string;
  accentClass: string;
  badgeClass: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}

const FilterItem: React.FC<FilterItemProps> = ({ isActive, isDarkTheme, activeClass, accentClass, badgeClass, label, count, icon, onClick }) => (
  <button
    type="button"
    aria-pressed={isActive}
    aria-label={`${label} (${count})`}
    onClick={onClick}
    className={`group relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors duration-200 ${
      isActive
        ? `border-2 ${activeClass}`
        : isDarkTheme
          ? `border-white/15 bg-[#252525] hover:bg-[#383838] ${accentClass}`
          : `border-black/15 bg-white hover:bg-slate-200 ${accentClass}`
    }`}
  >
    <span className="[&>svg]:h-5 [&>svg]:w-5">{icon}</span>
    {count > 0 && (
      <span
        aria-hidden="true"
        className={`        absolute bottom-0 right-0 translate-x-1/2 translate-y-1/4 flex h-4 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none tabular-nums text-white ring-2 ${badgeClass} ${isDarkTheme ? 'ring-[#111111]' : 'ring-[#f2f1ed]'}`}
      >
                {count > 99 ? '99+' : count}
      </span>
    )}
    <span
      role="tooltip"
      className={`pointer-events-none absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-semibold opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${isDarkTheme ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
    >
      {label} · {count}
    </span>
  </button>
);

export const GameFilters: React.FC<GameFiltersProps> = ({
  isDarkTheme,
  filterLiveOnly,
  filterWithStreams,
  liveGamesCount,
  streamGamesCount,
  onToggleLive,
  onToggleStreams,
}) => (
  <>
    <FilterItem
      isActive={filterLiveOnly}
      isDarkTheme={isDarkTheme}
      activeClass={isDarkTheme ? 'border-rose-500 bg-rose-500/25 text-rose-400' : 'border-rose-500 bg-rose-500/15 text-rose-600'}
      accentClass="text-rose-500"
      badgeClass="bg-rose-500"
      label="Live now"
      count={liveGamesCount}
      onClick={onToggleLive}
      icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M7.75 7.75a6 6 0 0 0 0 8.5M16.25 7.75a6 6 0 0 1 0 8.5M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></svg>}
    />
    <FilterItem
      isActive={filterWithStreams}
      isDarkTheme={isDarkTheme}
      activeClass={isDarkTheme ? 'border-emerald-500 bg-emerald-500/25 text-emerald-400' : 'border-emerald-500 bg-emerald-500/15 text-emerald-600'}
      accentClass="text-emerald-500"
      badgeClass="bg-emerald-500"
      label="Has streams"
      count={streamGamesCount}
      onClick={onToggleStreams}
      icon={<svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinejoin="round" d="m10 8.5 5 3.5-5 3.5z" fill="currentColor" /></svg>}
    />
  </>
);
