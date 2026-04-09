import { NextRequest, NextResponse } from "next/server";

const SOURCE_SITE = process.env.SOURCE_SITE || "https://rojadirectaenvivohd.com";

function toAbsoluteUrl(input: string | null | undefined, base: string): string | null {
  if (!input) return null;

  try {
    return new URL(input, base).toString();
  } catch {
    return null;
  }
}

function decodeHtml(input: string): string {
  return input
    .replaceAll("\\/", "/")
    .replaceAll("&amp;", "&")
    .replaceAll("&#x2F;", "/")
    .replaceAll("&#47;", "/");
}

function firstMatch(regex: RegExp, html: string): string | null {
  const match = html.match(regex);
  if (!match?.[1]) return null;

  return decodeHtml(match[1].trim());
}

function extractIframeCandidates(html: string): Array<{ src: string; width: number; height: number }> {
  const candidates: Array<{ src: string; width: number; height: number }> = [];
  const iframeRegex = /<iframe\b([^>]*)>/gi;

  for (const match of html.matchAll(iframeRegex)) {
    const attrs = match[1] ?? "";
    const src = firstMatch(/\ssrc=["']([^"']+)["']/i, attrs);
    if (!src) continue;

    const widthRaw = firstMatch(/\swidth=["']?(\d+)/i, attrs);
    const heightRaw = firstMatch(/\sheight=["']?(\d+)/i, attrs);

    candidates.push({
      src,
      width: widthRaw ? Number(widthRaw) : 0,
      height: heightRaw ? Number(heightRaw) : 0,
    });
  }

  return candidates;
}

function isLikelyAdIframe(url: string): boolean {
  return /ads\.|getbanner\.php|doubleclick|googlesyndication|\/cache\/links\//i.test(url);
}

function extractIframeSrc(html: string, base: string): string | null {
  const candidates = extractIframeCandidates(html)
    .map((item) => {
      const absolute = toAbsoluteUrl(item.src, base);
      return absolute
        ? {
          ...item,
          absolute,
        }
        : null;
    })
    .filter((item): item is { src: string; width: number; height: number; absolute: string } => Boolean(item));

  if (!candidates.length) return null;

  const scored = candidates
    .filter((item) => !isLikelyAdIframe(item.absolute))
    .map((item) => {
      let score = 0;
      if (item.width >= 600) score += 3;
      if (item.height >= 350) score += 3;
      if (/live|player|embed|stream/i.test(item.absolute)) score += 2;
      if (/webplayer\.php/i.test(item.absolute)) score -= 2;
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  return (scored[0] ?? candidates[0]).absolute;
}

function extractDirectMediaUrl(html: string): string | null {
  const fromVideoTag = firstMatch(/<source[^>]*\ssrc=["']([^"']+\.(?:m3u8|mp4|webm)(?:\?[^"']*)?)["']/i, html);
  if (fromVideoTag) return fromVideoTag;

  const fromAnyMediaLink = firstMatch(/(https?:\\\/\\\/[^"'\s]+\.(?:m3u8|mp4|webm)(?:\?[^"'\s]*)?)/i, html);
  if (fromAnyMediaLink) return fromAnyMediaLink;

  return null;
}

async function safeFetch(url: string, referer?: string): Promise<string | null> {
  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/123 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      Referer: referer || SOURCE_SITE,
    },
  });

  if (!response.ok) return null;
  return response.text();
}

export async function GET(request: NextRequest) {
  try {
    const input = request.nextUrl.searchParams.get("url");
    const embedUrl = toAbsoluteUrl(input, SOURCE_SITE);

    if (!embedUrl) {
      return NextResponse.json({ error: "Invalid or missing url query parameter" }, { status: 400 });
    }

    const embedHtml = await safeFetch(embedUrl, SOURCE_SITE);
    if (!embedHtml) {
      return NextResponse.json({ error: "Failed to fetch embed page", embedUrl }, { status: 502 });
    }

    const innerIframe = extractIframeSrc(embedHtml, embedUrl);
    const playerUrl = innerIframe ?? embedUrl;

    let mediaUrl: string | null = extractDirectMediaUrl(embedHtml);

    if (!mediaUrl && playerUrl) {
      const playerHtml = await safeFetch(playerUrl, embedUrl);
      if (playerHtml) {
        mediaUrl = extractDirectMediaUrl(playerHtml);
      }
    }

    const normalizedMediaUrl = toAbsoluteUrl(mediaUrl, playerUrl);

    return NextResponse.json(
      {
        embedUrl,
        playerUrl,
        mediaUrl: normalizedMediaUrl,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Stream resolve failed", details: message }, { status: 500 });
  }
}