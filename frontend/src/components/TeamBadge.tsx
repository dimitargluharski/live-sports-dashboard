import React from 'react';

interface TeamBadgeProps {
  teamName: string;
  visualUrl?: string | null;
  accentColor?: string | null;
  isDarkTheme: boolean;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  teamName,
  visualUrl,
  accentColor,
  isDarkTheme,
}) => (
  <div
    className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-l-[6px] px-3 py-2 text-center ring-1 sm:rounded-xl sm:px-4 sm:py-2.5 ${isDarkTheme ? 'border-white/5 bg-[#252525] ring-white/10' : 'border-black/5 bg-white ring-black/10'}`}
    style={{ borderLeftColor: accentColor || undefined }}
  >
    {visualUrl && (
      <img
        src={visualUrl}
        alt={`${teamName} logo`}
        className="h-7 w-7 shrink-0 rounded-full border border-black/10 bg-white p-1 object-contain sm:h-8 sm:w-8"
      />
    )}
    <span className={`min-w-0 truncate text-xs font-black leading-none tracking-tight sm:text-base md:text-lg ${isDarkTheme ? 'text-white' : 'text-slate-950'}`} title={teamName}>
      {teamName}
    </span>
  </div>
);
