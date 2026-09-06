import { FeedStatus } from './components/FeedStatus';
import { GamesGrid } from "./components/GamesGrid";
import { ThemeProvider } from './contexts/ThemeProvider';
import { useGamesFeed } from "./hooks/useGamesFeed";

function App() {
  const { games, isLoading, error } = useGamesFeed();

  return (
    <ThemeProvider>
      <div className="min-h-screen py-8 text-slate-950">
        <FeedStatus isLoading={isLoading} error={error} />
        <GamesGrid games={games} />
      </div>
    </ThemeProvider>
  );
}

export default App;
