"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";

const measuredPublicRoutes = new Set(["/", "/reservar"]);

export function VercelPublicSpeedInsights() {
  const pathname = usePathname();

  if (!measuredPublicRoutes.has(pathname)) return null;

  return <SpeedInsights />;
}
