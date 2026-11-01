import { isQualificationLeague } from './isQualificationLeague';

const SPECIAL_TOURNAMENT_PATTERN = /champions league|europa|conference league|world cup|\beuro(pean)?\b|nations league|libertadores|sudamericana|\bafc\b|\bcaf\b|concacaf|\bofc\b|olympic|asian cup|africa cup|copa america|gold cup/i;

// International and continental competitions, as opposed to regular domestic leagues and cups.
export function isSpecialTournament(leagueLabel?: string): boolean {
  if (!leagueLabel) return false;
  return isQualificationLeague(leagueLabel) || SPECIAL_TOURNAMENT_PATTERN.test(leagueLabel);
}
