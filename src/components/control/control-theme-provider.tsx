"use client";

import { useEffect } from "react";

const allowedThemes = new Set(["black-gold", "black-white", "charcoal-soft-gold"]);
const COLOR_MODE_KEY = "lbbs:colorMode";

export function ControlThemeProvider() {
  useEffect(() => {
    let mounted = true;
    function applyColorMode(mode: string | null) {
      document.documentElement.dataset.controlColorMode = mode === "light" ? "light" : "dark";
    }
    applyColorMode(localStorage.getItem(COLOR_MODE_KEY));
    const onColorModeChange = (event: Event) => applyColorMode((event as CustomEvent<string>).detail);
    window.addEventListener("control-color-mode-change", onColorModeChange);
    async function loadTheme() {
      const response = await fetch("/api/control/settings");
      const data = await response.json();
      if (!mounted || !response.ok) return;
      const theme = String(data.settings?.visualTheme ?? "black-gold");
      document.documentElement.dataset.controlTheme = allowedThemes.has(theme) && theme !== "black-gold" ? theme : "";
    }
    loadTheme();
    return () => {
      mounted = false;
      window.removeEventListener("control-color-mode-change", onColorModeChange);
    };
  }, []);

  return null;
}
