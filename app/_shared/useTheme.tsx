"use client";

import { useEffect, useState } from "react";

export type Theme =
  | "joy-dark"
  | "joy-light"
  | "court-blue"
  | "grass-green";

const DEFAULT_THEME: Theme = "joy-dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  // on mount: read saved theme (if any) and apply it
  useEffect(() => {
    const saved = window.localStorage.getItem("joyscores-theme") as Theme | null;
    const initial = saved || DEFAULT_THEME;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  // whenever theme changes: update <html data-theme="..."> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("joyscores-theme", theme);
  }, [theme]);

  return { theme, setTheme };
}
