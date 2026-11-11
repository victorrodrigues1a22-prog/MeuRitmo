"use client";

import { useLayoutEffect } from "react";

const THEME_KEY = "rotinamed.theme";

export function ThemeSync() {
  useLayoutEffect(() => {
    const applyTheme = () => {
      try {
        document.documentElement.dataset.theme =
          localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
      } catch {
        document.documentElement.dataset.theme = "light";
      }
    };

    applyTheme();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) applyTheme();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return null;
}
