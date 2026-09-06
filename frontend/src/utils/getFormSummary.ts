import type { HeadToHead } from '../types/game';

export function getFormSummary(matches: NonNullable<HeadToHead['matches']>): { W: number; D: number; L: number } {
  return matches.reduce((summary, meeting) => {
    summary[meeting.result] += 1;
    return summary;
  }, { W: 0, D: 0, L: 0 });
}
