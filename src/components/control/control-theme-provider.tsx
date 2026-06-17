"use client";

import { useEffect } from "react";

const allowedThemes = new Set(["black-gold", "black-white", "charcoal-soft-gold"]);

export function ControlThemeProvider() {
  useEffect(() => {
    let mounted = true;
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
    };
  }, []);

  return null;
}
