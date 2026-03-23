import { useState, useEffect } from "react";

export function useDiscordUserId() {
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("discordUserId") || "";
      setUserId(stored);
    }
  }, []);

  function saveUserId(id: string) {
    setUserId(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("discordUserId", id);
    }
  }

  return { userId, saveUserId };
}