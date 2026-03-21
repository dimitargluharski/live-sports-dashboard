import { NextResponse } from "next/server";

const SOURCE_SITE = process.env.SOURCE_SITE || "https://rojadirectaenvivohd.com/";
const FALLBACK_DIARIES_URL = process.env.FALLBACK_DIARIES_URL || "https://pltvhd.com/diaries.json";

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

export async function GET() {
  try {
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