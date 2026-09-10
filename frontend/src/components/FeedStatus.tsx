interface FeedStatusProps {
  isLoading: boolean;
  error: Error | null;
}

export function FeedStatus({ isLoading, error }: FeedStatusProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Loading matches" className="fixed right-4 top-4 z-50">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
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
