import { NextResponse } from "next/server";
import { getLandingGallery } from "@/lib/public/landing-data";

export const revalidate = 300;

export async function GET() {
  const items = await getLandingGallery(20);
  return NextResponse.json({ items });
}

