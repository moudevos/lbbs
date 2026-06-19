"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { CONTROL_THEME_KEY } from "./control-theme-provider";

export function ControlThemeSelector({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState("dark-functional");

  useEffect(() => {
    setTheme(localStorage.getItem(CONTROL_THEME_KEY) ?? "dark-functional");
  }, []);

  function changeTheme(next: string) {
    setTheme(next);
    localStorage.setItem(CONTROL_THEME_KEY, next);
    window.dispatchEvent(new CustomEvent("control-preferences-change", { detail: { theme: next } }));
  }

  return (
    <label className={`min-w-0 text-sm text-[var(--control-muted)] ${compact ? "flex items-center gap-2" : "grid gap-2"}`}>
      <span className="inline-flex shrink-0 items-center gap-2"><Palette size={15} /> Tema</span>
      <select className="control-input min-w-0" value={theme} onChange={(event) => changeTheme(event.target.value)}>
        <option value="dark-functional">Funcional oscuro</option>
        <option value="light-operational">Claro operativo</option>
        <option value="high-contrast">Alto contraste</option>
      </select>
    </label>
  );
}
