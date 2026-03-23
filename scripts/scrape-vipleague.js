// VIPLeague Scraper Script
// Usage: Run with `node scripts/scrape-vipleague.js`
// Requires: puppeteer, cheerio

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const VIP_URL = 'https://vipleague.io/football-schedule-streaming-links';
const OUTPUT_PATH = path.join(__dirname, '../public/matches-vip.json');
const DEBUG_HTML_PATH = path.join(__dirname, '../public/vip-debug.html');

async function scrapeVIPLeague() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto(VIP_URL, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3000)); // Wait extra for dynamic content
  const html = await page.content();
  const $ = cheerio.load(html);

  const matches = [];
  $('.row.justify-content-evenly.mt-1').each((_, row) => {
    $(row)
      .find('a[aria-controls]')
      .each((_, anchor) => {
        const $anchor = $(anchor);
        // League/country extraction
        let league = '';
        const leagueSpan = $anchor.find('span[class*="vipleague"]');
        if (leagueSpan.length) {
          const classList = leagueSpan.attr('class')?.split(/\s+/) || [];
          // Find the last class that is not 'align-bottom' or 'me-2' and not 'vipleague'
          league = classList.find(cls => cls.startsWith('vipleague-'))
            ? classList.find(cls => cls.startsWith('vipleague-')).replace('vipleague-', '')
            : classList[classList.length - 1] || '';
        }
        // Tournament
        const tournament = $anchor.find('span.sport-default').text().trim();
        // Date and Time
        let date = '';
        let time = '';
        const timeSpan = $anchor.find('span[content]');
        if (timeSpan.length) {
          // Extract time (visible text, e.g. '18:00')
          const visible = timeSpan.text().trim();
          if (/^\d{1,2}:\d{2}$/.test(visible)) {
            time = visible;
          }
          // Extract date from content attribute (ISO)
          const contentAttr = timeSpan.attr('content');
          if (contentAttr && /^\d{4}-\d{2}-\d{2}T/.test(contentAttr)) {
            date = contentAttr.split('T')[0];
            // fallback: if time is still empty, extract from content
            if (!time) {
              const t = contentAttr.split('T')[1];
              if (t) time = t.slice(0, 5);
            }
          }
        }
        // Teams
        const anchorClone = $anchor.clone();
        anchorClone.find('span').remove();
        const teams = anchorClone.text().trim();
        // Stream links
        const streamLinks = [];
        $anchor
          .parent()
          .find('a[href^="/stream/"]')
          .slice(0, 4)
          .each((i, streamA) => {
            const label = $(streamA).text().trim() || `Stream ${i + 1}`;
            const url = new URL($(streamA).attr('href'), VIP_URL).toString();
            streamLinks.push({ label, url });
          });
        matches.push({ league, tournament, date, time, teams, streams: streamLinks });
      });
  });

  // For each match, resolve iframe src for each stream
  for (const match of matches) {
    for (const stream of match.streams) {
      try {
        const streamPage = await browser.newPage();
        await streamPage.goto(stream.url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        const streamHtml = await streamPage.content();
        const $stream = cheerio.load(streamHtml);
        const iframe = $stream('iframe').attr('src');
        if (iframe) {
          stream.iframe = iframe;
          stream.status = 'ok';
        } else {
          stream.iframe = null;
          stream.status = 'no-iframe';
        }
        await streamPage.close();
      } catch (err) {
        stream.iframe = null;
        stream.status = 'error';
      }
    }
  }

  await browser.close();

  if (matches.length > 0) {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(matches, null, 2), 'utf-8');
    if (fs.existsSync(DEBUG_HTML_PATH)) fs.unlinkSync(DEBUG_HTML_PATH);
    console.log(`Scraped ${matches.length} matches. Saved to matches-vip.json.`);
  } else {
    fs.writeFileSync(DEBUG_HTML_PATH, html, 'utf-8');
    console.warn('No matches found. Saved debug HTML.');
  }
}

scrapeVIPLeague().catch((err) => {
  console.error('Scraper error:', err);
  process.exit(1);
});
