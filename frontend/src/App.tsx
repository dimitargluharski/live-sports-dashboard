import { FeedStatus } from './components/FeedStatus';
import { GamesGrid } from "./components/GamesGrid";
import { ThemeProvider } from './contexts/ThemeProvider';
import { SPORT_STORAGE_KEY } from './constants/app';
import { useGamesFeed } from "./hooks/useGamesFeed";
import { usePersistentState } from './hooks/usePersistentState';
import { LiveScores } from './components/LiveScores';
import type { AppTab } from './types/game';

function App() {
  const [tab, setTab] = usePersistentState<AppTab>(SPORT_STORAGE_KEY, 'soccer');
  const isLiveScores = tab === 'livescores';
  const { games, isLoading, error } = useGamesFeed(isLiveScores ? 'soccer' : tab);

  return (
    <ThemeProvider>
      <div className="min-h-screen py-8 text-slate-950">
        {!isLiveScores && <FeedStatus isLoading={isLoading} error={error} />}
        <GamesGrid
          games={isLiveScores ? [] : games}
          sport={tab}
          onSportChange={setTab}
          liveScores={isLiveScores ? <LiveScores /> : undefined}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
