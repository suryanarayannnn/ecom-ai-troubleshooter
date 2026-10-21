"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/themeBoot";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function flip() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked */ }
  }

  return (
    <button type="button" onClick={flip} className="theme-toggle shrink-0" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} title="Toggle theme">
      <span className="knob">{theme === "dark" ? "☾" : "☀"}</span>
    </button>
  );
}
