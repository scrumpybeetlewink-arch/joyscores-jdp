"use client";

import { useEffect, useState } from "react";

export type Theme =
  | "joy-dark"
  | "night-pro"
  | "neon-court"
  | "daylight"
  | "grass-club";

const DEFAULT_THEME: Theme = "joy-dark"; // keep original as default

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // hydrate from localStorage on mount
  useEffect(() => {
    const saved = window.localStorage.getItem("joyscores-theme") as Theme | null;
    const initial = saved || DEFAULT_THEME;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  // sync changes to <html data-theme="..."> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("joyscores-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
