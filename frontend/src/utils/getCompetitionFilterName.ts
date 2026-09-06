export function getCompetitionFilterName(leagueLabel: string): string {
  const [groupName, ...competitionParts] = leagueLabel.split('.');
  const competitionName = competitionParts.join('.').trim();
  return /\bqualifications?\b/i.test(competitionName) ? groupName.trim() : competitionName || leagueLabel;
}
