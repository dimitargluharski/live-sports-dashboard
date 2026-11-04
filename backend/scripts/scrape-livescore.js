// Learning scraper: fetches the livescore page and saves only
// league (country, flag), time, status, home/away team names and the score.
// Usage: node scripts/scrape-livescore.js [url]

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { fetch } = require("undici");
const { stampStartsAt } = require("./lib/start-times");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    if (!(key in process.env)) process.env[key] = line.slice(idx + 1).trim();
  }
}

loadDotEnv();

const URL_TO_SCRAPE = process.argv[2] || (process.env.FEED_LIVESCORE_URL || "").trim();
if (!URL_TO_SCRAPE) {
  throw new Error("Missing FEED_LIVESCORE_URL in .env (or pass a URL as argument)");
}
const OUTPUT_PATH = path.join(__dirname, "..", "public", "soccer", "liveScores.json");
const FRONTEND_OUTPUT_PATH = path.join(__dirname, "..", "..", "frontend", "public", "soccer", "liveScores.json");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const FRONTEND_PUBLIC_DIR = path.join(__dirname, "..", "..", "frontend", "public");

const decode = (s) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

// Source flag images are named by country code (e.g. .../national/kr.gif); use a neutral flag CDN instead.
function flagUrl(src) {
  const code = (src.match(/\/([a-z-]+)\.gif/i) || [])[1];
  return code ? `https://flagcdn.com/w40/${code.toLowerCase()}.png` : "";
}

// Logos are stored as a path relative to the image host (the frontend adds the base URL via VITE_TEAM_LOGO_BASE_URL).
function logoPath(src) {
  return (src.match(/\/img\/(teams\/[^"'\s>]+)/i) || [])[1] || "";
}

function parseMatches(html) {
  const matches = [];
  // The page has malformed markup (e.g. `width=50<tr`), so regex is more reliable than a DOM parser.
  // One pattern matches both league header rows and match rows, so rows inherit the last seen header.
  const tokenRegex = new RegExp(
    [
      /<font color="#ffffff"><b>(Football|Ice Hockey|Basketball|Tennis|Volleyball|Handball)<\/b><\/font>/.source,
      /<img src="?([^">\s]*\/national\/[^">\s]*)"?>\s*(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>\s*<b>([^<]*)<\/b>/.source,
      // Sections without a country flag (tennis, basketball, ...) use an empty or icon-only first cell.
      /<td width=40[^>]*>(?![^<]*<img[^>]*\/national\/)[^<]*(?:<img[^>]*>[^<]*)?<\/td>\s*<td colspan=\d+[^>]*>\s*<b>([^<]*)<\/b>/.source,
      /<span class="date">([^<]*)<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>\s*<img[^>]*?src="?([^">\s]*)"?[^>]*>[\s\S]*?<b>([^<]*)<\/b>\s*<\/td>\s*<td[^>]*>\s*<img[^>]*?src="?([^">\s]*)"?[^>]*>\s*<\/td>\s*<td>\s*<a[^>]*>([\s\S]*?)<\/a>/.source,
    ].join("|"),
    "gi"
  );

  let league = { country: "", league: "", flag: "" };
  let sport = "";
  let m;
  while ((m = tokenRegex.exec(html)) !== null) {
    if (m[1] !== undefined) {
      sport = m[1];
      league = { country: "", league: "", flag: "" };
      continue;
    }

    if (m[2] !== undefined || m[4] !== undefined) {
      const title = decode(m[2] !== undefined ? m[3] : m[4]);
      const sep = title.indexOf(". ");
      league = {
        country: sep === -1 ? "" : title.slice(0, sep),
        league: sep === -1 ? title : title.slice(sep + 2),
        flag: m[2] !== undefined ? flagUrl(m[2]) : "",
      };
      continue;
    }

    const [, , , , , time, statusCell, home, homeLogo, score, awayLogo, away] = m;
    matches.push({
      sport,
      country: league.country,
      flag: league.flag,
      league: league.league,
      time: decode(time),
      status: /live\.gif/i.test(statusCell) ? "live" : "finished",
      homeTeam: decode(home),
      homeLogo: logoPath(homeLogo),
      awayTeam: decode(away),
      awayLogo: logoPath(awayLogo),
      score: decode(score),
    });
  }
  return matches;
}

// The page lists several sports in the same markup. Football feeds the soccer merge; every other sport
// gets its own feed in the same shape as matches.json so the frontend can reuse its game pipeline.
const OTHER_SPORT_FOLDERS = {
  "Ice Hockey": "hockey",
  Basketball: "basketball",
  Tennis: "tennis",
  Volleyball: "volleyball",
  Handball: "handball",
};

// The source publishes dates in UTC+1, e.g. "4 November".
function sourceDateLabel(now) {
  const local = new Date(now.getTime() + 60 * 60 * 1000);
  const month = local.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `${local.getUTCDate()} ${month}`;
}

function toFeedMatch(row, index, dateLabel) {
  const title = `${row.homeTeam} – ${row.awayTeam}`;
  return {
    id: index + 1,
    matchId: crypto.createHash("sha1").update(`${row.sport}|${dateLabel}|${row.league}|${title}|${row.time}`).digest("hex").slice(0, 12),
    title,
    dateLabel,
    timeLabel: row.time,
    leagueLabel: row.country ? `${row.country}. ${row.league}` : row.league,
    isLive: row.status === "live",
    streams: [],
    streamCount: 0,
    teams: {
      home: { name: row.homeTeam, logoUrl: row.homeLogo || null },
      away: { name: row.awayTeam, logoUrl: row.awayLogo || null },
    },
    score: row.score,
    liveStatus: row.status,
  };
}

function writeJson(relativeDirs, fileName, data) {
  const json = JSON.stringify(data, null, 2);
  for (const dir of relativeDirs) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, fileName), json, "utf-8");
  }
}

async function main() {
  const res = await fetch(URL_TO_SCRAPE, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = parseMatches(await res.text());

  const football = rows.filter((row) => row.sport === "Football");
  writeJson(
    [path.dirname(OUTPUT_PATH), path.dirname(FRONTEND_OUTPUT_PATH)],
    path.basename(OUTPUT_PATH),
    football,
  );
  console.log(`Saved ${football.length} football matches to ${OUTPUT_PATH}`);

  const now = new Date();
  const dateLabel = sourceDateLabel(now);
  for (const [sportName, folder] of Object.entries(OTHER_SPORT_FOLDERS)) {
    const matches = stampStartsAt(
      rows.filter((row) => row.sport === sportName).map((row, index) => toFeedMatch(row, index, dateLabel)),
      now.toISOString(),
    );
    const payload = { section: sportName, scrapedAt: now.toISOString(), count: matches.length, matches };
    writeJson(
      [path.join(PUBLIC_DIR, folder), path.join(FRONTEND_PUBLIC_DIR, folder)],
      "liveMatches.json",
      payload,
    );
    console.log(`Saved ${matches.length} ${sportName} matches to ${folder}/liveMatches.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
