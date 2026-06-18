import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolvePublicImageUrl } from "@/lib/storage/resolve-public-image-url";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role === "barbero") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { data: employee, error } = await context.admin
    .from("employees")
    .select("id,user_id,code,first_name,last_name,nickname,specialty,profile_photo_path,profile_photo_url,production_percentage,can_perform_services,phone,email,role,branch_id,is_active,onboarding_status,created_at,branches(name)")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !employee) return NextResponse.json({ error: error?.message ?? "Empleado no encontrado" }, { status: 404 });
  if (context.employee.role === "recepcion" && employee.branch_id !== context.employee.branchId) {
    return NextResponse.json({ error: "Empleado fuera de tu sede" }, { status: 403 });
  }

  const [production, orders, schedules] = await Promise.all([
    context.admin
      .from("barber_production_entries")
      .select("id,entry_type,gross_amount,production_amount,barber_earning,description,counted_at,voided_at")
      .or(`barber_id.eq.${params.id},sold_by_employee_id.eq.${params.id}`)
      .is("voided_at", null)
      .order("counted_at", { ascending: false })
      .limit(100),
    context.admin
      .from("service_orders")
      .select("id,status,total,service_date,services(name),customers(full_name)")
      .eq("employee_id", params.id)
      .order("service_date", { ascending: false })
      .limit(10),
    context.admin
      .from("employee_schedules")
      .select("day_of_week,starts_at,ends_at,is_active")
      .eq("employee_id", params.id)
      .order("day_of_week")
  ]);

  const entries = production.data ?? [];
  const sum = (type: string, field: string) => entries
    .filter((row: any) => row.entry_type === type)
    .reduce((total: number, row: any) => total + Number(row[field] ?? 0), 0);

  return NextResponse.json({
    employee: {
      ...employee,
      profile_photo_url: await resolvePublicImageUrl({
        admin: context.admin,
        bucket: "employee-avatars",
        path: employee.profile_photo_path,
        fallback: employee.profile_photo_url
      })
    },
    metrics: {
      services: entries.filter((row: any) => row.entry_type === "service").length,
      grossProduction: sum("service", "gross_amount"),
      barberEarnings: sum("service", "barber_earning"),
      productCredits: sum("product_credit", "barber_earning"),
      rewardIncentives: sum("reward_classic_cut", "barber_earning"),
      bonuses: sum("bonus", "barber_earning")
    },
    recentOrders: orders.data ?? [],
    schedules: schedules.data ?? []
  });
}

