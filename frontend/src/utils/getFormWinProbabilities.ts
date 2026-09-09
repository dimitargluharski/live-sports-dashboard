import type { TeamForm } from '../types/game';

function getFormStrength(teamForm?: TeamForm): number | null {
  const matches = teamForm?.matches?.slice(0, 5) || [];
  if (matches.length === 0) return null;

  const points = matches.reduce((total, match) => total + (match.result === 'W' ? 3 : match.result === 'D' ? 1 : 0), 0);
  const goalDifference = matches.reduce((total, match) => {
    const [scored, conceded] = match.score.split(':').map(Number);
    return total + ((scored || 0) - (conceded || 0));
  }, 0);
  const pointsRate = points / (matches.length * 3);
  const goalDifferenceRate = Math.max(0, Math.min(1, (goalDifference / matches.length + 2) / 4));

  return pointsRate * 0.75 + goalDifferenceRate * 0.25;
}

export function getFormWinProbabilities(homeForm?: TeamForm, awayForm?: TeamForm): { home: number; away: number } {
  const homeStrength = getFormStrength(homeForm);
  const awayStrength = getFormStrength(awayForm);

  if (homeStrength === null && awayStrength === null) return { home: 50, away: 50 };

  const adjustedHome = (homeStrength ?? 0.5) + 0.04;
  const adjustedAway = awayStrength ?? 0.5;
  const totalStrength = adjustedHome + adjustedAway;
  const home = Math.round((adjustedHome / totalStrength) * 100);

  return { home, away: 100 - home };
}