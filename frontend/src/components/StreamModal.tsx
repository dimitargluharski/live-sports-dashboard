import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TeamBadge } from './TeamBadge';
import { StreamHealthDot } from './StreamHealthDot';
import { StreamPlayer } from './StreamPlayer';
import { StreamSelector } from './StreamSelector';
import type { Stream } from '../types/game';
import { getDominantLogoColor } from '../utils/getDominantLogoColor';
import { isWrapperStreamUrl } from '../utils/isWrapperStreamUrl';

interface StreamModalProps {
  isOpen: boolean;
  gameTitle: string;
  homeTeamName?: string;
  awayTeamName?: string | null;
  homeTeamVisual?: string | null;
  awayTeamVisual?: string | null;
  streams: Stream[];
  initialStream?: Stream | null;
  isDarkTheme?: boolean;
  onClose: () => void;
}

export const StreamModal: React.FC<StreamModalProps> = ({
  isOpen,
  gameTitle,
  homeTeamName,
  awayTeamName,
  homeTeamVisual,
  awayTeamVisual,
  streams,
  initialStream = null,
  isDarkTheme = false,
  onClose,
}) => {
  const [selectedStream, setSelectedStream] = useState<Stream | null>(initialStream);
  const [isPlayerLoading, setIsPlayerLoading] = useState(Boolean(
    initialStream
      && initialStream.healthStatus !== 'failed'
      && !isWrapperStreamUrl(initialStream.url),
  ));
  const [hasPlaybackError, setHasPlaybackError] = useState(false);
  const [homeTeamColor, setHomeTeamColor] = useState<string | null>(null);
  const [awayTeamColor, setAwayTeamColor] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    let isCurrent = true;
    Promise.all([getDominantLogoColor(homeTeamVisual), getDominantLogoColor(awayTeamVisual)])
      .then(([homeColor, awayColor]) => {
        if (!isCurrent) return;
        setHomeTeamColor(homeColor);
        setAwayTeamColor(awayColor);
      });

    return () => {
      isCurrent = false;
    };
  }, [homeTeamVisual, awayTeamVisual]);

  if (!isOpen) return null;

  const handleSelectStream = (stream: Stream) => {
    setSelectedStream(stream);
    setIsPlayerLoading(stream.healthStatus !== 'failed' && !isWrapperStreamUrl(stream.url));
    setHasPlaybackError(false);
  };

  const selectedStreamUnavailable = Boolean(
    selectedStream && (selectedStream.healthStatus === 'failed' || hasPlaybackError),
  );
  const resolvedHomeTeam = homeTeamName || gameTitle;
  const resolvedAwayTeam = awayTeamName || null;
  const modalSurfaceClass = isDarkTheme ? 'border-white/10 bg-[#1b1b1b] text-white' : 'border-black/10 bg-white text-slate-950';
  const headerClass = isDarkTheme ? 'border-white/10 bg-[#1b1b1b]' : 'border-black/10 bg-[#f2f1ed]';
  const vsClass = isDarkTheme ? 'border-white/20 bg-[#252525] text-white' : 'border-black/10 bg-white text-slate-950';
  const homeHeaderColor = homeTeamColor || (isDarkTheme ? '#252525' : '#f2f1ed');
  const awayHeaderColor = awayTeamColor || (isDarkTheme ? '#252525' : '#f2f1ed');
  const homeHeaderTint = `color-mix(in srgb, ${homeHeaderColor} 10%, transparent)`;
  const awayHeaderTint = `color-mix(in srgb, ${awayHeaderColor} 10%, transparent)`;
  const headerTintStyle = homeTeamColor || awayTeamColor
    ? {
      background: `linear-gradient(135deg, ${homeHeaderTint} 0%, ${homeHeaderTint} 35%, ${awayHeaderTint} 65%, ${awayHeaderTint} 100%)`,
    }
    : undefined;

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(15,23,42,0.14)_45%,_rgba(15,23,42,0.22)_100%)] backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="relative w-full max-w-4xl">
          <button
            onClick={onClose}
            className={`absolute -right-3 -top-3 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border p-1 text-white transition-colors ${isDarkTheme ? 'border-[#1b1b1b] bg-rose-500 shadow-[0_0_0_3px_rgba(17,17,17,0.9),0_0_14px_rgba(244,63,94,0.65)] hover:bg-rose-600' : 'border-white bg-rose-500 shadow-[0_0_0_3px_rgba(255,255,255,0.9),0_0_14px_rgba(244,63,94,0.65)] hover:bg-rose-600'}`}
            aria-label="Close stream window"
            title="Close stream window"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
          role="dialog"
          aria-modal="true"
          aria-label={`${gameTitle} stream player`}
          className={`flex max-h-[calc(100dvh-1rem)] w-full flex-col overflow-hidden rounded-xl border shadow-2xl shadow-slate-900/20 backdrop-blur sm:max-h-[90vh] sm:rounded-2xl ${modalSurfaceClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`sticky top-0 border-b px-3 py-2 sm:px-4 sm:py-3 ${headerClass}`}>
            <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
              <TeamBadge
                teamName={resolvedHomeTeam}
                visualUrl={homeTeamVisual}
                accentColor={homeTeamColor}
                isDarkTheme={isDarkTheme}
              />
              {resolvedAwayTeam && (
                <span className={`mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-black uppercase shadow-sm ${vsClass}`}>
                  vs
                </span>
              )}
              {resolvedAwayTeam ? (
                <TeamBadge
                  teamName={resolvedAwayTeam}
                  visualUrl={awayTeamVisual}
                  accentColor={awayTeamColor}
                  isDarkTheme={isDarkTheme}
                />
              ) : <div aria-hidden="true" />}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/10 to-transparent" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-3 sm:p-6" style={headerTintStyle}>
            {selectedStream ? (
              <>
                <div className="mx-2 mb-2 flex flex-wrap items-center justify-between gap-2 px-0 py-0">
                  <button
                    onClick={() => {
                      setSelectedStream(null);
                      setIsPlayerLoading(false);
                      setHasPlaybackError(false);
                    }}
                    className={`inline-flex cursor-pointer items-center gap-2 text-sm font-semibold ${isDarkTheme ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-950'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to stream list
                  </button>

                  <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                    <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${isDarkTheme ? 'border-white/10 bg-[#252525] text-slate-200' : 'border-black/10 bg-white text-slate-700'}`}>
                      <span className="inline-flex items-center gap-2 leading-none">
                        <StreamHealthDot stream={selectedStream} />
                        {selectedStream.label}
                      </span>
                    </span>
                    {selectedStream.language && (
                      <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${isDarkTheme ? 'border-white/10 bg-[#252525] text-slate-200' : 'border-black/10 bg-white text-slate-700'}`}>
                        {selectedStream.language}
                      </span>
                    )}
                    {selectedStream.bitrate && (
                      <span className={`rounded-md border px-2 py-1 text-xs font-medium ${isDarkTheme ? 'border-white/10 bg-[#252525] text-slate-300' : 'border-black/10 bg-[#f2f1ed] text-slate-600'}`}>
                        {selectedStream.bitrate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-4 rounded-2xl p-2">
                  <StreamPlayer
                    stream={selectedStream}
                    isDarkTheme={isDarkTheme}
                    isLoading={isPlayerLoading}
                    isUnavailable={selectedStreamUnavailable}
                    onLoad={() => setIsPlayerLoading(false)}
                    onError={() => {
                      setIsPlayerLoading(false);
                      setHasPlaybackError(true);
                    }}
                  />
                </div>

                <StreamSelector
                  streams={streams}
                  selectedStream={selectedStream}
                  isDarkTheme={isDarkTheme}
                  onSelect={handleSelectStream}
                />
              </>
            ) : (
              <StreamSelector
                streams={streams}
                isDarkTheme={isDarkTheme}
                onSelect={handleSelectStream}
              />
            )}
          </div>

        </div>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
