// Football scraper script
// Usage: node scripts/scrape-matches.js
// Requires: puppeteer, cheerio

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const SOURCE_LISTING_URL = process.env.SCRAPER_LISTING_URL || `${process.env.SOURCE_SITE || 'https://example.com'}/`;
const SOURCE_BASE_URL = process.env.SCRAPER_BASE_URL || process.env.SOURCE_SITE || 'https://example.com';
const OUTPUT_PATH = path.join(__dirname, process.env.SCRAPER_OUTPUT_PATH || '../public/matches.json');
const DEBUG_HTML_PATH = path.join(__dirname, process.env.SCRAPER_DEBUG_HTML_PATH || '../public/scraper-debug.html');
const CHUNK_SIZE = Math.max(1, Number(process.env.SCRAPER_CHUNK_SIZE || 10));
const DEBUG = (process.env.SCRAPER_DEBUG || '0') === '1';
const DEBUG_MATCH_LIMIT = Number(process.env.SCRAPER_DEBUG_MATCH_LIMIT || 10);
const CHANNEL_SCAN_MODE = (process.env.SCRAPER_CHANNEL_SCAN_MODE || 'smart').toLowerCase();
const IFRAME_RESOLVE_MODE = (process.env.SCRAPER_IFRAME_RESOLVE_MODE || 'none').toLowerCase();

function debugLog(message, payload) {
  if (!DEBUG) return;
  const time = new Date().toISOString();

  if (payload !== undefined) {
    console.log(`[SCRAPER DEBUG ${time}] ${message}`, payload);
    return;
  }

  console.log(`[SCRAPER DEBUG ${time}] ${message}`);
}

