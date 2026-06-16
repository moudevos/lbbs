"use client";

import { useNavigationLoading } from "./navigation-loading-provider";

export function TopProgressBar() {
  const { isNavigating } = useNavigationLoading();
  return <div className={`h-0.5 bg-[var(--gold)] transition-all duration-300 ${isNavigating ? "w-full opacity-100" : "w-0 opacity-0"}`} />;
}
