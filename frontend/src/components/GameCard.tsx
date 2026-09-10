import React, { useEffect, useState } from 'react';
import { GameCardForm } from './GameCardForm';
import { GameCardHeadToHead } from './GameCardHeadToHead';
import { GameCardHeader } from './GameCardHeader';
import { GameCardStreams } from './GameCardStreams';
import { GameCardTabs } from './GameCardTabs';
import { StreamModal } from './StreamModal';
import type { HeadToHead, Stream } from '../types/game';
import { getFormInsight } from '../utils/getFormInsight';
import { getFormSummary } from '../utils/getFormSummary';
import { getDominantLogoColor } from '../utils/getDominantLogoColor';
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
  isPreview?: boolean;
  streams?: Stream[];
  headToHead?: HeadToHead | null;
  teams?: {
    home?: { name?: string | null };
    away?: { name?: string | null };
  };
  isDarkTheme?: boolean;
  isChampionsLeague?: boolean;
  isCarouselActive?: boolean;
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
  isPreview = false,
  streams = [],
  headToHead = null,
  teams,
  isDarkTheme = false,
  isChampionsLeague = false,
  isCarouselActive = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'streams' | 'h2h' | 'form'>('streams');
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [initialStream, setInitialStream] = useState<Stream | null>(null);
  const [homeAccentColor, setHomeAccentColor] = useState<string | null>(null);
  const [awayAccentColor, setAwayAccentColor] = useState<string | null>(null);

  const hasStreams = streamCount > 0;
  const canWatchStreams = hasStreams && !isEnded;
  const h2hMatches = headToHead?.matches || [];
  const hasForm = Boolean(headToHead?.form?.home?.matches?.length || headToHead?.form?.away?.matches?.length);
  const canExpand = canWatchStreams || h2hMatches.length > 0 || hasForm;
  const visibleTab = activeTab === 'streams' && !canWatchStreams
    ? h2hMatches.length > 0 ? 'h2h' : 'form'
    : activeTab;
  const [titleHome, titleAway] = splitGameTitle(title);
  const explicitHome = teams?.home?.name?.trim() || null;
  const explicitAway = teams?.away?.name?.trim() || null;
  const resolvedHome = explicitHome || titleHome;
  const resolvedAway = explicitAway || titleAway || null;
  const formSummary = getFormSummary(h2hMatches);

  useEffect(() => {
    if (!isCarouselActive) setIsExpanded(false);
  }, [isCarouselActive]);

  useEffect(() => {
    if (!isChampionsLeague) return;

    let isCurrent = true;
    Promise.all([getDominantLogoColor(homeLogoUrl), getDominantLogoColor(awayLogoUrl)])
      .then(([homeColor, awayColor]) => {
        if (!isCurrent) return;
        setHomeAccentColor(homeColor);
        setAwayAccentColor(awayColor);
      });

    return () => {
      isCurrent = false;
    };
  }, [awayLogoUrl, homeLogoUrl, isChampionsLeague]);

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
  const dynamicBorderStyle = isChampionsLeague && !isPreview && isLive && (homeAccentColor || awayAccentColor)
    ? {
      border: '2px solid transparent',
      background: `linear-gradient(${isDarkTheme ? '#1b1b1b' : isEnded ? '#f3f1ed' : '#ffffff'}, ${isDarkTheme ? '#1b1b1b' : isEnded ? '#f3f1ed' : '#ffffff'}) padding-box, linear-gradient(135deg, ${homeAccentColor || awayAccentColor}, ${awayAccentColor || homeAccentColor}) border-box`,
    }
    : undefined;

  return (
    <article className={`group ${isChampionsLeague ? 'mx-auto w-full max-w-3xl' : ''} rounded-lg border px-2.5 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-3 ${
      isChampionsLeague && !isPreview
        ? isDarkTheme
          ? isEnded ? 'rounded-xl border-white/10 border-t border-l-2 border-t-neutral-400 border-l-neutral-400 bg-[#202020] px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.14)] sm:px-5' : 'rounded-xl border-white/10 border-t border-l-2 border-t-neutral-400 border-l-neutral-400 bg-[#1b1b1b] px-4 py-3 shadow-[0_10px_22px_rgba(0,0,0,0.16)] sm:px-5'
          : isEnded ? 'rounded-xl border-stone-300 border-t border-l-2 border-t-stone-400 border-l-stone-400 bg-[#f3f1ed] px-4 py-3 shadow-[0_8px_18px_rgba(71,62,48,0.08)] sm:px-5' : 'rounded-xl border-slate-200 border-t border-l-2 border-t-slate-300 border-l-slate-300 bg-white px-4 py-3 shadow-[0_10px_22px_rgba(71,62,48,0.08)] sm:px-5'
        : isPreview && isLive
           ? isDarkTheme ? 'rounded-xl border-white/10 border-t-2 border-l-4 border-t-rose-500 border-l-rose-500 bg-[#2a171c] px-4 py-3 shadow-[0_10px_22px_rgba(244,63,94,0.16)] sm:px-5' : 'rounded-xl border-black/10 border-t-2 border-l-4 border-t-rose-500 border-l-rose-500 bg-rose-50 px-4 py-3 shadow-[0_10px_22px_rgba(244,63,94,0.14)] sm:px-5'
        : isDarkTheme
          ? isEnded ? 'border-white/15 border-l-4 bg-[#121212]' : 'border-white/10 border-l-4 bg-[#1b1b1b]'
          : isEnded ? 'border-stone-500 border-l-4 bg-stone-300' : 'border-black/10 border-l-4 bg-white'} ${
      isChampionsLeague ? '' :
      isEnded
        ? isDarkTheme ? 'border-l-slate-700' : 'border-l-stone-700'
        : isLive ? 'border-l-rose-500' : isDarkTheme ? 'border-l-slate-500' : 'border-l-black'
    }`}
      style={dynamicBorderStyle}
      data-streams-available={canWatchStreams ? 'true' : 'false'}
    >
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
        hideScheduledTime={false}
        horizontalTeams={isChampionsLeague}
        homeForm={headToHead?.form?.home}
        awayForm={headToHead?.form?.away}
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
