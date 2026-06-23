"use client";

import { Analytics } from "@vercel/analytics/react";
import { usePathname } from "next/navigation";

const trackedPublicRoutes = new Set(["/", "/reservar"]);

export function VercelPublicAnalytics() {
  const pathname = usePathname();

  if (!trackedPublicRoutes.has(pathname)) return null;

  return <Analytics />;
}
