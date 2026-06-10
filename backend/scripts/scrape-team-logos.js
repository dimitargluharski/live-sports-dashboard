const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { Agent, fetch } = require("undici");
const { markJobStarted, markJobSucceeded, markJobFailed } = require("./job-status-tracker");

function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf-8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnv();

const BASE_URL = (process.env.FEED_BASE_URL || "").trim().replace(/\/+$/, "");
if (!BASE_URL) {
  throw new Error("Missing required env: FEED_BASE_URL");
}
const INPUT_PATH = path.resolve(process.cwd(), process.env.FEED_INPUT_JSON || "./.cache/allSoccerGamesToday.raw.json");
const OUTPUT_PATH = path.resolve(process.cwd(), process.env.FEED_TEAM_LOGOS_OUTPUT || "./public/teamLogosByEvent.json");
const OUTPUT_ENRICHED_PATH = path.resolve(
  process.cwd(),
  process.env.FEED_ENRICHED_OUTPUT || "./public/allSoccerGamesToday.json",
);

const DEFAULT_TIMEOUT_MS = 45_000;
const ALLOW_INSECURE_TLS = process.env.FEED_INSECURE_TLS === "1";
const configuredMax = Number(process.env.FEED_TEAM_LOGOS_MAX || "");
const MAX_EVENTS = Number.isFinite(configuredMax) && configuredMax > 0 ? Math.floor(configuredMax) : null;

const insecureDispatcher = ALLOW_INSECURE_TLS
  ? new Agent({ connect: { rejectUnauthorized: false } })
  : null;
const fallbackInsecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
let preferInsecureTlsForRun = ALLOW_INSECURE_TLS;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const insecureHostRegex = new RegExp(
  process.env.FEED_INSECURE_HOST_REGEX || escapeRegExp(new URL(BASE_URL).hostname),
  "i",
);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSpace(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(input, base = BASE_URL) {
  if (!input || typeof input !== "string") return null;
  try {
    if (input.startsWith("//")) return `https:${input}`;
    return new URL(input, base).toString();
  } catch {
    return null;
  }
}

function splitTeamsFromTitle(title) {
  const normalized = normalizeSpace(title);
  const parts = normalized.split(/\s+[–-]\s+/).map((item) => normalizeSpace(item));
  if (parts.length >= 2) {
    return {
      home: parts[0] || null,
      away: parts[1] || null,
    };
  }

  return { home: null, away: null };
}

function parsePlayers(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean)
    .map((line) => line.replace(/^\d+\.?\s*/, "").replace(/\(G\)/g, "").trim())
    .filter(Boolean);
}

