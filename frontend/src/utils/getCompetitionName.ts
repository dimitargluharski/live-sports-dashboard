import { extractCountryFromLeague } from './extractCountryFromLeague';

export function getCompetitionName(leagueLabel: string, isQualification = false): string {
  const country = extractCountryFromLeague(leagueLabel);
  const name = country && leagueLabel.toLowerCase().startsWith(`${country.toLowerCase()}.`)
    ? leagueLabel.slice(country.length + 1).trim()
    : leagueLabel.trim();

  return isQualification
    ? name.replace(/[\s,·–-]*qualifications?$/i, '').trim()
    : name;
}
