import { useMemo } from 'react';
import { FeedStatus } from './components/FeedStatus';
import { GamesGrid } from "./components/GamesGrid";
import { GlobalSearch } from './components/GlobalSearch';
import { ResultsPage } from './components/ResultsPage';
import { Sidebar } from './components/Sidebar';
import { ThemeProvider } from './contexts/ThemeProvider';
import { SPORT_STORAGE_KEY, SPORTS } from './constants/app';
import { useGamesFeed } from "./hooks/useGamesFeed";
import { usePersistentState } from './hooks/usePersistentState';
import { useResultsFeed } from './hooks/useResultsFeed';
import type { Page, Sport } from './types/game';

function isSport(value: string): value is Sport {
  return (SPORTS as string[]).includes(value);
}

function App() {
  const [storedTab, setTab] = usePersistentState<Page>(SPORT_STORAGE_KEY, 'soccer');
  // A previously saved removed page (e.g. "livescores") falls back to soccer.
  const tab: Page = storedTab === 'results' || isSport(storedTab) ? storedTab : 'soccer';
  const isResults = tab === 'results';
  const sportFeed = useGamesFeed(isSport(tab) ? tab : 'soccer', !isResults);
  const resultsFeed = useResultsFeed(true);
  const { isLoading, lastUpdatedAt } = isResults ? resultsFeed : sportFeed;
  const error = isResults ? null : sportFeed.error;

  // Sidebar badges: live games per sport, finished games for Results.
  const counts = useMemo(() => {
    const result: Partial<Record<Page, number>> = { results: 0 };
    for (const game of resultsFeed.games) {
      if (game.isPreview || !game.sport) continue;
      if (game.isEnded) result.results = (result.results ?? 0) + 1;
      else if (game.isLive) result[game.sport] = (result[game.sport] ?? 0) + 1;
    }
    return result;
  }, [resultsFeed.games]);

  return (
    <ThemeProvider>
      <Sidebar activePage={tab} onPageChange={setTab} counts={counts} />
      <div className="min-h-screen pl-16 text-slate-950">
        <GlobalSearch lastUpdatedAt={lastUpdatedAt} />
        <FeedStatus isLoading={isLoading} error={error} />
        {!isLoading && (isResults ? <ResultsPage games={resultsFeed.games} /> : <GamesGrid games={sportFeed.games} />)}
      </div>
    </ThemeProvider>
  );
}

export default App;
