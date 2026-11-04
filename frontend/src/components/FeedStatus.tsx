interface FeedStatusProps {
  isLoading: boolean;
  error: Error | null;
}

export function FeedStatus({ isLoading, error }: FeedStatusProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Loading matches" className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6">
        <div className="mb-4 h-24 animate-pulse rounded-xl bg-slate-300/40" />
        {[0, 1].map((group) => (
          <div key={group} className="mb-4 overflow-hidden rounded-md border border-slate-300/40">
            <div className="h-8 animate-pulse bg-slate-300/40" />
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3 border-t border-slate-300/30 px-3 py-3">
                <div className="h-3 w-12 animate-pulse rounded bg-slate-300/50" />
                <div className="h-3 flex-1 animate-pulse rounded bg-slate-300/40" />
                <div className="h-5 w-5 animate-pulse rounded-full bg-slate-300/50" />
                <div className="h-3 flex-1 animate-pulse rounded bg-slate-300/40" />
              </div>
            ))}
          </div>
        ))}
        <span className="sr-only">Loading matches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p role="alert" className="fixed right-4 top-4 z-50 max-w-xs rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-lg">
        Unable to refresh matches: {error.message}
      </p>
    );
  }

  return null;
}
