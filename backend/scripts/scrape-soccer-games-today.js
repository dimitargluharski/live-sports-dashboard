// Day sections scraper (excluding Top Matches Today)
// Flow:
// 1) Open homepage and resolve football listing URL.
// 2) Parse day sections from main matches column, skipping Top Matches Today block.
// 3) Resolve stream links from each event page.

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
const HOME_PATH = process.env.FEED_HOME_PATH || "/";
const EVENT_PATH_SEGMENT = process.env.FEED_EVENT_PATH_SEGMENT || "/eventinfo/";
if (!BASE_URL) {
  throw new Error("Missing required env: FEED_BASE_URL");
}
const HOME_URL = new URL(HOME_PATH, `${BASE_URL}/`).toString();
const OUTPUT_PATH = path.join(__dirname, "../.cache/allSoccerGamesToday.raw.json");
const OUTPUT_LOGOS_PATH = path.resolve(
  process.cwd(),
  process.env.FEED_TEAM_LOGOS_OUTPUT || "./public/teamLogosByEvent.json",
);
const OUTPUT_ENRICHED_PATH = path.resolve(
  process.cwd(),
  process.env.FEED_ENRICHED_OUTPUT || "./public/allSoccerGamesToday.json",
);

const DEFAULT_TIMEOUT_MS = 45_000;
const configuredMaxDays = Number(process.env.FEED_DAYS_MAX || "");
const MAX_DAY_EVENTS = Number.isFinite(configuredMaxDays) && configuredMaxDays > 0
  ? Math.floor(configuredMaxDays)
  : null;
const DAYS_WINDOW = Number(process.env.FEED_DAYS_WINDOW || "2");
const ALLOW_INSECURE_TLS = process.env.FEED_INSECURE_TLS === "1";

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

function normalizeMultiline(text) {
  return (text || "")
    .split("\n")
    .map((line) => normalizeSpace(line))
    .filter(Boolean)
    .join("\n");
}

