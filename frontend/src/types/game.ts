export interface TeamForm {
  matches?: Array<{
    date: string;
    competition: string;
    opponent: string;
    score: string;
    result: 'W' | 'D' | 'L';
  }>;
  summary?: { W: number; D: number; L: number };
}

export interface Stream {
  id: number;
  label: string;
  url: string;
  language?: string | null;
  bitrate?: string | null;
  healthStatus?: 'healthy' | 'failed' | 'unknown';
  healthCheckedAt?: string;
  healthHttpStatus?: number;
  healthError?: string;
}

export interface HeadToHead {
  homeTeam?: string;
  awayTeam?: string;
  matches?: Array<{
    date: string;
    competition: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
    result: 'W' | 'D' | 'L';
    winner: 'home' | 'away' | 'draw';
  }>;
  form?: {
    home?: TeamForm;
    away?: TeamForm;
  } | null;
}

export interface Game {
  id: number;
  title: string;
  dateLabel?: string;
  timeLabel?: string;
  scheduledStartAt?: number;
  sourceIsLive?: boolean;
  sourceStatusAt?: number;
  isEnded?: boolean;
  leagueLabel?: string;
  streamCount: number;
  isLive: boolean;
  streams?: Stream[];
  headToHead?: HeadToHead | null;
  teams?: {
    home?: {
      name?: string | null;
      logoUrl?: string | null;
      startingLineup?: string[];
      substitutes?: string[];
    };
    away?: {
      name?: string | null;
      logoUrl?: string | null;
      startingLineup?: string[];
      substitutes?: string[];
    };
  };
}

export interface GamesPayload {
  scrapedAt?: string;
  matches?: Array<Partial<Game>>;
}
