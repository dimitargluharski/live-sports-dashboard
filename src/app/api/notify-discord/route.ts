import { NextRequest, NextResponse } from 'next/server';

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

function formatLinks(links: string[] = []) {
  if (!Array.isArray(links) || links.length === 0) return '';
  return links.map((l, i) => `[Stream ${i + 1}](${l})`).join(' | ');
}

export async function POST(req: NextRequest) {
  const { match, type } = await req.json();
  if (!DISCORD_WEBHOOK_URL) {
    return NextResponse.json({ error: 'Discord webhook URL not set.' }, { status: 500 });
  }
  if (!match || !type) {
    return NextResponse.json({ error: 'Missing match or type.' }, { status: 400 });
  }
  let content = '';
  const linksText = formatLinks(match.links || (match.link ? [match.link] : []));
  if (type === 'reminder_15') {
    content = `⏰ Остават 15 минути до мача: **${match.name}**! ${linksText}`;
  } else if (type === 'reminder_10') {
    content = `⏰ Остават 10 минути до мача: **${match.name}**! ${linksText}`;
  } else if (type === 'reminder_5') {
    content = `⏰ Остават 5 минути до мача: **${match.name}**! ${linksText}`;
  } else if (type === 'reminder_1') {
    content = `⏰ Остава 1 минута до мача: **${match.name}**! ${linksText}`;
  } else if (type === 'start') {
    content = `🎬 Мачът започва сега: **${match.name}**! ${linksText}`;
  } else if (type === 'followed') {
    const startTime = match.startTime ? new Date(match.startTime).toLocaleString('bg-BG', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    content = `⭐ Последва мач: **${match.name}**\nНачало: ${startTime} ${linksText ? '\n' + linksText : ''}`;
  } else {
    content = `Известие за мач: **${match.name}**. ${linksText}`;
  }
  const webhookRes = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!webhookRes.ok) {
    return NextResponse.json({ error: 'Failed to send Discord notification.' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}