function parsePlayersFromNode($, node) {
  if (!node || !node.length) return [];
  const clone = node.clone();
  clone.find("br").replaceWith("\n");
  return parsePlayers(clone.text());
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const doFetch = (dispatcher) =>
      fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        dispatcher,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: `${BASE_URL}/`,
        },
        cache: "no-store",
      });

    const shouldUseInsecureFirst = preferInsecureTlsForRun && insecureHostRegex.test(url);
    const initialDispatcher = shouldUseInsecureFirst ? fallbackInsecureDispatcher : (insecureDispatcher || undefined);

    let res;
    try {
      res = await doFetch(initialDispatcher);
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      const shouldRetryInsecure =
        !preferInsecureTlsForRun &&
        code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" &&
        insecureHostRegex.test(url);

      if (!shouldRetryInsecure) {
        throw error;
      }

      preferInsecureTlsForRun = true;
      const failedHost = (() => {
        try {
          return new URL(url).host;
        } catch {
          return "unknown-host";
        }
      })();
      console.warn(`TLS verify failed for host ${failedHost}. Retrying with insecure TLS fallback and enabling insecure TLS for this run.`);
      res = await doFetch(fallbackInsecureDispatcher);
    }

    if (!res.ok) {
      throw new Error(`Request failed (${res.status}) for ${url}`);
    }

    return res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractEventDetails(eventHtml, eventUrl, match) {
  const $ = cheerio.load(eventHtml);
  const titleTeams = splitTeamsFromTitle(match.title);

  const logoNodes = $("a[href*='/team/'] img[itemprop='image'], table[align='center'] img[itemprop='image']").slice(0, 2);

  const firstLogo = logoNodes.eq(0);
  const secondLogo = logoNodes.eq(1);

  const homeTeam = normalizeSpace(firstLogo.attr("alt") || "") || titleTeams.home;
  const awayTeam = normalizeSpace(secondLogo.attr("alt") || "") || titleTeams.away;

  const homeLogoUrl = toAbsoluteUrl(firstLogo.attr("src") || null, eventUrl);
  const awayLogoUrl = toAbsoluteUrl(secondLogo.attr("src") || null, eventUrl);

  let lineupTable = $("span.graydesc b")
    .filter((_, el) => /starting\s+lineup/i.test($(el).text()))
    .first()
    .closest("table");

  if (!lineupTable.length) {
    lineupTable = $("table")
      .filter((_, table) => /starting\s+lineup/i.test($(table).text()))
      .first();
  }

  let startingHome = [];
  let startingAway = [];
  let substitutesHome = [];
  let substitutesAway = [];

  if (lineupTable.length) {
    const rows = lineupTable.find("tr");
    const startIndex = rows
      .toArray()
      .findIndex((row) => /starting\s+lineup/i.test($(row).text()));

    if (startIndex >= 0) {
      const playerRow = rows.eq(startIndex + 1);
      const playerCells = playerRow.find("td.small[valign='top'], td.small");
      startingHome = parsePlayersFromNode($, playerCells.eq(0));
      startingAway = parsePlayersFromNode($, playerCells.eq(1));
    }

    substitutesHome = parsePlayersFromNode($, $("#subplayers2"));
    substitutesAway = parsePlayersFromNode($, $("#subplayers3"));
  }

  return {
    matchId: match.id,
    matchTitle: match.title,
    eventUrl: match.eventUrl,
    homeTeam,
    awayTeam,
    homeLogoUrl,
    awayLogoUrl,
    logosFound: Boolean(homeLogoUrl || awayLogoUrl),
    lineups: {
      starting: {
        home: startingHome,
        away: startingAway,
      },
      substitutes: {
        home: substitutesHome,
        away: substitutesAway,
      },
    },
  };
}

