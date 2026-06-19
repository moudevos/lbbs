"use client";

import { useEffect } from "react";

const allowedThemes = new Set(["dark-functional", "light-operational", "high-contrast"]);
export const CONTROL_THEME_KEY = "lbbs:control-theme";
export const CONTROL_DENSITY_KEY = "lbbs:control-density";
export const CONTROL_MOTION_KEY = "lbbs:control-motion";

export function ControlThemeProvider() {
  useEffect(() => {
    let mounted = true;
    function applyPreferences(preferences?: { theme?: string; density?: string; motion?: boolean }) {
      const storedTheme = localStorage.getItem(CONTROL_THEME_KEY);
      const theme = preferences?.theme ?? storedTheme ?? "dark-functional";
      const density = preferences?.density ?? localStorage.getItem(CONTROL_DENSITY_KEY) ?? "comfortable";
      const motion = preferences?.motion ?? localStorage.getItem(CONTROL_MOTION_KEY) !== "off";
      document.documentElement.dataset.controlTheme = allowedThemes.has(theme) ? theme : "dark-functional";
      document.documentElement.dataset.controlDensity = density === "compact" ? "compact" : "comfortable";
      document.documentElement.dataset.controlMotion = motion ? "on" : "off";
    }
    applyPreferences();
    const onPreferencesChange = (event: Event) => applyPreferences((event as CustomEvent).detail);
    window.addEventListener("control-preferences-change", onPreferencesChange);
    async function loadTheme() {
      const response = await fetch("/api/control/settings");
      const data = await response.json();
      if (!mounted || !response.ok) return;
      const theme = localStorage.getItem(CONTROL_THEME_KEY) ?? String(data.settings?.controlTheme ?? "dark-functional");
      const density = localStorage.getItem(CONTROL_DENSITY_KEY) ?? String(data.settings?.controlDensity ?? "comfortable");
      const motionStored = localStorage.getItem(CONTROL_MOTION_KEY);
      const motion = motionStored ? motionStored !== "off" : data.settings?.controlMotion !== false;
      applyPreferences({ theme, density, motion });
    }
    loadTheme();
    return () => {
      mounted = false;
      window.removeEventListener("control-preferences-change", onPreferencesChange);
    };
  }, []);

  return null;
}
