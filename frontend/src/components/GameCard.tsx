import React, { useState } from 'react';
import { GameCardForm } from './GameCardForm';
import { GameCardHeadToHead } from './GameCardHeadToHead';
import { GameCardHeader } from './GameCardHeader';
import { GameCardStreams } from './GameCardStreams';
import { GameCardTabs } from './GameCardTabs';
import { StreamModal } from './StreamModal';
import type { HeadToHead, Stream } from '../types/game';
import { getFormInsight } from '../utils/getFormInsight';
import { getFormSummary } from '../utils/getFormSummary';
import { splitGameTitle } from '../utils/splitGameTitle';

interface GameCardProps {
  id: number;
  title: string;
  countryOrLeagueLabel?: string;
  flagUrl?: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  leagueLabel?: string;
  streamCount: number;
  isLive: boolean;
  isEnded?: boolean;
  streams?: Stream[];
  headToHead?: HeadToHead | null;
  isDarkTheme?: boolean;
}

export const GameCard = React.memo<GameCardProps>(({
  title,
  flagUrl,
  homeLogoUrl,
  awayLogoUrl,
  timeLabel,
  streamCount,
  isLive,
  isEnded = false,
  streams = [],
  headToHead = null,
  isDarkTheme = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'streams' | 'h2h' | 'form'>('streams');
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [initialStream, setInitialStream] = useState<Stream | null>(null);

  const hasStreams = streamCount > 0;
  const canWatchStreams = hasStreams && !isEnded;
  const h2hMatches = headToHead?.matches || [];
  const hasForm = Boolean(headToHead?.form?.home?.matches?.length || headToHead?.form?.away?.matches?.length);
  const canExpand = canWatchStreams || h2hMatches.length > 0 || hasForm;
  const visibleTab = activeTab === 'streams' && !canWatchStreams
    ? h2hMatches.length > 0 ? 'h2h' : 'form'
    : activeTab;
  const [resolvedHome, resolvedAwayName] = splitGameTitle(title);
  const resolvedAway = resolvedAwayName || null;
  const formSummary = getFormSummary(h2hMatches);

  const startWatchSession = (stream: Stream) => {
    setInitialStream(stream);
    setShowStreamModal(true);
  };

  const toggleExpanded = () => {
    if (canExpand) setIsExpanded((expanded) => !expanded);
  };

  const formInsights = headToHead?.form
    ? [
      getFormInsight(resolvedHome, headToHead.form.home),
      getFormInsight(resolvedAway || 'Away team', headToHead.form.away),
    ].filter((insight): insight is string => Boolean(insight))
    : [];

  return (
    <article className={`group rounded-lg border border-l-4 px-2.5 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-3 ${
      isDarkTheme
        ? isEnded ? 'border-white/15 bg-[#121212]' : 'border-white/10 bg-[#1b1b1b]'
        : isEnded ? 'border-stone-500 bg-stone-300' : 'border-black/10 bg-white'} ${
      isEnded
        ? isDarkTheme ? 'border-l-slate-700' : 'border-l-stone-700'
        : isLive ? 'border-l-rose-500' : isDarkTheme ? 'border-l-slate-500' : 'border-l-black'
    }`}>
      <GameCardHeader
        timeLabel={timeLabel}
        isLive={isLive}
        isEnded={isEnded}
        isDarkTheme={isDarkTheme}
        canExpand={canExpand}
        isExpanded={isExpanded}
        canWatchStreams={canWatchStreams}
        hasStreams={hasStreams}
        streamCount={streamCount}
        homeTeam={resolvedHome}
        awayTeam={resolvedAway}
        homeLogoUrl={homeLogoUrl}
        awayLogoUrl={awayLogoUrl}
        flagUrl={flagUrl}
        onToggle={toggleExpanded}
      />

      {isExpanded && canExpand && (
        <div className="mt-2 pt-1">
          <GameCardTabs
            activeTab={visibleTab}
            canWatchStreams={canWatchStreams}
            h2hCount={h2hMatches.length}
            hasForm={hasForm}
            isDarkTheme={isDarkTheme}
            onChange={setActiveTab}
          />
          {visibleTab === 'streams' && canWatchStreams && (
            <GameCardStreams streams={streams} isDarkTheme={isDarkTheme} onSelect={startWatchSession} />
          )}
          {visibleTab === 'h2h' && h2hMatches.length > 0 && (
            <GameCardHeadToHead homeTeam={resolvedHome} matches={h2hMatches} summary={formSummary} isDarkTheme={isDarkTheme} />
          )}
          {visibleTab === 'form' && hasForm && headToHead?.form && (
            <GameCardForm
              homeTeam={resolvedHome}
              awayTeam={resolvedAway}
              homeLogoUrl={homeLogoUrl}
              awayLogoUrl={awayLogoUrl}
              flagUrl={flagUrl}
              homeForm={headToHead.form.home}
              awayForm={headToHead.form.away}
              insights={formInsights}
              isEnded={isEnded}
              isDarkTheme={isDarkTheme}
            />
          )}
        </div>
      )}

      {showStreamModal && (
        <StreamModal
          isOpen={showStreamModal}
          gameTitle={title}
          homeTeamName={resolvedHome}
          awayTeamName={resolvedAway}
          homeTeamVisual={homeLogoUrl || flagUrl || null}
          awayTeamVisual={awayLogoUrl || flagUrl || null}
          streams={streams}
          initialStream={initialStream}
          isDarkTheme={isDarkTheme}
          onClose={() => {
            setShowStreamModal(false);
            setInitialStream(null);
          }}
        />
      )}
    </article>
  );
});
