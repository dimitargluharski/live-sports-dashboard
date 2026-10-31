// Learning scraper: fetches the livescore page and saves only
// league (country, flag), time, status, home/away team names and the score.
// Usage: node scripts/scrape-livescore.js [url]

const fs = require("fs");
const path = require("path");
const { fetch } = require("undici");

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
      /<img src="?([^">\s]*\/national\/[^">\s]*)"?>\s*(?:&nbsp;)?\s*<\/td>\s*<td[^>]*>\s*<b>([^<]*)<\/b>/.source,
      /<span class="date">([^<]*)<\/span>\s*<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/td>\s*<td[^>]*>\s*<img[^>]*?src="?([^">\s]*)"?[^>]*>[\s\S]*?<b>([^<]*)<\/b>\s*<\/td>\s*<td[^>]*>\s*<img[^>]*?src="?([^">\s]*)"?[^>]*>\s*<\/td>\s*<td>\s*<a[^>]*>([\s\S]*?)<\/a>/.source,
    ].join("|"),
    "gi"
  );

  let league = { country: "", league: "", flag: "" };
  let m;
  while ((m = tokenRegex.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const title = decode(m[2]);
      const sep = title.indexOf(". ");
      league = {
        country: sep === -1 ? "" : title.slice(0, sep),
        league: sep === -1 ? title : title.slice(sep + 2),
        flag: flagUrl(m[1]),
      };
      continue;
    }

    const [, , , time, statusCell, home, homeLogo, score, awayLogo, away] = m;
    matches.push({
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

async function main() {
  const res = await fetch(URL_TO_SCRAPE, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const matches = parseMatches(await res.text());

  const json = JSON.stringify(matches, null, 2);
  for (const target of [OUTPUT_PATH, FRONTEND_OUTPUT_PATH]) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json, "utf-8");
  }
  console.log(`Saved ${matches.length} matches to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
