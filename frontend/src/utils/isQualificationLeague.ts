export function isQualificationLeague(leagueLabel: string): boolean {
  return /\bqualifications?\b/i.test(leagueLabel);
}
