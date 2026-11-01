interface FeedStatusProps {
  isLoading: boolean;
  error: Error | null;
}

export function FeedStatus({ isLoading, error }: FeedStatusProps) {
  if (isLoading) {
    return (
      <div role="status" aria-label="Loading matches" className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center gap-3 text-slate-500">
        <span className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-600" />
        <span className="text-sm font-medium">Loading matches...</span>
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
