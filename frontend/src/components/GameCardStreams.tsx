import React, { useState } from 'react';
import { StreamHealthDot } from './StreamHealthDot';
import type { Stream } from '../types/game';

const INITIAL_STREAM_LIMIT = 10;

interface GameCardStreamsProps {
  streams: Stream[];
  isDarkTheme: boolean;
  onSelect: (stream: Stream) => void;
}

export const GameCardStreams: React.FC<GameCardStreamsProps> = ({ streams, isDarkTheme, onSelect }) => {
  const [visibleStreamCount, setVisibleStreamCount] = useState(INITIAL_STREAM_LIMIT);
  const hasMoreStreams = streams.length > visibleStreamCount;
  const visibleStreams = streams.slice(0, visibleStreamCount);

  return (
    <>
    <div className={`mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`} aria-label="Stream status legend">
      <span className="font-black uppercase tracking-[0.08em]">Stream status</span>
      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Available</span>
      <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Unavailable</span>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {visibleStreams.map((stream) => (
        <button key={stream.id} type="button" onClick={() => onSelect(stream)} className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${isDarkTheme ? 'border-white/10 bg-[#252525] hover:border-white/40 hover:bg-[#303030]' : 'border-black/10 bg-[#f2f1ed] hover:border-black hover:bg-white'}`}>
          <span className="flex min-w-0 items-center gap-2 leading-none"><StreamHealthDot stream={stream} /><span className={`truncate text-sm font-bold ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>{stream.label}</span></span>
          <span className={`ml-3 shrink-0 text-xs font-bold ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>Watch →</span>
        </button>
      ))}
    </div>
    {hasMoreStreams && (
      <button
        type="button"
        onClick={() => setVisibleStreamCount((current) => Math.min(current + INITIAL_STREAM_LIMIT, streams.length))}
        className={`mt-3 w-full cursor-pointer rounded-md border px-3 py-2 text-xs font-black transition-colors ${isDarkTheme ? 'border-white/15 text-slate-300 hover:border-white/35 hover:bg-white/5' : 'border-black/10 text-slate-600 hover:border-black/25 hover:bg-black/[0.03]'}`}
      >
        Show more streams ({streams.length - visibleStreamCount})
      </button>
    )}
  </>
  );
};
