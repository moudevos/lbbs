import { NextResponse, type NextRequest } from "next/server";
import { analyticsPayload } from "../_utils";

export async function GET(request: NextRequest) {
  const result = await analyticsPayload(request);
  if (result.response) return result.response;
  return NextResponse.json({ ok: true, filters: result.filters, products: result.payload.products, missingProductCosts: result.payload.summary.missingProductCosts });
}