function splitIntoChunks(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function normalizeText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function unixToDateString(unixSeconds) {
  const value = Number(unixSeconds);
  if (!Number.isFinite(value) || value <= 0) return '';

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseGetStreamOnclick(onclickValue) {
  const value = onclickValue || '';
  const match = value.match(/getstream\(\s*['\"]?(\d+)['\"]?\s*,\s*['\"]?([\w-]+)['\"]?\s*\)/i);
  if (!match) return null;

  return {
    matchId: match[1],
    channelNum: match[2],
  };
}

function shouldScanChannels(match) {
  if (CHANNEL_SCAN_MODE === 'all') return true;
  if (CHANNEL_SCAN_MODE === 'none') return false;

  // Smart mode: only channels from matches explicitly marked LIVE on listing.
  return Boolean(match.isLive);
}

function shouldResolveIframes(match) {
  if (IFRAME_RESOLVE_MODE === 'all') return true;
  if (IFRAME_RESOLVE_MODE === 'none') return false;

  // Smart mode: resolve iframe chain only for LIVE matches.
  return Boolean(match.isLive);
}

async function extractIframeChain(browser, streamUrl) {
  const result = {
    streamPageUrl: streamUrl,
    iframeLevel1: null,
    iframeLevel2: null,
    status: 'error',
  };

  let page;
  let nestedPage;

  try {
    debugLog('Opening stream page', { streamUrl });
    page = await browser.newPage();
    await page.goto(streamUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 800));

    const firstSrc = await page.evaluate(() => {
      const candidates = [
        document.querySelector('#inf iframe[src]'),
        document.querySelector('iframe[src]'),
      ].filter(Boolean);

      const first = candidates[0];
      return first ? first.getAttribute('src') : null;
    });

    if (!firstSrc) {
      debugLog('No first iframe found', { streamUrl });
      result.status = 'no-iframe-level1';
      return result;
    }

    const firstAbsolute = new URL(firstSrc, streamUrl).toString();
    result.iframeLevel1 = firstAbsolute;

    nestedPage = await browser.newPage();
    await nestedPage.goto(firstAbsolute, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 800));

    const secondSrc = await nestedPage.evaluate(() => {
      const candidates = [
        document.querySelector('#player iframe[src]'),
        document.querySelector('#player-container iframe[src]'),
        document.querySelector('iframe[src]'),
      ].filter(Boolean);

      const first = candidates[0];
      return first ? first.getAttribute('src') : null;
    });

    if (secondSrc) {
      result.iframeLevel2 = new URL(secondSrc, firstAbsolute).toString();
      result.status = 'ok';
      debugLog('Resolved nested iframe successfully', {
        streamUrl,
        iframeLevel1: result.iframeLevel1,
        iframeLevel2: result.iframeLevel2,
      });
    } else {
      result.status = 'no-iframe-level2';
      debugLog('No second iframe found', { streamUrl, iframeLevel1: result.iframeLevel1 });
    }

    return result;
  } catch (error) {
    debugLog('Error while resolving iframe chain', {
      streamUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return result;
  } finally {
    if (nestedPage) await nestedPage.close();
    if (page) await page.close();
  }
}

async function extractChannelsFromMatchPage(browser, matchUrl) {
  const channels = [];
  let page;

  try {
    debugLog('Opening match page for channels', { matchUrl });
    page = await browser.newPage();
    await page.goto(matchUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1000));

    const rawChannels = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll('[onclick*="getstream("]')];
      return nodes.map((node) => ({
        text: (node.textContent || '').replace(/\s+/g, ' ').trim(),
        onclick: node.getAttribute('onclick') || '',
      }));
    });

    const seen = new Set();
    for (const item of rawChannels) {
      const parsed = parseGetStreamOnclick(item.onclick);
      if (!parsed) continue;

      const key = `${parsed.matchId}:${parsed.channelNum}`;
      if (seen.has(key)) continue;
      seen.add(key);

      channels.push({
        label: item.text || `Channel ${channels.length + 1}`,
        matchId: parsed.matchId,
        channelNum: parsed.channelNum,
        streamPageUrl: `${SOURCE_BASE_URL}/getstream.php?id=${parsed.matchId}&num=${parsed.channelNum}`,
      });
    }

    debugLog('Extracted channels from match page', {
      matchUrl,
      channelCount: channels.length,
      sample: channels.slice(0, 2),
    });

    return channels;
  } catch (error) {
    debugLog('Error while extracting channels', {
      matchUrl,
      error: error instanceof Error ? error.message : String(error),
    });
    return channels;
  } finally {
    if (page) await page.close();
  }
}

async function scrapeSource() {
  debugLog('Scraper started', {
    SOURCE_LISTING_URL,
    OUTPUT_PATH,
    CHUNK_SIZE,
    CHANNEL_SCAN_MODE,
    IFRAME_RESOLVE_MODE,
    DEBUG_MATCH_LIMIT,
  });

  if (process.env.SCRAPER_MAX_MATCHES) {
    console.warn('SCRAPER_MAX_MATCHES is ignored to prevent partial data. Use full scrape output.');
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );

  await page.goto(SOURCE_LISTING_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  const html = await page.content();
  const $ = cheerio.load(html);

  const matches = [];
  let skippedMatches = 0;

  $('article[id^="mat"]').each((_, article) => {
    const $article = $(article);
    const articleId = ($article.attr('id') || '').replace(/^mat/, '');
    const isLive =
      $article
        .find('[title]')
        .toArray()
        .some((node) => normalizeText($(node).attr('title')).toLowerCase() === 'на живо');

    const $anchor = $article.find('a.match_liga').first();
    const href = $anchor.attr('href') || '';
    const matchUrl = href ? new URL(href, SOURCE_BASE_URL).toString() : '';

    const $headlineSpans = $anchor.find('h1 > span');
    const $homeBlock = $headlineSpans.eq(0);
    let $awayBlock = $headlineSpans.eq(1);
    if ($awayBlock.hasClass('rez_cont')) {
      $awayBlock = $headlineSpans.eq(2);
    }
    const $timeSpan = $homeBlock.find('span.time').first();
    const $countrySpan = $homeBlock.find('span.img-flag').first();
    const $rez = $anchor.find('span.rez_cont').first();

    const time = normalizeText($timeSpan.text());
    const dataStart = ($timeSpan.attr('data-start') || '').trim();
    const date = unixToDateString(dataStart);

    const homeTeam = normalizeText($homeBlock.clone().find('span').remove().end().text());
    const awayTeam = normalizeText($awayBlock.clone().find('span.match_descr').remove().end().text());
    const scoreOrSeparator = normalizeText($rez.text());

    const leagueRaw = normalizeText($awayBlock.find('span.match_descr').first().text());
    const league = leagueRaw.replace(/^\(+|\)+$/g, '').trim();

    const countryRaw = normalizeText(
      ($countrySpan.attr('data-darj') || $countrySpan.attr('title') || '').split('-')[0],
    );

    if (!homeTeam || !awayTeam || !time) {
      skippedMatches += 1;
      return;
    }

    const matchPayload = {
      articleId,
      matchId: articleId,
      matchUrl,
      isLive,
      date,
      time,
      dataStart,
      homeTeam,
      awayTeam,
      teams: `${homeTeam} - ${awayTeam}`,
      scoreOrSeparator,
      league,
      country: countryRaw,
      channels: [],
      _sortStart: Number(dataStart) || 0,
    };

    if (DEBUG && matches.length < DEBUG_MATCH_LIMIT) {
      debugLog('Parsed match from listing', {
        articleId,
        time,
        dataStart,
        homeTeam,
        awayTeam,
        scoreOrSeparator,
        league,
        countryRaw,
        spanCount: $headlineSpans.length,
      });
    }

    matches.push(matchPayload);
  });

  debugLog('Listing parse completed', {
    parsedMatches: matches.length,
    skippedMatches,
  });

  const limitedMatches = matches;
  debugLog('Processing all parsed matches', {
    processingMatches: limitedMatches.length,
  });

  const matchChunks = splitIntoChunks(limitedMatches, CHUNK_SIZE);
  debugLog('Chunk plan prepared', {
    chunkSize: CHUNK_SIZE,
    chunks: matchChunks.length,
  });

  for (let chunkIndex = 0; chunkIndex < matchChunks.length; chunkIndex += 1) {
    const chunk = matchChunks[chunkIndex];
    debugLog('Processing channel extraction chunk', {
      chunk: chunkIndex + 1,
      totalChunks: matchChunks.length,
      chunkItems: chunk.length,
    });

    for (const match of chunk) {
      if (!match.matchUrl) continue;
      if (!shouldScanChannels(match)) {
        // Keep non-live fixtures without channels in smart mode.
        match.channels = [];
        continue;
      }
      match.channels = await extractChannelsFromMatchPage(browser, match.matchUrl);
      if (DEBUG && match.channels.length === 0) {
        debugLog('No channels found for match page', {
          articleId: match.articleId,
          matchUrl: match.matchUrl,
        });
      }
    }
  }

  // Safety: non-live matches should not expose channels in smart mode.
  if (CHANNEL_SCAN_MODE === 'smart') {
    for (const match of limitedMatches) {
      if (!match.isLive) {
        match.channels = [];
      }
    }
  }

  let resolvedChannels = 0;
  for (let chunkIndex = 0; chunkIndex < matchChunks.length; chunkIndex += 1) {
    const chunk = matchChunks[chunkIndex];
    debugLog('Processing iframe resolution chunk', {
      chunk: chunkIndex + 1,
      totalChunks: matchChunks.length,
      chunkItems: chunk.length,
    });

    for (const match of chunk) {
      if (!shouldResolveIframes(match)) {
        continue;
      }
      for (const channel of match.channels) {
        const resolved = await extractIframeChain(browser, channel.streamPageUrl);
        channel.iframeLevel1 = resolved.iframeLevel1;
        channel.iframeLevel2 = resolved.iframeLevel2;
        channel.status = resolved.status;
        resolvedChannels += 1;
      }
    }
  }

  limitedMatches.sort((a, b) => a._sortStart - b._sortStart);
  const output = limitedMatches.map(({ _sortStart, ...rest }) => rest);

  await browser.close();

  if (output.length === 0) {
    fs.writeFileSync(DEBUG_HTML_PATH, html, 'utf-8');
    console.warn('No matches found. Saved debug HTML.');
    return;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  if (fs.existsSync(DEBUG_HTML_PATH)) fs.unlinkSync(DEBUG_HTML_PATH);

  debugLog('Scraper finished', {
    outputMatches: output.length,
    resolvedChannels,
    outputPath: OUTPUT_PATH,
  });

  console.log(`Scraped ${output.length} matches. Saved to ${path.basename(OUTPUT_PATH)}.`);
}

scrapeSource().catch((err) => {
  console.error('Scraper error:', err);
  process.exit(1);
});
