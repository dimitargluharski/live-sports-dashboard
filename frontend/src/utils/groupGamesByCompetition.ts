import type { Game } from '../types/game';
import { groupGamesByTournamentLabel } from './groupGamesByTournamentLabel';

export interface CompetitionGroup {
  label: string;
  games: Game[];
  hasTournamentStages: boolean;
}

function getCompetitionPriority(competition: CompetitionGroup): number {
  if (competition.label.trim().toLowerCase() === 'champions league') return 0;
  return competition.hasTournamentStages ? 1 : 2;
}

export function groupGamesByCompetition(games: Game[], isToday: boolean): CompetitionGroup[] {
  const gamesByCompetition = new Map<string, Game[]>();

  games.forEach((game) => {
    const label = game.leagueLabel || 'League TBD';
    const competitionGames = gamesByCompetition.get(label);
    if (competitionGames) {
      competitionGames.push(game);
    } else {
      gamesByCompetition.set(label, [game]);
    }
  });

  return [...gamesByCompetition.entries()]
    .map(([label, competitionGames]) => ({
      label,
      games: competitionGames,
      hasTournamentStages: isToday
        && groupGamesByTournamentLabel(competitionGames).some((segment) => segment.label),
    }))
    .sort((competitionA, competitionB) => {
      const priorityDifference = getCompetitionPriority(competitionA) - getCompetitionPriority(competitionB);
      return priorityDifference || competitionA.label.localeCompare(competitionB.label);
    });
}
