export function splitGameTitle(title: string): [string, string | undefined] {
  const normalizedTitle = title.trim();
  const match = normalizedTitle.match(/^(.*?)(?:\s+(?:vs|–|-|—)\s+)(.*)$/i);

  if (!match) {
    return [normalizedTitle || 'Unknown match', undefined];
  }

  const [, homeTeam, awayTeam] = match;
  return [homeTeam.trim() || normalizedTitle, awayTeam.trim() || undefined];
}
