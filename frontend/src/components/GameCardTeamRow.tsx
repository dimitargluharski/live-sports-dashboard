import React from 'react';
import { TeamVisual } from './TeamVisual';

interface GameCardTeamRowProps {
  label: 'Home' | 'Away';
  teamName: string;
  logoUrl?: string | null;
  flagUrl?: string | null;
  isEnded: boolean;
  isDarkTheme: boolean;
}

export const GameCardTeamRow: React.FC<GameCardTeamRowProps> = ({
  label,
  teamName,
  logoUrl,
  flagUrl,
  isEnded,
  isDarkTheme,
}) => {
  const nameClass = isEnded
    ? isDarkTheme ? 'text-slate-400' : 'text-stone-700'
    : isDarkTheme ? 'text-white' : 'text-slate-950';

  return (
    <div className="flex min-w-0 items-center gap-2">
      <TeamVisual teamName={teamName} logoUrl={logoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />
      <div className="min-w-0">
        <span className={`block text-[8px] font-bold uppercase tracking-[0.1em] ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>
          {label}
        </span>
        <h3 className={`truncate text-sm font-extrabold sm:text-base ${nameClass}`}>{teamName}</h3>
      </div>
    </div>
  );
};
