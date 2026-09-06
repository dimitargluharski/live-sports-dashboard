import type { TeamForm } from '../types/game';

export function getFormInsight(team: string, teamForm?: TeamForm): string | null {
  const matches = (teamForm?.matches || []).slice(0, 5);
  const results = matches.map((match) => match.result);
  if (matches.length === 0) return null;

  const wins = results.filter((result) => result === 'W').length;
  const draws = results.filter((result) => result === 'D').length;
  const losses = results.filter((result) => result === 'L').length;
  const goalsFor = matches.reduce((total, match) => total + Number(match.score.split(':')[0] || 0), 0);
  const goalsAgainst = matches.reduce((total, match) => total + Number(match.score.split(':')[1] || 0), 0);
  const latest = matches[0];
  const [latestFor, latestAgainst] = latest.score.split(':').map(Number);
  const scoredMatches = matches.map((match) => {
    const [scored, conceded] = match.score.split(':').map(Number);
    return { ...match, scored, conceded, difference: scored - conceded };
  });
  const biggestWin = scoredMatches
    .filter((match) => match.result === 'W')
    .sort((left, right) => right.difference - left.difference || right.scored - left.scored)[0];
  const biggestLoss = scoredMatches
    .filter((match) => match.result === 'L')
    .sort((left, right) => left.difference - right.difference || right.conceded - left.conceded)[0];
  const cleanSheets = scoredMatches.filter((match) => match.conceded === 0).slice(0, 3);
  const highConcedingMatches = scoredMatches.filter((match) => match.conceded >= 3).slice(0, 3);

  let streak = 1;
  while (streak < results.length && results[streak] === results[0]) streak += 1;
  const unbeaten = results.findIndex((result) => result === 'L');
  const unbeatenCount = unbeaten === -1 ? results.length : unbeaten;
  const sentences = [`${team} has recorded ${wins} wins, ${draws} draws and ${losses} losses in the last ${matches.length} matches, scoring ${goalsFor} and conceding ${goalsAgainst}.`];

  if (results[0] === 'W' && streak >= 2) sentences.push(`${team} is currently on a ${streak}-match winning run.`);
  if (results[0] === 'L' && streak >= 2) sentences.push(`${team} has lost the last ${streak} matches and will be looking to stop that run.`);
  if (unbeatenCount >= 3 && results[0] !== 'W') sentences.push(`${team} is unbeaten in ${unbeatenCount} consecutive matches.`);

  sentences.push(`The latest result was a ${latestFor}:${latestAgainst} ${latest.result === 'W' ? 'win' : latest.result === 'D' ? 'draw' : 'loss'} against ${latest.opponent}.`);

  if (biggestWin) sentences.push(`The biggest win in this run was ${biggestWin.scored}:${biggestWin.conceded} against ${biggestWin.opponent}.`);
  if (cleanSheets.length > 0) sentences.push(`Clean sheets came against ${cleanSheets.map((match) => `${match.opponent} (${match.scored}:${match.conceded})`).join(', ')}.`);
  if (highConcedingMatches.length > 0) {
    sentences.push(`The team conceded 3 or more goals against ${highConcedingMatches.map((match) => `${match.opponent} (${match.scored}:${match.conceded})`).join(', ')}.`);
  } else if (biggestLoss) {
    sentences.push(`The heaviest defeat was ${biggestLoss.scored}:${biggestLoss.conceded} against ${biggestLoss.opponent}.`);
  }

  return sentences.join(' ');
}
