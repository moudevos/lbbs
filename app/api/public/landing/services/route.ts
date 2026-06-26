import { NextResponse } from "next/server";
import { getLandingData } from "@/lib/public/landing-data";

const cacheHeaders = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" };

export async function GET() {
  const data = await getLandingData();
  return NextResponse.json({ services: data.services }, { headers: cacheHeaders });
}
