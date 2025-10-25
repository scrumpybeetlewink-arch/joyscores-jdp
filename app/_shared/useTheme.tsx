"use client";

import { useEffect, useState } from "react";

export type Theme =
  | "joy-dark"
  | "night-pro"
  | "neon-court"
  | "daylight"
  | "grass-club";

const DEFAULT_THEME: Theme = "joy-dark"; // always start with JoyScores original

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const saved = window.localStorage.getItem("joyscores-theme") as Theme | null;
    const initial = saved || DEFAULT_THEME;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("joyscores-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
