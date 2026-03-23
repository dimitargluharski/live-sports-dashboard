import { useState } from 'react';

export type FavoriteMatch = {
  id: string;
  name: string;
  startTime: string;
  link: string;
};

export function useFavoriteMatches() {
  const [favorites, setFavorites] = useState<FavoriteMatch[]>(getFavorites());

  function getFavorites(): FavoriteMatch[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem('favoriteMatches');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(favs: FavoriteMatch[]) {
    setFavorites(favs);
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoriteMatches', JSON.stringify(favs));
    }
  }

  function addFavorite(match: FavoriteMatch) {
    const updated = [...favorites, match];
    saveFavorites(updated);
  }

  function removeFavorite(id: string) {
    const updated = favorites.filter(m => m.id !== id);
    saveFavorites(updated);
  }

  return { favorites, addFavorite, removeFavorite };
}