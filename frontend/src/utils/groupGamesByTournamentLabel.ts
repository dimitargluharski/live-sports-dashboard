import type { Game } from '../types/game';
import { isTournamentLabelGame } from './isTournamentLabelGame';

export interface GameSegment {
  label: Game | null;
  matches: Game[];
}

// Merges all matches under every occurrence of the same tournament-label row (e.g. "Europe Cup")
// into a single section, so repeated labels don't split one tournament into several groups.
export function groupGamesByTournamentLabel(games: Game[]): GameSegment[] {
  const orderedKeys: string[] = [];
  const segmentsByKey = new Map<string, GameSegment>();
  const leadingMatches: Game[] = [];
  let activeKey: string | null = null;

  for (const game of games) {
    if (isTournamentLabelGame(game)) {
      const key = game.title.trim().toLowerCase();
      if (!segmentsByKey.has(key)) {
        segmentsByKey.set(key, { label: game, matches: [] });
        orderedKeys.push(key);
      }
      activeKey = key;
      continue;
    }

    if (activeKey) {
      segmentsByKey.get(activeKey)!.matches.push(game);
    } else {
      leadingMatches.push(game);
    }
  }

  const segments: GameSegment[] = [];
  if (leadingMatches.length) segments.push({ label: null, matches: leadingMatches });
  orderedKeys.forEach((key) => segments.push(segmentsByKey.get(key)!));
  return segments;
}
