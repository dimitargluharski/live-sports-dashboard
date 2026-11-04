import { CarouselCardHeader } from './CarouselCardHeader';
import { CompactGameRow } from './CompactGameRow';
import type { WinChances } from '../types/game';

export type GameCardHeaderVariant = 'compact' | 'carousel';

interface GameCardHeaderProps {
  variant: GameCardHeaderVariant;
  leagueLabel?: string;
  timeLabel?: string;
  isLive: boolean;
  isEnded: boolean;
  isDarkTheme: boolean;
  canExpand: boolean;
  isExpanded: boolean;
  canWatchStreams: boolean;
  hasStreams: boolean;
  streamCount: number;
  h2hCount?: number;
  hasForm?: boolean;
  score?: string;
  homeTeam: string;
  awayTeam: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  flagUrl?: string | null;
  showWinChances?: boolean;
  winChances?: WinChances | null;
  onToggle: () => void;
}

export function GameCardHeader({
  variant,
  leagueLabel,
  h2hCount = 0,
  hasForm = false,
  showWinChances = false,
  winChances,
  ...shared
}: GameCardHeaderProps) {
  if (variant === 'carousel') {
    return <CarouselCardHeader {...shared} leagueLabel={leagueLabel} winChances={winChances ?? { home: 50, away: 50 }} />;
  }
  return <CompactGameRow {...shared} h2hCount={h2hCount} hasForm={hasForm} showWinChances={showWinChances} winChances={winChances} />;
}
