import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMainContact } from "@/lib/public-contact/get-main-contact";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

export async function GET() {
  const admin = createAdminClient();
  const [branches, services, barbers, mainContact] = await Promise.all([
    admin.from("branches").select("id,code,name,phone").eq("is_active", true).order("name"),
    admin.from("services").select("id,sku,name,description,duration_minutes,price,branch_id").eq("is_active", true).order("name"),
    admin.from("employees")
      .select("id,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,branch_id,role,can_perform_services")
      .eq("is_active", true)
      .not("branch_id", "is", null)
      .or("role.eq.barbero,can_perform_services.eq.true")
      .order("first_name"),
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
      description: service.description,
      branchId: service.branch_id
    })),
    barbers: await Promise.all((barbers.data ?? []).map(async (barber) => ({
      id: barber.id,
      name: `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim() || "Barbero",
      nickname: barber.nickname,
      specialty: barber.specialty,
      profilePhotoUrl: await resolvePublicImageUrl({
        admin,
        bucket: "employee-avatars",
        path: barber.profile_photo_path,
        fallback: barber.profile_photo_url
      }),
      branchId: barber.branch_id
    })))
  });
}