function readMatches() {
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`);
  }

  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  const matches = Array.isArray(parsed?.matches) ? parsed.matches : [];

  return { payload: parsed, matches };
}

async function scrapeTeamLogos() {
  const startedAt = Date.now();
  markJobStarted("team-logos");

  if (ALLOW_INSECURE_TLS) {
    console.warn("FEED_INSECURE_TLS=1 is enabled. TLS certificate validation is disabled for this run.");
  }

  const { payload, matches } = readMatches();
  const scopedMatches = MAX_EVENTS === null ? matches : matches.slice(0, MAX_EVENTS);

  const results = [];

  for (let i = 0; i < scopedMatches.length; i += 1) {
    const match = scopedMatches[i];

    const preloadedHome = match?.teams?.home;
    const preloadedAway = match?.teams?.away;
    const hasPreloadedTeams = Boolean(
      preloadedHome ||
      preloadedAway ||
      preloadedHome?.logoUrl ||
      preloadedAway?.logoUrl ||
      preloadedHome?.name ||
      preloadedAway?.name,
    );

    if (hasPreloadedTeams) {
      const details = {
        matchId: match?.id || i + 1,
        matchTitle: match?.title || "Unknown",
        eventUrl: match?.eventUrl || null,
        homeTeam: preloadedHome?.name || null,
        awayTeam: preloadedAway?.name || null,
        homeLogoUrl: preloadedHome?.logoUrl || null,
        awayLogoUrl: preloadedAway?.logoUrl || null,
        logosFound: Boolean(preloadedHome?.logoUrl || preloadedAway?.logoUrl),
        lineups: {
          starting: {
            home: Array.isArray(preloadedHome?.startingLineup) ? preloadedHome.startingLineup : [],
            away: Array.isArray(preloadedAway?.startingLineup) ? preloadedAway.startingLineup : [],
          },
          substitutes: {
            home: Array.isArray(preloadedHome?.substitutes) ? preloadedHome.substitutes : [],
            away: Array.isArray(preloadedAway?.substitutes) ? preloadedAway.substitutes : [],
          },
        },
      };

      results.push(details);
      console.log(
        `[${i + 1}/${scopedMatches.length}] ${match.title} -> logos: ${details.logosFound ? "yes" : "no"} (preloaded)`,
      );
      continue;
    }

    if (!match?.eventUrl) {
      results.push({
        matchId: match?.id || i + 1,
        matchTitle: match?.title || "Unknown",
        eventUrl: null,
        homeTeam: null,
        awayTeam: null,
        homeLogoUrl: null,
        awayLogoUrl: null,
        logosFound: false,
        lineups: {
          starting: { home: [], away: [] },
          substitutes: { home: [], away: [] },
        },
        error: "Missing eventUrl",
      });
      continue;
    }

    try {
      const eventHtml = await fetchHtml(match.eventUrl);
      const details = extractEventDetails(eventHtml, match.eventUrl, match);
      results.push(details);
      console.log(
        `[${i + 1}/${scopedMatches.length}] ${match.title} -> logos: ${details.logosFound ? "yes" : "no"}`,
      );
    } catch (error) {
      results.push({
        matchId: match.id,
        matchTitle: match.title,
        eventUrl: match.eventUrl,
        homeTeam: null,
        awayTeam: null,
        homeLogoUrl: null,
        awayLogoUrl: null,
        logosFound: false,
        lineups: {
          starting: { home: [], away: [] },
          substitutes: { home: [], away: [] },
        },
        error: error instanceof Error ? error.message : "Unknown event scrape error",
      });
      console.warn(`[${i + 1}/${scopedMatches.length}] Failed: ${match.title}`);
    }

    await wait(200);
  }

  const byEventUrl = Object.fromEntries(results.filter((item) => item.eventUrl).map((item) => [item.eventUrl, item]));
  const enrichedMatches = matches.map((match) => {
    const extra = byEventUrl[match.eventUrl];
    if (!extra) return match;

    return {
      ...match,
      teams: {
        home: {
          name: extra.homeTeam,
          logoUrl: extra.homeLogoUrl,
          startingLineup: extra.lineups?.starting?.home || [],
          substitutes: extra.lineups?.substitutes?.home || [],
        },
        away: {
          name: extra.awayTeam,
          logoUrl: extra.awayLogoUrl,
          startingLineup: extra.lineups?.starting?.away || [],
          substitutes: extra.lineups?.substitutes?.away || [],
        },
      },
    };
  });

  const logosPayload = {
    sourceFile: INPUT_PATH,
    scrapedAt: new Date().toISOString(),
    count: results.length,
    items: results.map((item) => {
      const { eventUrl, error, ...restItem } = item;
      const scrubbedError = typeof error === "string" ? error.replace(/https?:\/\/\S+/g, "[redacted-url]") : error;
      return {
        ...restItem,
        ...(scrubbedError ? { error: scrubbedError } : {}),
      };
    }),
  };

  const sanitizedMatches = enrichedMatches.map((match) => {
    const { eventUrl, ...restMatch } = match;
    const streams = Array.isArray(restMatch.streams)
      ? restMatch.streams.map((stream) => {
          const { sourceUrl, ...restStream } = stream;
          return restStream;
        })
      : [];

    return {
      ...restMatch,
      streams,
      streamCount: Number.isFinite(restMatch.streamCount) ? restMatch.streamCount : streams.length,
    };
  });

  const { source, footballPageUrl, ...publicPayload } = payload;
  const enrichedPayload = {
    ...publicPayload,
    enrichedAt: new Date().toISOString(),
    matches: sanitizedMatches,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(logosPayload, null, 2), "utf-8");
  fs.writeFileSync(OUTPUT_ENRICHED_PATH, JSON.stringify(enrichedPayload, null, 2), "utf-8");

  const durationMs = Date.now() - startedAt;
  const foundCount = results.filter((item) => item.logosFound).length;
  markJobSucceeded("team-logos", results.length, {
    durationMs,
    foundCount,
    outputPath: OUTPUT_PATH,
    enrichedOutputPath: OUTPUT_ENRICHED_PATH,
  });

  console.log(`Saved logos payload: ${OUTPUT_PATH}`);
  console.log(`Saved enriched matches payload: ${OUTPUT_ENRICHED_PATH}`);
  console.log(`Logo hits: ${foundCount}/${results.length}`);
}

scrapeTeamLogos().catch((error) => {
  markJobFailed("team-logos", error instanceof Error ? error.message : "Unknown error");
  console.error("Team-logo scraper failed:", error);
  process.exit(1);
});
