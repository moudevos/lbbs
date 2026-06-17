import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMainContact } from "@/lib/public-contact/get-main-contact";

export async function GET() {
  const admin = createAdminClient();
  const [branches, services, barbers, mainContact] = await Promise.all([
    admin.from("branches").select("id,code,name,phone").eq("is_active", true).order("name"),
    admin.from("services").select("id,sku,name,duration_minutes,price,branch_id").eq("is_active", true).order("name"),
    admin.from("employees").select("id,first_name,last_name,branch_id").eq("is_active", true).eq("role", "barbero").order("first_name"),
    getMainContact(admin)
  ]);

  if (branches.error) return NextResponse.json({ error: branches.error.message }, { status: 500 });
  if (services.error) return NextResponse.json({ error: services.error.message }, { status: 500 });
  if (barbers.error) return NextResponse.json({ error: barbers.error.message }, { status: 500 });

  return NextResponse.json({
    branches: (branches.data ?? []).map((branch) => ({ id: branch.id, code: branch.code, name: branch.name, phone: branch.phone })),
    mainContact,
    services: (services.data ?? []).map((service) => ({
      id: service.id,
      sku: service.sku,
      name: service.name,
      durationMinutes: service.duration_minutes,
      price: service.price,
      branchId: service.branch_id
    })),
    barbers: (barbers.data ?? []).map((barber) => ({
      id: barber.id,
      name: `${barber.first_name} ${barber.last_name}`.trim(),
      branchId: barber.branch_id
    }))
  });
}
