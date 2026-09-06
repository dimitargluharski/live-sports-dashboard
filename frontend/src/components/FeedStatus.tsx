interface FeedStatusProps {
  isLoading: boolean;
  error: Error | null;
}

export function FeedStatus({ isLoading, error }: FeedStatusProps) {
  if (isLoading) {
    return <p role="status" className="mx-auto max-w-7xl px-4 pb-3 text-sm text-slate-500 md:px-6">Loading matches...</p>;
  }

  if (error) {
    return <p role="alert" className="mx-auto max-w-7xl px-4 pb-3 text-sm font-semibold text-rose-600 md:px-6">Unable to refresh matches: {error.message}</p>;
  }

  return null;
}
