import React from 'react';

type GameCardTab = 'streams' | 'h2h' | 'form';

interface GameCardTabsProps {
  activeTab: GameCardTab;
  canWatchStreams: boolean;
  h2hCount: number;
  hasForm: boolean;
  isDarkTheme: boolean;
  onChange: (tab: GameCardTab) => void;
}

export const GameCardTabs: React.FC<GameCardTabsProps> = ({
  activeTab,
  canWatchStreams,
  h2hCount,
  hasForm,
  isDarkTheme,
  onChange,
}) => (
  <div className={`mb-2 flex gap-1 border-b ${isDarkTheme ? 'border-white/10' : 'border-black/10'}`}>
    {canWatchStreams && <button type="button" onClick={() => onChange('streams')} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${activeTab === 'streams' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400'}`}>Streams</button>}
    {h2hCount > 0 && <button type="button" onClick={() => onChange('h2h')} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${activeTab === 'h2h' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400'}`}>H2H ({h2hCount})</button>}
    {hasForm && <button type="button" onClick={() => onChange('form')} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${activeTab === 'form' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400'}`}>Form</button>}
  </div>
);
