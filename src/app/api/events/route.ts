import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SOURCE_SITE = process.env.SOURCE_SITE || "https://rojadirectaenvivohd.com/";
const FALLBACK_DIARIES_URL = process.env.FALLBACK_DIARIES_URL || "https://pltvhd.com/diaries.json";
const FEED_MAIN_JSON_PATH = path.join(process.cwd(), "public", "matches-feed-main.json");
const FEED_TOP_JSON_PATH = path.join(process.cwd(), "public", "matches-feed-top.json");
const FEED_DAYS_JSON_PATH = path.join(process.cwd(), "public", "matches-feed-days.json");
const SCRAPE_STATUS_JSON_PATH = path.join(process.cwd(), "public", "scrape-status.json");
const LIVE_EVENTS_SOURCE_FALLBACK = process.env.LIVE_EVENTS_SOURCE_FALLBACK || SOURCE_SITE;
const LIVE_EVENTS_DIARIES_FALLBACK = process.env.LIVE_EVENTS_DIARIES_FALLBACK || FALLBACK_DIARIES_URL;

type EventsPayload = {
  source: string;
  diariesUrl: string;
  scrapedAt: string;
  isUpdating?: boolean;
  updateState?: {
    main: boolean;
    top: boolean;
    days: boolean;
    topPreparing: boolean;
    daysPreparing: boolean;
  };
  agendaDate: string | null;
  count: number;
  matches: Array<{
    id: number;
    date: string | null;
    time: string | null;
    title: string;
    eventUrl?: string | null;
    isLive?: boolean;
    isTopMatch?: boolean;
    stats?: {
      h2hRecord?: string | null;
      h2hContext?: string | null;
    };
    country: {
      name: string | null;
      flagUrl?: string | null;
      imageUrl: string | null;
    };
    streams: Array<{
      id: number;
      name: string;
      url: string;
    }>;
  }>;
};

type DiaryRecord = {
  id: number;
  attributes?: {
    diary_hour?: string;
    diary_description?: string;
    date_diary?: string;
    country?: {
      data?: {
        attributes?: {
          name?: string;
          image?: {
            data?: {
              attributes?: {
                url?: string;
              };
            };
          };
        };
      };
    };
    embeds?: {
      data?: Array<{
        id: number;
        attributes?: {
          embed_name?: string;
          embed_iframe?: string;
        };
      }>;
    };
  };
};

type FeedStreamRecord = {
  id?: number;
  label?: string;
  url?: string;
  language?: string | null;
  bitrate?: string | null;
};

type FeedMatchRecord = {
  id?: number;
  title?: string;
  eventUrl?: string;
  dateLabel?: string | null;
  timeLabel?: string | null;
  isLive?: boolean;
  leagueLabel?: string | null;
  iconUrl?: string | null;
  iconAlt?: string | null;
  sectionLabel?: string | null;
  isTopMatch?: boolean;
  stats?: {
    h2hRecord?: string | null;
    h2hContext?: string | null;
  };
  streams?: FeedStreamRecord[];
};

type FeedPayload = {
  source?: string;
  footballPageUrl?: string;
  scrapedAt?: string;
  count?: number;
  matches?: FeedMatchRecord[];
};

type ScrapeStatusPayload = {
  jobs?: {
    main?: { running?: boolean; preparing?: boolean };
    top?: { running?: boolean; preparing?: boolean };
    days?: { running?: boolean; preparing?: boolean };
  };
};

function toAbsoluteUrl(input: string | undefined, base: string): string | null {
  if (!input) return null;

  try {
    return new URL(input, base).toString();
  } catch {
    return null;
  }
}

