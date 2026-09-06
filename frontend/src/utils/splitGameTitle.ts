export function splitGameTitle(title: string): [string, string | undefined] {
  const [homeTeam, awayTeam] = title.split(/\s+[–-]\s+/).map((item) => item.trim());
  return [homeTeam || title, awayTeam || undefined];
}
