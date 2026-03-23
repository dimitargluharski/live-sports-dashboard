import { useEffect, useRef } from "react";

export type FavoriteMatch = {
  id: string;
  name: string;
  startTime: string;
  links: string[];
};

const NOTIFY_MINUTES = [15, 10, 5, 1];

function getFavorites(): FavoriteMatch[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem("favoriteMatches");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function getNotified(matchId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(`notified_${matchId}`);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setNotified(matchId: string, minutes: number) {
  if (typeof window === "undefined") return;
  const prev = getNotified(matchId);
  const updated = Array.from(new Set([...prev, minutes]));
  localStorage.setItem(`notified_${matchId}`, JSON.stringify(updated));
}

function formatLinks(links: string[]): string {
  if (!links.length) return "";
  return links.map((l, i) => `[Stream ${i + 1}](${l})`).join(" | ");
}

export function useMatchNotifications() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function checkAndNotify() {
      const now = new Date();
      const favorites = getFavorites();
      favorites.forEach(match => {
        const start = new Date(match.startTime);
        const diffMin = Math.round((start.getTime() - now.getTime()) / 60000);
        NOTIFY_MINUTES.forEach(minute => {
          if (diffMin === minute && !getNotified(match.id).includes(minute)) {
            fetch("/api/notify-discord", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                match: {
                  name: match.name,
                  link: match.links[0] || "",
                  links: match.links
                },
                type: `reminder_${minute}`
              })
            });
            setNotified(match.id, minute);
          }
        });
      });
    }
    timerRef.current = setInterval(checkAndNotify, 30000); // Проверка на 30 сек
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}