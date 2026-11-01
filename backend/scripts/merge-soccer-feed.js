// Merges the schedule/streams feed (allSoccerGamesToday.json) with the live results feed
// (liveScores.json) into one file: public/soccer/matches.json.
// Output: matches.json, schedule matches (with score/liveStatus when a live result pairs) plus live-only matches.
//  - every match gets a stable `matchId`
// Pairing is by normalized team names; ambiguous pairs are resolved by league, otherwise left unpaired.
// Usage: node scripts/merge-soccer-feed.js

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const BACKEND_PUBLIC = path.join(__dirname, "..", "public", "soccer");
const FRONTEND_PUBLIC = path.join(__dirname, "..", "..", "frontend", "public", "soccer");
const GAMES_PATH = path.join(BACKEND_PUBLIC, "allSoccerGamesToday.json");
const LIVE_PATH = path.join(BACKEND_PUBLIC, "liveScores.json");
const OUTPUT_NAME = "matches.json";

const TOKEN_ALIASES = { utd: "united", st: "saint", intl: "international", man: "manchester" };
const IGNORED_TOKENS = new Set(["fc", "cf", "sc", "afc", "fk", "the"]);

function normalizeTeamName(name) {
  const tokens = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token && !IGNORED_TOKENS.has(token))
    .map((token) => TOKEN_ALIASES[token] || token);
  return tokens.join("");
}

function namesMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 5 && long.includes(short);
}

function pairKey(home, away) {
  return [normalizeTeamName(home), normalizeTeamName(away)].sort().join("|");
}

function normalizeLeague(value) {
  return normalizeTeamName(String(value || "").replace(/\./g, " "));
}

function makeMatchId(dateKey, home, away) {
  const raw = `${dateKey}|${pairKey(home, away)}`;
  return crypto.createHash("sha1").update(raw).digest("hex").slice(0, 12);
}

function gameTeams(game) {
  const home = game.teams?.home?.name;
  const away = game.teams?.away?.name;
  if (home && away) return [home, away];
  const parts = String(game.title || "").split(/\s+[–-]\s+|\s+vs\.?\s+/i);
  return parts.length === 2 ? parts : [null, null];
}

function leagueCompatible(game, live) {
  const gameLeague = normalizeLeague(game.leagueLabel);
  const liveLeague = normalizeLeague(live.league);
  return Boolean(gameLeague && liveLeague && gameLeague.includes(liveLeague));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return fallback;
  }
}

function findGame(live, games) {
  const homeKey = normalizeTeamName(live.homeTeam);
  const awayKey = normalizeTeamName(live.awayTeam);

  const candidates = games.filter(({ home, away }) => (
    (namesMatch(home, homeKey) && namesMatch(away, awayKey))
    || (namesMatch(home, awayKey) && namesMatch(away, homeKey))
  ));
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const byLeague = candidates.filter(({ game }) => leagueCompatible(game, live));
    if (byLeague.length === 1) return byLeague[0];
  }
  return null;
}

function main() {
  const payload = readJson(GAMES_PATH, null);
  if (!payload || !Array.isArray(payload.matches)) {
    throw new Error(`Missing or invalid schedule feed: ${GAMES_PATH}`);
  }
  const liveScores = readJson(LIVE_PATH, []);

  const indexed = payload.matches.map((game) => {
    const [homeName, awayName] = gameTeams(game);
    return { game, home: normalizeTeamName(homeName), away: normalizeTeamName(awayName), homeName, awayName };
  });

  const pairedGameIds = new Set();
  const mergedLive = (Array.isArray(liveScores) ? liveScores : []).map((live) => {
    const found = findGame(live, indexed);
    // A schedule match can only be paired once, so a rematch on the same day never steals another's result.
    const entry = found && !pairedGameIds.has(found.game.id) ? found : null;
    if (entry) pairedGameIds.add(entry.game.id);
    return { live, entry };
  });

  const liveByGameId = new Map(mergedLive.filter(({ entry }) => entry).map(({ live, entry }) => [entry.game.id, live]));

  const matches = indexed.map(({ game, homeName, awayName }) => {
    const live = liveByGameId.get(game.id);
    const matchId = makeMatchId(game.dateLabel || "", homeName, awayName);
    return live
      ? { ...game, matchId, score: live.score, liveStatus: live.status }
      : { ...game, matchId };
  });

  // Live results with no schedule match become stream-less matches so every result is listed.
  const dateLabel = payload.matches.find((game) => game.dateLabel)?.dateLabel;
  let nextId = payload.matches.reduce((max, game) => Math.max(max, Number(game.id) || 0), 0) + 1;
  for (const { live, entry } of mergedLive) {
    if (entry) continue;
    matches.push({
      id: nextId++,
      matchId: makeMatchId(dateLabel || "", live.homeTeam, live.awayTeam),
      title: `${live.homeTeam} – ${live.awayTeam}`,
      dateLabel,
      timeLabel: live.time,
      leagueLabel: live.country ? `${live.country}. ${live.league}` : live.league,
      isLive: live.status === "live",
      streams: [],
      streamCount: 0,
      teams: {
        home: { name: live.homeTeam, logoUrl: live.homeLogo || null },
        away: { name: live.awayTeam, logoUrl: live.awayLogo || null },
      },
      score: live.score,
      liveStatus: live.status,
    });
  }

  const output = {
    ...payload,
    mergedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };

  const json = JSON.stringify(output, null, 2);
  for (const dir of [BACKEND_PUBLIC, FRONTEND_PUBLIC]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, OUTPUT_NAME), json, "utf-8");
  }
  console.log(
    `Merged ${matches.length} matches (${pairedGameIds.size} paired with live results, ${matches.length - indexed.length} live-only) -> ${OUTPUT_NAME}`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

module.exports = { normalizeTeamName, namesMatch, findGame, makeMatchId };
