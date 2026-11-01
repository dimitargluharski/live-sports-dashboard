import { FeedStatus } from './components/FeedStatus';
import { GamesGrid } from "./components/GamesGrid";
import { GlobalSearch } from './components/GlobalSearch';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeProvider';
import { SPORT_STORAGE_KEY } from './constants/app';
import { useGamesFeed } from "./hooks/useGamesFeed";
import { usePersistentState } from './hooks/usePersistentState';
import type { Sport } from './types/game';

function App() {
  const [storedTab, setTab] = usePersistentState<Sport>(SPORT_STORAGE_KEY, 'soccer');
  // A previously saved removed page (e.g. "livescores") falls back to soccer.
  const tab: Sport = storedTab === 'basketball' ? 'basketball' : 'soccer';
  const { games, isLoading, error } = useGamesFeed(tab);

  return (
    <ThemeProvider>
      <Sidebar activePage={tab} onPageChange={setTab} />
      <div className="min-h-screen pl-16 text-slate-950">
        <GlobalSearch />
        <FeedStatus isLoading={isLoading} error={error} />
        {!isLoading && <GamesGrid games={games} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
