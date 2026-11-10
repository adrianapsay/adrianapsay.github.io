"use client";

import { useLayoutEffect } from "react";

// Dark is the default; light only when the visitor has picked it with the toggle.
// The inline script in app/layout.tsx applies the saved choice before first paint.
function saved() {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

export function ThemeToggle() {
  // Re-apply after React clears <html> attributes on the dev Strict Mode remount. No-op in production.
  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", saved() === "light" ? "light" : "dark");
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable: the toggle still works for this visit */
    }
  }

  return (
    <button className="theme" type="button" aria-label="Toggle dark mode" onClick={toggle}>
      ◐
    </button>
  );
}
