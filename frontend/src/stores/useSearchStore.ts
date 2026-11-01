import { useEffect, useState } from 'react';
import { create } from 'zustand';

interface SearchState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchTerm: '',
  setSearchTerm: (searchTerm) => set({ searchTerm }),
}));

export function useDebouncedSearchTerm(delayMs = 300) {
  const searchTerm = useSearchStore((state) => state.searchTerm);
  return useDebouncedValue(searchTerm.trim().toLowerCase(), delayMs);
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
