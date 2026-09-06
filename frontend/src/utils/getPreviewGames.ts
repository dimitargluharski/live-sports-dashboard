import type { Game } from '../types/game';
import { parseScheduledStart } from './parseScheduledStart';

export function getPreviewGames(): Game[] {
  if (!new URLSearchParams(window.location.search).has('tests')) return [];

  const scheduledStartAt = parseScheduledStart('1 September', '00:00')?.getTime();
  return [{
    id: -1,
    title: 'Preview United – Finished City',
    dateLabel: '1 September',
    timeLabel: '00:00',
    scheduledStartAt,
    leagueLabel: 'Demo. Ended match preview',
    streamCount: 0,
    isLive: false,
    isEnded: true,
    streams: [],
    teams: {
      home: { name: 'Preview United' },
      away: { name: 'Finished City' },
    },
  }];
}
