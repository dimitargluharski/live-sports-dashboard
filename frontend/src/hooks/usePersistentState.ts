import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    const storedValue = window.localStorage.getItem(key);
    if (storedValue === null) return initialValue;

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      if (typeof initialValue === 'boolean') {
        return (storedValue === 'true' || storedValue === 'dark') as T;
      }
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}
