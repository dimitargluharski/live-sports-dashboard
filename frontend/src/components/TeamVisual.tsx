import React from 'react';

interface TeamVisualProps {
  teamName: string;
  logoUrl?: string | null;
  flagUrl?: string | null;
  isEnded: boolean;
  isDarkTheme: boolean;
}

export const TeamVisual: React.FC<TeamVisualProps> = ({
  teamName,
  logoUrl,
  flagUrl,
  isEnded,
  isDarkTheme,
}) => {
  const visualUrl = logoUrl || flagUrl || null;
  const visualClass = isEnded
    ? isDarkTheme
      ? 'border-white/10 bg-[#1b1b1b] opacity-60 grayscale'
      : 'border-stone-400 bg-stone-200 opacity-70 grayscale'
    : 'border-slate-200 bg-white';
  const fallbackClass = isEnded
    ? isDarkTheme
      ? 'border-white/10 bg-[#1b1b1b] text-slate-500'
      : 'border-stone-400 bg-stone-200 text-stone-500'
    : 'border-slate-200 bg-slate-100 text-slate-600';

  if (visualUrl) {
    return (
      <img
        src={visualUrl}
        alt={`${teamName} emblem`}
        className={`h-8 w-8 rounded-full border p-1 object-contain ${visualClass}`}
      />
    );
  }

  return (
    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${fallbackClass}`}>
      {teamName.slice(0, 2).toUpperCase()}
    </span>
  );
};
