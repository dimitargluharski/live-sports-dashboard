import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface Stream {
  id: number;
  label: string;
  url: string;
  language?: string | null;
  bitrate?: string | null;
}

interface StreamModalProps {
  isOpen: boolean;
  gameTitle: string;
  homeTeamName?: string;
  awayTeamName?: string | null;
  homeTeamVisual?: string | null;
  awayTeamVisual?: string | null;
  streams: Stream[];
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
  onClose,
}) => {
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      setSelectedStream(null);
      setIsPlayerLoading(false);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isVideoUrl = (url: string) => {
    return /\.(mp4|webm|mkv|avi|mov)$/i.test(url);
  };

  const handleSelectStream = (stream: Stream) => {
    setSelectedStream(stream);
    setIsPlayerLoading(true);
  };

  const resolvedHomeTeam = homeTeamName || gameTitle;
  const resolvedAwayTeam = awayTeamName || null;

  const renderTeamBadge = (
    teamName: string,
    visualUrl?: string | null,
    align: 'left' | 'right' = 'left',
  ) => {
    const initials = teamName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase();

    const directionClass = align === 'right' ? 'flex-row-reverse text-right' : 'text-left';

    return (
      <div
        className={`flex min-w-0 items-center gap-3 rounded-2xl bg-white/14 px-4 py-3 backdrop-blur-sm ring-1 ring-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] ${directionClass}`}
      >
        {visualUrl ? (
          <img
            src={visualUrl}
            alt={`${teamName} logo`}
            className="h-14 w-14 rounded-full border-2 border-white/75 bg-white p-1.5 object-contain shadow-md"
          />
        ) : (
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/75 bg-white/20 text-lg font-bold text-white">
            {initials || 'TM'}
          </span>
        )}
        <span className="truncate text-[2rem] leading-none font-black tracking-tight text-white md:text-[2.35rem]">
          {teamName}
        </span>
      </div>
    );
  };

  const modalContent = (
    <>
      <div
        className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_rgba(15,23,42,0.14)_45%,_rgba(15,23,42,0.22)_100%)] backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/95 shadow-2xl shadow-slate-900/20 backdrop-blur flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 border-b border-sky-700/80 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-6 py-5">
            <div className="grid min-w-0 grid-cols-1 items-center gap-4 pr-12 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-5">
              {renderTeamBadge(resolvedHomeTeam, homeTeamVisual, 'left')}
              {resolvedAwayTeam && (
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-white/15 text-xl font-black uppercase text-white shadow-sm">
                  vs
                </span>
              )}
              {resolvedAwayTeam ? renderTeamBadge(resolvedAwayTeam, awayTeamVisual, 'right') : <div aria-hidden="true" />}
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/10 to-transparent" />
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-white transition-colors hover:bg-blue-500"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {selectedStream ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <button
                    onClick={() => {
                      setSelectedStream(null);
                      setIsPlayerLoading(false);
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to streams
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                      {selectedStream.label}
                    </span>
                    {selectedStream.language && (
                      <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                        🌐 {selectedStream.language}
                      </span>
                    )}
                    {selectedStream.bitrate && (
                      <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-medium text-slate-600">
                        📊 {selectedStream.bitrate}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-lg">
                  {isPlayerLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-slate-700">
                        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-500" />
                        Loading stream...
                      </div>
                    </div>
                  )}

                  {isVideoUrl(selectedStream.url) ? (
                    <video
                      className="w-full aspect-video"
                      controls
                      autoPlay
                      controlsList="nodownload"
                      onLoadedData={() => setIsPlayerLoading(false)}
                    >
                      <source src={selectedStream.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <iframe
                      className="w-full aspect-video border-0"
                      src={selectedStream.url}
                      title={selectedStream.label}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      onLoad={() => setIsPlayerLoading(false)}
                    />
                  )}
                </div>

                {streams.length > 1 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">More streams</p>
                    <div className="flex flex-wrap gap-2">
                      {streams.map((stream) => {
                        const isActive = selectedStream.id === stream.id;
                        return (
                          <button
                            key={stream.id}
                            onClick={() => handleSelectStream(stream)}
                            className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                              isActive
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-sky-100 hover:text-sky-700'
                            }`}
                          >
                            {stream.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4 text-sm">
                  Choose a stream ({streams.length} available):
                </p>
                <div className="space-y-3">
                  {streams.length > 0 ? (
                    streams.map((stream) => (
                      <button
                        key={stream.id}
                        onClick={() => handleSelectStream(stream)}
                        className="group w-full cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:bg-sky-50/30 hover:shadow-md"
                      >
                        <div className="flex items-center justify-between gap-4 p-4">
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-sm">
                              ▶
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate text-xl font-bold text-blue-700 transition-colors group-hover:text-blue-600">
                                {stream.label}
                              </h3>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
                                {stream.language && (
                                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                    🌐 {stream.language}
                                  </span>
                                )}
                                {stream.bitrate && (
                                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                                    📊 {stream.bitrate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors group-hover:border-sky-300 group-hover:bg-sky-100 group-hover:text-sky-800">
                            Play
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-lg text-gray-500">
                        😔 No streams available for this game
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="bg-slate-50/90 px-6 py-4 border-t border-slate-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
