import { NextResponse } from "next/server";
import { requireEmployee } from "@/lib/control/api";

export async function GET() {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  const { data, error } = await context.admin.from("whatsapp_templates").select("id,key,name,body,is_active").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data ?? [] });
}
