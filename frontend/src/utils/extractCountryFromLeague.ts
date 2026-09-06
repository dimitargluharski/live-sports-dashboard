export function extractCountryFromLeague(leagueLabel?: string): string | null {
  if (!leagueLabel) return null;
  const firstToken = leagueLabel.split('.')[0]?.trim();
  return firstToken || null;
}
