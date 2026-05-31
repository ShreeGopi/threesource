"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "threesource-theme";

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme =
      window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";

    setTheme(storedTheme);
    applyTheme(storedTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
    >
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 rounded-full bg-sky-500 shadow-[0_0_0_3px_rgba(14,165,233,0.16)]"
      />
      {mounted && theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
