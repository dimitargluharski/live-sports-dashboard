import React from 'react';
import type { Sport } from '../types/game';

interface SportTabsProps {
  isDarkTheme: boolean;
  sport: Sport;
  onSportChange: (sport: Sport) => void;
}

const SPORT_TABS: Array<{ id: Sport; label: string }> = [
  { id: 'soccer', label: 'Soccer' },
  { id: 'basketball', label: 'Basketball' },
];

export const SportTabs: React.FC<SportTabsProps> = ({ isDarkTheme, sport, onSportChange }) => (
  <div role="tablist" aria-label="Sport" className="inline-flex items-center gap-2">
    {SPORT_TABS.map((tab) => {
      const isActive = tab.id === sport;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onSportChange(tab.id)}
          className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
            isActive
              ? 'border-slate-700 bg-slate-700 text-white'
              : isDarkTheme ? 'border-white/15 bg-[#1b1b1b] text-slate-300 hover:bg-[#252525]' : 'border-black/15 bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          {tab.label}
        </button>
      );
    })}
  </div>
);
