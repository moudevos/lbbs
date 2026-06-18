"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type LandingLanguage = "es" | "en";

type LanguageContextValue = {
  language: LandingLanguage;
  setLanguage: (language: LandingLanguage) => void;
  t: (spanish: string, english: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const STORAGE_KEY = "lbbs:landing-language";

export function LandingLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LandingLanguage>("es");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored === "en" ? "en" : "es";
    setLanguageState(initial);
    document.documentElement.lang = initial;
  }, []);

  function setLanguage(next: LandingLanguage) {
    setLanguageState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t: (spanish, english) => language === "es" ? spanish : english }}>{children}</LanguageContext.Provider>;
}

export function useLandingLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLandingLanguage must be used inside LandingLanguageProvider");
  return context;
}

export function LanguageSelector() {
  const { language, setLanguage, t } = useLandingLanguage();
  return (
    <label className="inline-flex items-center rounded-full border border-[var(--landing-border)] bg-black/25 px-2 py-1 backdrop-blur">
      <span className="sr-only">{t("Seleccionar idioma", "Select language")}</span>
      <select value={language} onChange={(event) => setLanguage(event.target.value as LandingLanguage)} className="bg-transparent px-1 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white outline-none" aria-label={t("Idioma", "Language")}>
        <option className="bg-[#071013]" value="es">ES</option>
        <option className="bg-[#071013]" value="en">EN</option>
      </select>
    </label>
  );
}
