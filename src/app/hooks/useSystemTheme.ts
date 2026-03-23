"use client";

import { useEffect, useState } from "react";

export type SystemTheme = "light" | "dark";

function getPreferredTheme(): SystemTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useSystemTheme(): SystemTheme {
  const [theme, setTheme] = useState<SystemTheme>(getPreferredTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const onChange = (event: MediaQueryListEvent) => {
      setTheme(event.matches ? "dark" : "light");
    };

    setTheme(mediaQuery.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  return theme;
}