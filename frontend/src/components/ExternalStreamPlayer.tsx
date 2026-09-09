import React from 'react';

interface ExternalStreamPlayerProps {
  streamUrl: string;
  isDarkTheme: boolean;
}

export const ExternalStreamPlayer: React.FC<ExternalStreamPlayerProps> = ({ streamUrl, isDarkTheme }) => (
  <div className={`flex aspect-[16/10] flex-col items-center justify-center gap-3 rounded-2xl border px-6 text-center ${isDarkTheme ? 'border-white/10 bg-[#151515] text-slate-200' : 'border-black/10 bg-[#f2f1ed] text-slate-700'}`}>
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-2xl" aria-hidden="true">
      ↗
    </span>
    <div>
      <p className="text-base font-bold">External player</p>
      <p className={`mt-1 max-w-md text-sm ${isDarkTheme ? 'text-slate-400' : 'text-slate-500'}`}>
        This provider uses its own page layout. Open it separately for the best playback experience.
      </p>
    </div>
    <a
      href={streamUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      Open external player
    </a>
  </div>
);
