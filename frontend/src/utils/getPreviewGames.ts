import type { Game } from '../types/game';
import { parseScheduledStart } from './parseScheduledStart';

export function getPreviewGames(): Game[] {
  if (!new URLSearchParams(window.location.search).has('tests')) return [];

  const today = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const previousDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(yesterday);
  const liveStart = Date.now() - 15 * 60 * 1000;
  const endedStart = parseScheduledStart(previousDay, '18:45')?.getTime();

  return [
    {
      id: -2,
      title: 'Preview United – Form City',
      dateLabel: today,
      timeLabel: 'LIVE',
      scheduledStartAt: liveStart,
      sourceIsLive: true,
      sourceStatusAt: Date.now(),
      leagueLabel: 'Champions League',
      isPreview: true,
      streamCount: 1,
      isLive: true,
      isEnded: false,
      streams: [{ id: -201, label: 'Preview stream', url: 'https://example.com/preview-stream', healthStatus: 'healthy' }],
      headToHead: {
        form: {
          home: { matches: [{ date: 'Sep 8', competition: 'Demo', opponent: 'North FC', score: '3:1', result: 'W' }] },
          away: { matches: [{ date: 'Sep 8', competition: 'Demo', opponent: 'South FC', score: '1:2', result: 'L' }] },
        },
      },
      teams: { home: { name: 'Preview United' }, away: { name: 'Form City' } },
    },
    {
      id: -3,
      title: 'Finished Athletic – Replay FC',
      dateLabel: previousDay,
      timeLabel: '18:45',
      scheduledStartAt: endedStart,
      sourceIsLive: false,
      sourceStatusAt: Date.now(),
      leagueLabel: 'Champions League',
      isPreview: true,
      streamCount: 0,
      isLive: false,
      isEnded: true,
      streams: [],
      headToHead: {
        form: {
          home: { matches: [{ date: 'Sep 7', competition: 'Demo', opponent: 'West FC', score: '2:0', result: 'W' }] },
          away: { matches: [{ date: 'Sep 7', competition: 'Demo', opponent: 'East FC', score: '0:0', result: 'D' }] },
        },
      },
      teams: { home: { name: 'Finished Athletic' }, away: { name: 'Replay FC' } },
    },
  ];
}
