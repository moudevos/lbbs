"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type NavigationLoadingContext = {
  isNavigating: boolean;
  targetPathname: string | null;
  currentPathname: string;
  startNavigation: (targetPathname: string) => void;
  stopLoading: () => void;
};

const Context = createContext<NavigationLoadingContext | null>(null);

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetPathname, setTargetPathname] = useState<string | null>(null);

  useEffect(() => {
    setIsNavigating(false);
    setTargetPathname(null);
  }, [pathname]);

  const value = useMemo(
    () => ({
      isNavigating,
      targetPathname,
      currentPathname: pathname,
      startNavigation: (nextPathname: string) => {
        if (nextPathname === pathname) return;
        setTargetPathname(nextPathname);
        setIsNavigating(true);
      },
      stopLoading: () => {
        setIsNavigating(false);
        setTargetPathname(null);
      }
    }),
    [isNavigating, pathname, targetPathname]
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNavigationLoading() {
  const context = useContext(Context);
  if (!context) throw new Error("useNavigationLoading must be used inside NavigationLoadingProvider");
  return context;
}