async function discoverDiariesUrl(): Promise<string> {
  const pageRes = await fetch(SOURCE_SITE, { cache: "no-store" });
  if (!pageRes.ok) {
    return FALLBACK_DIARIES_URL;
  }

  const html = await pageRes.text();
  const scriptMatch = html.match(/assets\/js\/main\.js(?:\?v=[^"']+)?/i);

  if (!scriptMatch) {
    return FALLBACK_DIARIES_URL;
  }

  const mainJsUrl = toAbsoluteUrl(scriptMatch[0], SOURCE_SITE);
  if (!mainJsUrl) {
    return FALLBACK_DIARIES_URL;
  }

  const scriptRes = await fetch(mainJsUrl, { cache: "no-store" });
  if (!scriptRes.ok) {
    return FALLBACK_DIARIES_URL;
  }

  const script = await scriptRes.text();
  const diariesMatch = script.match(/https?:\/\/[^"']+\/diaries\.json/i);

  return diariesMatch?.[0] ?? FALLBACK_DIARIES_URL;
}

async function getFeedEvents(): Promise<EventsPayload> {
  return getFeedEventsFromFile(FEED_MAIN_JSON_PATH, false);
}

async function getFeedTopEvents(): Promise<EventsPayload> {
  return getFeedEventsFromFile(FEED_TOP_JSON_PATH, true);
}

async function getFeedDaysEvents(): Promise<EventsPayload> {
  return getFeedEventsFromFile(FEED_DAYS_JSON_PATH, true);
}

async function getFeedEventsFromFile(filePath: string, includeMatchesWithoutStreams: boolean): Promise<EventsPayload> {
  const raw = await fs.readFile(filePath, "utf-8");
  const payload = JSON.parse(raw) as FeedPayload;
  const rows = Array.isArray(payload.matches) ? payload.matches : [];

  const matches = rows
    .map((row, index) => {
      const streams = (Array.isArray(row.streams) ? row.streams : [])
        .map((stream, streamIndex) => {
          const cleanUrl = typeof stream.url === "string" ? stream.url.trim() : "";
          if (!/^https?:\/\//i.test(cleanUrl)) {
            return null;
          }

          const extras = [stream.language, stream.bitrate].filter(Boolean).join(" • ");
          const baseName = (stream.label || `Stream ${streamIndex + 1}`).trim();

          return {
            id: stream.id ?? streamIndex + 1,
            name: extras ? `${baseName} (${extras})` : baseName,
            url: cleanUrl,
          };
        })
        .filter((stream): stream is { id: number; name: string; url: string } => Boolean(stream));

      const league = row.leagueLabel?.trim() || "Football";
      const title = row.title?.trim() || "Unknown match";
      const mergedTitle = `${league}: ${title}`;

      return {
        id: row.id ?? index + 1,
        date: row.dateLabel ?? null,
        time: row.timeLabel ?? null,
        title: mergedTitle,
        eventUrl: row.eventUrl ?? null,
        isLive: Boolean(row.isLive),
        isTopMatch: Boolean(row.isTopMatch),
        stats: row.stats
          ? {
            h2hRecord: row.stats.h2hRecord ?? null,
            h2hContext: row.stats.h2hContext ?? null,
          }
          : undefined,
        country: {
          name: row.iconAlt?.trim() || league,
          flagUrl: null,
          imageUrl: row.iconUrl ?? null,
        },
        streams,
      };
    })
    .filter((item) => includeMatchesWithoutStreams || item.streams.length > 0)
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  return {
    source: payload.source ?? LIVE_EVENTS_SOURCE_FALLBACK,
    diariesUrl: payload.footballPageUrl ?? LIVE_EVENTS_DIARIES_FALLBACK,
    scrapedAt: payload.scrapedAt ?? new Date().toISOString(),
    agendaDate: matches.find((item) => item.date)?.date ?? null,
    count: matches.length,
    matches,
  };
}

async function getUpdateState() {
  try {
    const raw = await fs.readFile(SCRAPE_STATUS_JSON_PATH, "utf-8");
    const payload = JSON.parse(raw) as ScrapeStatusPayload;

    return {
      main: Boolean(payload.jobs?.main?.running),
      top: Boolean(payload.jobs?.top?.running),
      days: Boolean(payload.jobs?.days?.running),
      topPreparing: Boolean(payload.jobs?.top?.preparing),
      daysPreparing: Boolean(payload.jobs?.days?.preparing),
    };
  } catch {
    return {
      main: false,
      top: false,
      days: false,
      topPreparing: false,
      daysPreparing: false,
    };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = (searchParams.get("source") || "").toLowerCase();
    const topOnlyRaw = (searchParams.get("topOnly") || "").toLowerCase();
    const topOnly = topOnlyRaw === "1" || topOnlyRaw === "true";

    if (source === "feed") {
      const updateState = await getUpdateState();
      const payload = await getFeedEvents();
      const matches = topOnly
        ? payload.matches.filter((match) => Boolean(match.isTopMatch))
        : payload.matches;

      return NextResponse.json(
        {
          ...payload,
          isUpdating: updateState.main || updateState.top || updateState.days || updateState.topPreparing || updateState.daysPreparing,
          updateState,
          count: matches.length,
          matches,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (source === "feed-top") {
      const updateState = await getUpdateState();
      const payload = await getFeedTopEvents();
      return NextResponse.json(
        {
          ...payload,
          isUpdating: updateState.top || updateState.main || updateState.topPreparing,
          updateState,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    if (source === "feed-days") {
      const updateState = await getUpdateState();
      const payload = await getFeedDaysEvents();
      return NextResponse.json(
        {
          ...payload,
          isUpdating: updateState.days || updateState.main || updateState.daysPreparing,
          updateState,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const diariesUrl = await discoverDiariesUrl();
    const diariesRes = await fetch(diariesUrl, { cache: "no-store" });

    if (!diariesRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to fetch remote diaries data",
          source: SOURCE_SITE,
          diariesUrl,
          status: diariesRes.status,
        },
        { status: 502 },
      );
    }

    const payload = (await diariesRes.json()) as { data?: DiaryRecord[] };
    const rows = Array.isArray(payload?.data) ? payload.data : [];

    const matches = rows
      .map((row) => {
        const attrs = row.attributes;
        const country = attrs?.country?.data?.attributes;

        const countryImageUrl = toAbsoluteUrl(
          country?.image?.data?.attributes?.url,
          "https://cdn.pltvhd.com",
        );

        const streams = (attrs?.embeds?.data ?? [])
          .map((embed) => {
            const embedAttrs = embed.attributes;
            const url = toAbsoluteUrl(embedAttrs?.embed_iframe, SOURCE_SITE);

            return {
              id: embed.id,
              name: embedAttrs?.embed_name?.trim() || "Unnamed stream",
              url,
            };
          })
          .filter((stream) => Boolean(stream.url));

        return {
          id: row.id,
          date: attrs?.date_diary ?? null,
          time: attrs?.diary_hour ?? null,
          title: attrs?.diary_description?.trim() || "Evento sin titulo",
          country: {
            name: country?.name ?? null,
            flagUrl: countryImageUrl,
            imageUrl: countryImageUrl,
          },
          streams,
        };
      })
      .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

    const agendaDate = matches.find((item) => item.date)?.date ?? null;

    return NextResponse.json(
      {
        source: SOURCE_SITE,
        diariesUrl,
        scrapedAt: new Date().toISOString(),
        agendaDate,
        count: matches.length,
        matches,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Scraping failed",
        source: SOURCE_SITE,
        details: message,
      },
      { status: 500 },
    );
  }
}