function toAbsoluteUrl(input, base = BASE_URL) {
  if (!input || typeof input !== "string") return null;
  try {
    if (input.startsWith("//")) {
      return `https:${input}`;
    }
    return new URL(input, base).toString();
  } catch {
    return null;
  }
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
          Referer: HOME_URL,
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

async function resolveEmbeddedPlayerUrl(playerUrl) {
  if (!/webplayer(?:2)?\.php/i.test(playerUrl)) {
    return playerUrl;
  }

  try {
    const html = await fetchHtml(playerUrl);
    const $ = cheerio.load(html);

    const iframeSrc = $("#playerblock iframe[src]")
      .map((_, iframe) => toAbsoluteUrl($(iframe).attr("src") || null, playerUrl))
      .get()
      .find((src) => src && !/ads\.|getbanner\.php/i.test(src));

    if (iframeSrc) {
      return iframeSrc;
    }

    const htmlMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (htmlMatch?.[1]) {
      const resolved = toAbsoluteUrl(htmlMatch[1], playerUrl);
      if (resolved && !/ads\.|getbanner\.php/i.test(resolved)) {
        return resolved;
      }
    }

    return playerUrl;
  } catch {
    return playerUrl;
  }
}

function findFootballPageUrl(homeHtml) {
  const $ = cheerio.load(homeHtml);

  let href = null;
  $("img").each((_, img) => {
    if (href) return;

    const title = ($(img).attr("title") || "").toLowerCase();
    const alt = ($(img).attr("alt") || "").toLowerCase();
    const id = ($(img).attr("id") || "").toLowerCase();

    const isFootball = title.includes("football") || alt.includes("football") || id === "s1";
    if (!isFootball) return;

    const anchorHref = $(img).closest("a").attr("href");
    if (anchorHref) {
      href = anchorHref;
    }
  });

  return toAbsoluteUrl(href, HOME_URL);
}

function normalizeDateLabel(value) {
  const cleaned = normalizeSpace(value).replace(/^[,\-\s]+|[,\-\s]+$/g, "");
  const match = cleaned.match(/^(\d{1,2})\s+([a-z]{3,12})(?:\s*,\s*[a-z]+)?$/i);
  if (!match) return null;

  const day = match[1];
  const monthRaw = match[2];
  const month = `${monthRaw[0].toUpperCase()}${monthRaw.slice(1).toLowerCase()}`;
  return `${day} ${month}`;
}

function parseDateLabelToDate(label) {
  const normalized = normalizeDateLabel(label);
  if (!normalized) return null;

  const date = new Date(`${normalized} ${new Date().getFullYear()}`);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  return date;
}

function isWithinDaysWindow(label) {
  const parsed = parseDateLabelToDate(label);
  if (!parsed) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = Math.floor((parsed.getTime() - today.getTime()) / 86_400_000);
  return diff >= 0 && diff < Math.max(DAYS_WINDOW, 1);
}

function parseDateAndLeague(descriptionText) {
  const parts = descriptionText
    .split("\n")
    .map((item) => normalizeSpace(item))
    .filter(Boolean);

  const dateWithTimeLine = parts.find((line) => /\d{1,2}\s+[a-z]{3,9}\s+at\s+\d{1,2}:\d{2}/i.test(line)) || null;
  const timeLine = parts.find((line) => /^\d{1,2}:\d{2}(\s*\(.+\))?$/i.test(line)) || null;
  const leagueLine = parts.find((line) => /^\(.+\)$/.test(line) || /\(.+\)$/.test(line)) || null;

  const dateWithTimeMatch = dateWithTimeLine
    ? dateWithTimeLine.match(/(\d{1,2}\s+[a-z]{3,9})\s+at\s+(\d{1,2}:\d{2})/i)
    : null;

  const dateLabel = dateWithTimeMatch
    ? `${dateWithTimeMatch[1].split(" ")[0]} ${dateWithTimeMatch[1].split(" ")[1][0].toUpperCase()}${dateWithTimeMatch[1]
      .split(" ")[1]
      .slice(1)
      .toLowerCase()}`
    : null;

  let timeLabel = null;
  if (dateWithTimeMatch) {
    timeLabel = dateWithTimeMatch[2];
  } else if (timeLine) {
    const m = timeLine.match(/\d{1,2}:\d{2}/);
    timeLabel = m ? m[0] : null;
  }

  let cleanedLeague = null;
  if (leagueLine) {
    const m = leagueLine.match(/\(([^)]+)\)/);
    cleanedLeague = m?.[1] || null;
  }

  return {
    dateLabel,
    timeLabel,
    leagueLabel: cleanedLeague,
  };
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
  return (rawText || "")
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

function extractTeamDetails(eventHtml, eventUrl, match) {
  const $ = cheerio.load(eventHtml);
  const titleTeams = splitTeamsFromTitle(match.title || "");

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

    const subIndex = rows
      .toArray()
      .findIndex((row) => /substitutes/i.test($(row).text()));

    if (startIndex >= 0) {
      const startingRow = rows.eq(startIndex + 1);
      const cells = startingRow.find("td");
      startingHome = parsePlayersFromNode($, cells.eq(0));
      startingAway = parsePlayersFromNode($, cells.eq(cells.length > 1 ? 1 : 0));
    }

    if (subIndex >= 0) {
      const subsRow = rows.eq(subIndex + 1);
      const cells = subsRow.find("td");
      substitutesHome = parsePlayersFromNode($, cells.eq(0));
      substitutesAway = parsePlayersFromNode($, cells.eq(cells.length > 1 ? 1 : 0));
    }
  }

  return {
    homeTeam,
    awayTeam,
    homeLogoUrl,
    awayLogoUrl,
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

function buildPublicPayload(rawPayload) {
  const matches = Array.isArray(rawPayload?.matches) ? rawPayload.matches : [];

  const logosItems = matches.map((match, index) => {
    const homeTeam = match?.teams?.home || {};
    const awayTeam = match?.teams?.away || {};

    return {
      matchId: Number.isFinite(match?.id) ? match.id : index + 1,
      matchTitle: match?.title || "Unknown",
      homeTeam: homeTeam?.name || null,
      awayTeam: awayTeam?.name || null,
      homeLogoUrl: homeTeam?.logoUrl || null,
      awayLogoUrl: awayTeam?.logoUrl || null,
      logosFound: Boolean(homeTeam?.logoUrl || awayTeam?.logoUrl),
      lineups: {
        starting: {
          home: Array.isArray(homeTeam?.startingLineup) ? homeTeam.startingLineup : [],
          away: Array.isArray(awayTeam?.startingLineup) ? awayTeam.startingLineup : [],
        },
        substitutes: {
          home: Array.isArray(homeTeam?.substitutes) ? homeTeam.substitutes : [],
          away: Array.isArray(awayTeam?.substitutes) ? awayTeam.substitutes : [],
        },
      },
      ...(match?.error ? { error: String(match.error).replace(/https?:\/\/\S+/g, "[redacted-url]") } : {}),
    };
  });

  const logosPayload = {
    scrapedAt: new Date().toISOString(),
    count: logosItems.length,
    items: logosItems,
  };

  const sanitizedMatches = matches.map((match) => {
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

  const { source, footballPageUrl, ...publicPayload } = rawPayload;
  const enrichedPayload = {
    ...publicPayload,
    enrichedAt: new Date().toISOString(),
    matches: sanitizedMatches,
  };

  return { logosPayload, enrichedPayload };
}

function getPrimaryMatchesColumnRoot($) {
  let bestRoot = null;
  let bestCount = 0;

  $("td[valign='top'], td[valign=top]").each((_, td) => {
    const root = $(td);
    const count = root.find(`a[href*='${EVENT_PATH_SEGMENT}']`).length;
    if (count > bestCount) {
      bestCount = count;
      bestRoot = root;
    }
  });

  return bestRoot;
}

function extractDayMatchRows(listHtml, footballPageUrl) {
  const $ = cheerio.load(listHtml);
  const rows = [];
  const seen = new Set();

  const mainRoot = getPrimaryMatchesColumnRoot($);
  const rowsRoot = mainRoot || $.root();

  let currentDateLabel = null;
  let inTopSection = false;
  let includeCurrentDateSection = false;

  rowsRoot.find("tr").each((_, tr) => {
    if (MAX_DAY_EVENTS !== null && rows.length >= MAX_DAY_EVENTS) return;

    const row = $(tr);
    const headerBold = normalizeSpace(row.find("td[colspan] b").first().text());
    const headerCellText = normalizeSpace(row.find("td[colspan]").first().text());
    const headerText = headerBold || headerCellText;

    if (headerText) {
      if (/top\s+matches\s+today/i.test(headerText)) {
        inTopSection = true;
        currentDateLabel = "Today";
        includeCurrentDateSection = false;
      } else {
        const normalizedDate = normalizeDateLabel(headerText);
        if (normalizedDate) {
          inTopSection = false;
          currentDateLabel = normalizedDate;
          includeCurrentDateSection = isWithinDaysWindow(normalizedDate);
        }
      }
    }

    if (!currentDateLabel || inTopSection || !includeCurrentDateSection) return;

    row.find(`a.live[href*='${EVENT_PATH_SEGMENT}'], a[href*='${EVENT_PATH_SEGMENT}']`).each((__, anchor) => {
      if (MAX_DAY_EVENTS !== null && rows.length >= MAX_DAY_EVENTS) return;

      const eventHref = $(anchor).attr("href");
      const eventUrl = toAbsoluteUrl(eventHref, footballPageUrl);
      if (!eventUrl || seen.has(eventUrl)) return;

      const containerTd = $(anchor).closest("td");
      const isLive = containerTd.find("img[src*='live.gif'], img[src*='/live.gif']").length > 0;
      const rowFirstIcon = containerTd
        .closest("tr")
        .find("img")
        .filter((__, img) => {
          const src = ($(img).attr("src") || "").toLowerCase();
          return !src.includes("/live.gif") && !src.includes("/line.gif");
        })
        .first();

      const title = normalizeSpace($(anchor).text());
      const evdesc = containerTd.find("span.evdesc").first();
      const evdescClone = evdesc.clone();
      evdescClone.find("br").replaceWith("\n");
      const descriptionRaw = evdescClone.text() || "";
      const descriptionText = normalizeMultiline(descriptionRaw);
      const { dateLabel, timeLabel, leagueLabel } = parseDateAndLeague(descriptionText);

      rows.push({
        id: rows.length + 1,
        title: title || "Unknown match",
        eventUrl,
        dateLabel: dateLabel || currentDateLabel,
        timeLabel,
        isLive,
        leagueLabel,
        iconUrl: toAbsoluteUrl(rowFirstIcon.attr("src") || null, footballPageUrl),
        iconAlt: normalizeSpace(rowFirstIcon.attr("alt") || "") || null,
        sectionLabel: currentDateLabel,
        isTopMatch: false,
        rawDescription: descriptionText || null,
      });

      seen.add(eventUrl);
    });
  });

  return rows;
}

async function extractPlayerLinks(eventHtml, eventUrl) {
  const $ = cheerio.load(eventHtml);
  const links = [];
  const seen = new Set();
  const candidates = [];

  $("#links_block a, a[href*='webplayer.php'], a[href*='webplayer2.php']").each((index, anchor) => {
    const href = $(anchor).attr("href");
    const onclick = $(anchor).attr("onclick") || "";
    const showWebplayerMatch = onclick.match(/show_webplayer\('([^']+)'\s*,\s*'([^']+)'/i);
    const hasShowWebplayer = Boolean(showWebplayerMatch);

    const hrefLooksPlayable = /webplayer(?:2)?\.php/i.test(href || "");
    if (!hrefLooksPlayable && !hasShowWebplayer) return;

    const playerUrl = toAbsoluteUrl(href || null, eventUrl);
    if (!playerUrl || seen.has(playerUrl)) return;
    if (!/^https?:\/\//i.test(playerUrl)) return;

    const row = $(anchor).closest("tr");
    const language = normalizeSpace(row.find("img[title]").first().attr("title") || "");
    const bitrate = normalizeSpace(row.find("td.bitrate").first().text());

    candidates.push({
      id: links.length + 1,
      label: normalizeSpace($(anchor).text()) || `Stream ${index + 1}`,
      url: playerUrl,
      language: language || null,
      bitrate: bitrate || null,
    });

    seen.add(playerUrl);
  });

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const resolvedUrl = await resolveEmbeddedPlayerUrl(candidate.url);
    links.push({
      ...candidate,
      id: i + 1,
      url: resolvedUrl || candidate.url,
      sourceUrl: candidate.url,
    });
  }

  return links;
}

async function scrapeFeedDaysMatches() {
  const jobStartMs = Date.now();
  markJobStarted("days");
  if (ALLOW_INSECURE_TLS) {
    console.warn("FEED_INSECURE_TLS=1 is enabled. TLS certificate validation is disabled for this run.");
  }

  console.log("Opening homepage feed...");
  const homeHtml = await fetchHtml(HOME_URL);

  const isDirectListingUrl = /\/allupcomingsports\//i.test(HOME_URL);
  const footballPageUrl = isDirectListingUrl ? HOME_URL : findFootballPageUrl(homeHtml);
  if (!footballPageUrl) {
    throw new Error("Football anchor not found on homepage.");
  }

  console.log("Resolved football page.");
  const footballHtml = await fetchHtml(footballPageUrl);

  const matches = extractDayMatchRows(footballHtml, footballPageUrl);
  console.log(
    `Found ${matches.length} day matches (${MAX_DAY_EVENTS === null ? "no limit" : `cap=${MAX_DAY_EVENTS}`}, window=${Math.max(DAYS_WINDOW, 1)} day(s)).`,
  );

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    try {
      const eventHtml = await fetchHtml(match.eventUrl);
      const streams = await extractPlayerLinks(eventHtml, match.eventUrl);
      const teamDetails = extractTeamDetails(eventHtml, match.eventUrl, match);
      match.streams = streams;
      match.streamCount = streams.length;
      match.teams = {
        home: {
          name: teamDetails.homeTeam,
          logoUrl: teamDetails.homeLogoUrl,
          startingLineup: teamDetails.lineups?.starting?.home || [],
          substitutes: teamDetails.lineups?.substitutes?.home || [],
        },
        away: {
          name: teamDetails.awayTeam,
          logoUrl: teamDetails.awayLogoUrl,
          startingLineup: teamDetails.lineups?.starting?.away || [],
          substitutes: teamDetails.lineups?.substitutes?.away || [],
        },
      };
      console.log(`[${i + 1}/${matches.length}] ${match.title} -> ${streams.length} streams`);
    } catch (error) {
      match.streams = [];
      match.streamCount = 0;
      match.error = error instanceof Error ? error.message : "Unknown event scrape error";
      console.warn(`[${i + 1}/${matches.length}] Failed: ${match.title}`);
    }

    await wait(300);
  }

  const payload = {
    section: "Day Matches",
    scrapedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };
  const { logosPayload, enrichedPayload } = buildPublicPayload(payload);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_LOGOS_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(OUTPUT_ENRICHED_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(OUTPUT_LOGOS_PATH, JSON.stringify(logosPayload, null, 2), "utf-8");
  fs.writeFileSync(OUTPUT_ENRICHED_PATH, JSON.stringify(enrichedPayload, null, 2), "utf-8");
  console.log(`Saved: ${OUTPUT_PATH}`);
  console.log(`Saved logos payload: ${OUTPUT_LOGOS_PATH}`);
  console.log(`Saved enriched matches payload: ${OUTPUT_ENRICHED_PATH}`);
  const durationMs = Date.now() - jobStartMs;
  const outputBytes = fs.statSync(OUTPUT_PATH).size;
  markJobSucceeded("days", matches.length, { durationMs, outputBytes });
}

scrapeFeedDaysMatches().catch((error) => {
  markJobFailed("days", error instanceof Error ? error.message : "Unknown error");
  console.error("Day-matches scraper failed:", error);
  process.exit(1);
});
