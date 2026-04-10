// Main feed scraper
// Flow:
// 1) Open homepage and find the football icon anchor.
// 2) Open football upcoming page and collect event links.
// 3) Open each event page and collect webplayer links for modal usage.

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { Agent } = require("undici");
const { markJobStarted, markJobSucceeded, markJobFailed } = require("./scrape-status");

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
const OUTPUT_PATH = path.join(__dirname, "../public/matches-feed-main.json");

const DEFAULT_TIMEOUT_MS = 45_000;
const SCRAPE_DISCORD_WEBHOOK_URL = (process.env.SCRAPE_DISCORD_WEBHOOK_URL || "").trim();
const configuredMaxEvents = Number(process.env.FEED_MAX_EVENTS || "");
const MAX_EVENTS = Number.isFinite(configuredMaxEvents) && configuredMaxEvents > 0
  ? Math.floor(configuredMaxEvents)
  : null;
const ALLOW_INSECURE_TLS = process.env.FEED_INSECURE_TLS === "1";

const insecureDispatcher = ALLOW_INSECURE_TLS
  ? new Agent({ connect: { rejectUnauthorized: false } })
  : null;

const fallbackInsecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });

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

async function notifyDiscord(message) {
  if (!SCRAPE_DISCORD_WEBHOOK_URL) return;

  try {
    await fetch(SCRAPE_DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: message,
      }),
    });
  } catch (error) {
    console.warn("Discord notification failed:", error instanceof Error ? error.message : String(error));
  }
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

    let res;
    try {
      res = await doFetch(insecureDispatcher || undefined);
    } catch (error) {
      const code = error?.cause?.code || error?.code;
      const shouldRetryInsecure =
        !ALLOW_INSECURE_TLS &&
        code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" &&
        insecureHostRegex.test(url);

      if (!shouldRetryInsecure) {
        throw error;
      }

      console.warn(`TLS verify failed for ${url}. Retrying with insecure TLS fallback.`);
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

function normalizeDateLabel(value) {
  const cleaned = normalizeSpace(value).replace(/^[,\-\s]+|[,\-\s]+$/g, "");
  const match = cleaned.match(/^(\d{1,2})\s+([a-z]{3,12})(?:\s*,\s*[a-z]+)?$/i);
  if (!match) return null;

  const day = match[1];
  const monthRaw = match[2];
  const month = `${monthRaw[0].toUpperCase()}${monthRaw.slice(1).toLowerCase()}`;
  return `${day} ${month}`;
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

function extractMatchRows(listHtml, footballPageUrl) {
  const $ = cheerio.load(listHtml);
  const seen = new Set();
  const rows = [];

  let currentSectionLabel = null;
  let currentDateLabel = null;

  const mainRoot = getPrimaryMatchesColumnRoot($);
  const rowsRoot = mainRoot || $.root();

  rowsRoot.find("tr").each((_, tr) => {
    if (MAX_EVENTS !== null && rows.length >= MAX_EVENTS) return;

    const row = $(tr);
    const headerBold = normalizeSpace(row.find("td[colspan] b").first().text());
    const headerCellText = normalizeSpace(row.find("td[colspan]").first().text());
    const headerText = headerBold || headerCellText;

    if (headerText) {
      if (/top\s+matches\s+today/i.test(headerText)) {
        currentSectionLabel = "Top Matches Today";
        currentDateLabel = "Today";
      } else if (/top\s+matches/i.test(headerText)) {
        currentSectionLabel = headerText;
      } else {
        const normalizedDate = normalizeDateLabel(headerText);
        if (normalizedDate) {
          currentDateLabel = normalizedDate;
          currentSectionLabel = null;
        }
      }
    }

    row.find(`a.live[href*='${EVENT_PATH_SEGMENT}'], a[href*='${EVENT_PATH_SEGMENT}']`).each((__, anchor) => {
      if (MAX_EVENTS !== null && rows.length >= MAX_EVENTS) return;

      const eventHref = $(anchor).attr("href");
      const eventUrl = toAbsoluteUrl(eventHref, footballPageUrl);
      if (!eventUrl || seen.has(eventUrl)) return;

      const containerTd = $(anchor).closest("td");
      const title = normalizeSpace($(anchor).text());
      const evdesc = containerTd.find("span.evdesc").first();
      const evdescClone = evdesc.clone();
      evdescClone.find("br").replaceWith("\n");
      const descriptionRaw = evdescClone.text() || "";
      const descriptionText = normalizeMultiline(descriptionRaw);
      const { dateLabel, timeLabel, leagueLabel } = parseDateAndLeague(descriptionText);

      const normalizedDate = dateLabel || currentDateLabel || (timeLabel ? "Today" : null);
      const isTopMatch = /top\s+matches\s+today/i.test(currentSectionLabel || "");

      rows.push({
        id: rows.length + 1,
        title: title || "Unknown match",
        eventUrl,
        dateLabel: normalizedDate,
        timeLabel,
        leagueLabel,
        sectionLabel: currentSectionLabel,
        isTopMatch,
        rawDescription: descriptionText || null,
      });

      seen.add(eventUrl);
    });
  });

  return rows;
}

function extractPlayerLinks(eventHtml, eventUrl) {
  const $ = cheerio.load(eventHtml);
  const links = [];
  const seen = new Set();

  // Primary target: explicit webplayer links inside links table.
  $("#links_block a, a[href*='webplayer.php'], a[href*='webplayer2.php']").each((index, anchor) => {
    const href = $(anchor).attr("href");
    const onclick = $(anchor).attr("onclick") || "";
    const showWebplayerMatch = onclick.match(/show_webplayer\('([^']+)'\s*,\s*'([^']+)'/i);
    const hasShowWebplayer = Boolean(showWebplayerMatch);

    const hrefLooksPlayable = /webplayer(?:2)?\.php/i.test(href || "");
    if (!hrefLooksPlayable && !hasShowWebplayer) return;

    const candidate = href || null;
    const playerUrl = toAbsoluteUrl(candidate, eventUrl);

    if (!playerUrl || seen.has(playerUrl)) return;
    if (!/^https?:\/\//i.test(playerUrl)) return;

    const row = $(anchor).closest("tr");
    const language = normalizeSpace(row.find("img[title]").first().attr("title") || "");
    const bitrate = normalizeSpace(row.find("td.bitrate").first().text());
    const provider = showWebplayerMatch?.[1] || null;
    const channel = showWebplayerMatch?.[2] || null;

    links.push({
      id: links.length + 1,
      label: normalizeSpace($(anchor).text()) || `Stream ${index + 1}`,
      url: playerUrl,
      provider,
      channel,
      language: language || null,
      bitrate: bitrate || null,
    });

    seen.add(playerUrl);
  });

  return links;
}

function extractEventDateTime(eventHtml) {
  const text = normalizeSpace(cheerio.load(eventHtml)("body").text());

  const monthRegex =
    /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+at\s+(\d{1,2}:\d{2})/i;
  const monthMatch = text.match(monthRegex);
  if (monthMatch) {
    const day = monthMatch[1];
    const month = monthMatch[2];
    const time = monthMatch[3];

    return {
      dateLabel: `${day} ${month[0].toUpperCase()}${month.slice(1).toLowerCase()}`,
      timeLabel: time,
    };
  }

  const relativeRegex = /(today|tomorrow)\s+at\s+(\d{1,2}:\d{2})/i;
  const relativeMatch = text.match(relativeRegex);
  if (relativeMatch) {
    return {
      dateLabel: relativeMatch[1][0].toUpperCase() + relativeMatch[1].slice(1).toLowerCase(),
      timeLabel: relativeMatch[2],
    };
  }

  return {
    dateLabel: null,
    timeLabel: null,
  };
}

async function scrapeFeedMain() {
  markJobStarted("main");
  await notifyDiscord("Scrape job started (scrape:feed).");

  if (ALLOW_INSECURE_TLS) {
    console.warn("FEED_INSECURE_TLS=1 is enabled. TLS certificate validation is disabled for this run.");
  }

  console.log(`Opening homepage: ${HOME_URL}`);
  const homeHtml = await fetchHtml(HOME_URL);

  const footballPageUrl = findFootballPageUrl(homeHtml);
  if (!footballPageUrl) {
    throw new Error("Football anchor not found on homepage. Verify selector/title/alt in page source.");
  }

  console.log(`Football page: ${footballPageUrl}`);
  const footballHtml = await fetchHtml(footballPageUrl);

  const matches = extractMatchRows(footballHtml, footballPageUrl);
  console.log(`Found ${matches.length} football matches (${MAX_EVENTS === null ? "no limit" : `cap=${MAX_EVENTS}`}).`);

  for (let i = 0; i < matches.length; i += 1) {
    const match = matches[i];
    try {
      const eventHtml = await fetchHtml(match.eventUrl);
      const eventMeta = extractEventDateTime(eventHtml);
      match.dateLabel = match.dateLabel || eventMeta.dateLabel;
      match.timeLabel = match.timeLabel || eventMeta.timeLabel;

      const streams = extractPlayerLinks(eventHtml, match.eventUrl);
      match.streams = streams;
      match.streamCount = streams.length;
      console.log(`[${i + 1}/${matches.length}] ${match.title} -> ${streams.length} streams`);
    } catch (error) {
      match.streams = [];
      match.streamCount = 0;
      match.error = error instanceof Error ? error.message : "Unknown event scrape error";
      console.warn(`[${i + 1}/${matches.length}] Failed: ${match.title} (${match.eventUrl})`);
    }

    // Keep a small delay to reduce risk of temporary blocks.
    await wait(300);
  }

  const payload = {
    source: HOME_URL,
    footballPageUrl,
    scrapedAt: new Date().toISOString(),
    count: matches.length,
    matches,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Saved: ${OUTPUT_PATH}`);
  markJobSucceeded("main", matches.length);

  await notifyDiscord("Scrape job completed successfully (scrape:feed).");
}

scrapeFeedMain().catch(async (error) => {
  markJobFailed("main", error instanceof Error ? error.message : "Unknown error");
  await notifyDiscord(`Scrape job failed (scrape:feed). ${error instanceof Error ? error.message : "Unknown error"}`);
  console.error("Main feed scraper failed:", error);
  process.exit(1);
});
