import { FeedStatus } from './components/FeedStatus';
import { GamesGrid } from "./components/GamesGrid";
import { ThemeProvider } from './contexts/ThemeProvider';
import { SPORT_STORAGE_KEY } from './constants/app';
import { useGamesFeed } from "./hooks/useGamesFeed";
import { usePersistentState } from './hooks/usePersistentState';
import type { Sport } from './types/game';

function App() {
  const [sport, setSport] = usePersistentState<Sport>(SPORT_STORAGE_KEY, 'soccer');
  const { games, isLoading, error } = useGamesFeed(sport);

  return (
    <ThemeProvider>
      <div className="min-h-screen py-8 text-slate-950">
        <FeedStatus isLoading={isLoading} error={error} />
        <GamesGrid games={games} sport={sport} onSportChange={setSport} />
      </div>
    </ThemeProvider>
  );
}

export default App;
