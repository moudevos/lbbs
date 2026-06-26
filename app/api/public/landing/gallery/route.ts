import { NextResponse } from "next/server";
import { getLandingGallery } from "@/lib/public/landing-data";

const cacheHeaders = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };

export async function GET() {
  const items = await getLandingGallery(20);
  return NextResponse.json({ gallery: items, items }, { headers: cacheHeaders });
}
