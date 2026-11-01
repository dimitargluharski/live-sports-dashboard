import { StreamHealthDot } from './StreamHealthDot';
import type { Stream } from '../types/game';

interface StreamSelectorProps {
  streams: Stream[];
  selectedStream?: Stream | null;
  isDarkTheme: boolean;
  onSelect: (stream: Stream) => void;
}

function StreamMetadata({ stream, isDarkTheme }: { stream: Stream; isDarkTheme: boolean }) {
  const metadata = [stream.language, stream.bitrate].filter(Boolean).join(' · ');
  if (!metadata) return null;

  return (
    <span className={`ml-1 shrink-0 text-xs font-medium ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
      {metadata}
    </span>
  );
}

export function StreamSelector({
  streams,
  selectedStream = null,
  isDarkTheme,
  onSelect,
}: StreamSelectorProps) {
  if (selectedStream) {
    if (streams.length <= 1) return null;

    return (
      <div className="border-t border-black/10 p-3 dark:border-white/10">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Alternative broadcasts</p>
          <span className="shrink-0 text-[10px] font-bold text-slate-400">{streams.length} available</span>
        </div>
        <div className={`grid max-h-36 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 ${isDarkTheme ? 'scrollbar-thumb-white/20' : 'scrollbar-thumb-black/20'}`}>
          {streams.map((stream) => {
            const isActive = selectedStream.id === stream.id;

            return (
              <button
                key={stream.id}
                type="button"
                onClick={() => onSelect(stream)}
                aria-pressed={isActive}
                className={`flex min-w-0 cursor-pointer items-center rounded-md border px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : isDarkTheme
                      ? 'border-white/10 bg-[#252525] text-slate-200 hover:border-sky-400/60 hover:bg-[#303030] hover:text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                }`}
              >
                <span className="inline-flex min-w-0 items-center gap-2 leading-none">
                  <StreamHealthDot stream={stream} />
                  <span className="truncate">{stream.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <p className={`mb-2 text-xs font-semibold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        Choose a stream ({streams.length} available):
      </p>
      <div className="space-y-1.5">
        {streams.length > 0 ? (
          streams.map((stream) => (
            <button
              key={stream.id}
              type="button"
              onClick={() => onSelect(stream)}
              className={`group w-full cursor-pointer overflow-hidden rounded-md border text-left transition-colors ${isDarkTheme ? 'border-white/10 bg-[#252525] hover:border-white/30 hover:bg-[#303030]' : 'border-black/10 bg-[#f2f1ed] hover:border-black/30 hover:bg-white'}`}
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h3 className={`flex items-center gap-2 truncate text-base font-bold leading-none ${isDarkTheme ? 'text-white' : 'text-slate-950'}`}>
                    <StreamHealthDot stream={stream} />
                    <span className="truncate">{stream.label}</span>
                    <StreamMetadata stream={stream} isDarkTheme={isDarkTheme} />
                  </h3>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-bold ${isDarkTheme ? 'text-slate-300' : 'text-slate-600'}`}>
                  Watch
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-lg text-gray-500">😔 No streams available for this game</p>
          </div>
        )}
      </div>
    </>
  );
}
