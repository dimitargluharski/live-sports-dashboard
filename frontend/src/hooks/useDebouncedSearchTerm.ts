import { useEffect, useState } from 'react';
import { useSearchStore } from '../stores/useSearchStore';

const DEFAULT_DEBOUNCE_DELAY_MS = 300;

export function useDebouncedSearchTerm(delayMs = DEFAULT_DEBOUNCE_DELAY_MS): string {
  const searchTerm = useSearchStore((state) => state.searchTerm);
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(normalizedSearchTerm);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(normalizedSearchTerm);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, normalizedSearchTerm]);

  return debouncedSearchTerm;
}
