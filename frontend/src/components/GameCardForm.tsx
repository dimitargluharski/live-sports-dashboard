import React from 'react';
import type { TeamForm } from '../types/game';
import { TeamVisual } from './TeamVisual';

interface GameCardFormProps {
  homeTeam: string;
  awayTeam: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  flagUrl?: string | null;
  homeForm?: TeamForm;
  awayForm?: TeamForm;
  insights: string[];
  isEnded: boolean;
  isDarkTheme: boolean;
}

function highlightTeamNames(insight: string, teamNames: string[]): React.ReactNode {
  if (teamNames.length === 0) return insight;

  const teamPattern = new RegExp(`(${teamNames.map((team) => team.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})`, 'g');
  return insight.split(teamPattern).map((part, index) => (
    teamNames.includes(part)
      ? <strong key={`${part}-${index}`} className="font-extrabold">{part}</strong>
      : part
  ));
}

export const GameCardForm: React.FC<GameCardFormProps> = ({
  homeTeam,
  awayTeam,
  homeLogoUrl,
  awayLogoUrl,
  flagUrl,
  homeForm,
  awayForm,
  insights,
  isEnded,
  isDarkTheme,
}) => {
  const teams = [[homeTeam, homeForm, homeLogoUrl], [awayTeam, awayForm, awayLogoUrl]] as Array<[string | null, TeamForm | undefined, string | null | undefined]>;
  const teamNames = [homeTeam, awayTeam].filter(Boolean) as string[];

  return (
    <div>
      <div className={`mb-4 grid gap-2 rounded-md border-l-2 px-3 py-2 ${isDarkTheme ? 'border-amber-400 bg-amber-400/10' : 'border-amber-500 bg-amber-50'}`}>
        {insights.map((insight) => <p key={insight} className={`text-xs leading-relaxed ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>{highlightTeamNames(insight, teamNames)}</p>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {teams.map(([team, teamForm, logoUrl]) => team && teamForm ? (
          <div key={team} className={`rounded-md border p-3 shadow-sm ${isDarkTheme ? 'border-white/10 bg-[#252525]' : 'border-black/10 bg-white'}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TeamVisual teamName={team} logoUrl={logoUrl} flagUrl={flagUrl} isEnded={isEnded} isDarkTheme={isDarkTheme} />
                <h4 className={`truncate text-base font-extrabold ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>{team}</h4>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Last 5</span>
            </div>
            <div className="mb-3 flex gap-1.5">
              {(['W', 'D', 'L'] as const).map((result) => <span key={result} className={`rounded-sm px-2 py-1 text-[10px] font-black ${result === 'W' ? 'bg-emerald-100 text-emerald-700' : result === 'L' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{result} {teamForm.summary?.[result] || 0}</span>)}
            </div>
            <div className="flex items-center gap-1.5">
              {teamForm.matches?.slice(0, 5).map((formMatch) => <span key={`${formMatch.date}-${formMatch.opponent}`} title={`${formMatch.date}: ${formMatch.opponent} ${formMatch.score}`} className={`inline-flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-black ${formMatch.result === 'W' ? 'bg-emerald-500 text-white' : formMatch.result === 'L' ? 'bg-rose-500 text-white' : 'bg-slate-300 text-slate-700'}`}>{formMatch.result}</span>)}
            </div>
          </div>
        ) : null)}
      </div>
    </div>
  );
};
