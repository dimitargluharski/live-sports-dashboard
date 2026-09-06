import React from 'react';
import type { HeadToHead } from '../types/game';

interface GameCardHeadToHeadProps {
  homeTeam: string;
  matches: NonNullable<HeadToHead['matches']>;
  summary: { W: number; D: number; L: number };
  isDarkTheme: boolean;
}

export const GameCardHeadToHead: React.FC<GameCardHeadToHeadProps> = ({
  homeTeam,
  matches,
  summary,
  isDarkTheme,
}) => (
  <div>
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center justify-center bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{homeTeam} wins {summary.W}</span>
      <span className="inline-flex items-center justify-center bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">Draws {summary.D}</span>
      <span className="inline-flex items-center justify-center bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-700">{homeTeam} losses {summary.L}</span>
    </div>
    <p className={`mb-2 text-[10px] font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
      H = home · A = away · Green = winner
    </p>
    <div className="grid gap-1.5 sm:grid-cols-2">
      {matches.slice(0, 5).map((meeting) => (
        <div key={`${meeting.date}-${meeting.score}-${meeting.homeTeam}`} className={`grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 px-2 py-1.5 text-xs ${isDarkTheme ? 'bg-[#252525] text-slate-200' : 'bg-[#f2f1ed] text-slate-700'}`}>
          <span className="text-slate-400">{meeting.date}</span>
          <span className="flex min-w-0 items-center gap-1.5 truncate font-bold">
            <span title="Historical home team" className={`shrink-0 text-[9px] font-black uppercase ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>H</span>
            <span className={`truncate ${meeting.winner === 'home' ? 'font-bold text-emerald-600' : isDarkTheme ? 'font-bold text-slate-400' : 'font-bold text-slate-500'}`}>{meeting.homeTeam}</span>
            <span className={isDarkTheme ? 'text-slate-500' : 'text-slate-400'}>-</span>
            <span title="Historical away team" className={`shrink-0 text-[9px] font-black uppercase ${isDarkTheme ? 'text-slate-500' : 'text-slate-400'}`}>A</span>
            <span className={`truncate ${meeting.winner === 'away' ? 'font-bold text-emerald-600' : isDarkTheme ? 'font-bold text-slate-400' : 'font-bold text-slate-500'}`}>{meeting.awayTeam}</span>
          </span>
          <span className={`font-black ${meeting.winner === 'draw' ? 'text-slate-500' : 'text-emerald-600'}`}>{meeting.score} {meeting.winner === 'draw' ? 'X' : '✓'}</span>
        </div>
      ))}
    </div>
  </div>
);
