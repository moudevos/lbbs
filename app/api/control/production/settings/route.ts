import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/control/api";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const [{ data: barbers, error: barbersError }, { data: settings, error: settingsError }] = await Promise.all([
    context.admin.from("employees").select("id,first_name,last_name,branch_id,branches(name)").eq("role", "barbero").eq("is_active", true).order("first_name"),
    context.admin.from("barber_production_settings").select("*").eq("is_active", true).order("effective_from", { ascending: false })
  ]);

  if (barbersError) return NextResponse.json({ error: barbersError.message }, { status: 500 });
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 500 });

  return NextResponse.json({
    barbers: (barbers ?? []).map((barber: any) => {
      const current = (settings ?? []).find((setting) => setting.barber_id === barber.id);
      const branch = Array.isArray(barber.branches) ? barber.branches[0] : barber.branches;
      return {
        id: barber.id,
        name: `${barber.first_name ?? ""} ${barber.last_name ?? ""}`.trim(),
        branchId: barber.branch_id,
        branchName: branch?.name ?? "Sede",
        percentage: Number(current?.percentage ?? 50),
        settingId: current?.id ?? null
      };
    })
  });
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin();
  if (!context.ok) return context.error;

  const body = await request.json();
  if (!body.barberId) return NextResponse.json({ error: "Barbero requerido" }, { status: 400 });
  const percentage = Number(body.percentage ?? 0);
  if (percentage < 0 || percentage > 100) return NextResponse.json({ error: "Porcentaje invalido" }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);
  const { data: previous } = await context.admin
    .from("barber_production_settings")
    .select("*")
    .eq("barber_id", body.barberId)
    .eq("is_active", true);

  await context.admin
    .from("barber_production_settings")
    .update({ is_active: false, effective_to: today })
    .eq("barber_id", body.barberId)
    .eq("is_active", true);

  const { data, error } = await context.admin
    .from("barber_production_settings")
    .insert({
      barber_id: body.barberId,
      percentage,
      effective_from: body.effectiveFrom || today,
      is_active: true,
      created_by: context.employee.userId
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(context.admin, {
    actorUserId: context.employee.userId,
    actorRole: context.employee.role,
    actorBranchId: context.employee.branchId,
    eventType: "update",
    tableName: "barber_production_settings",
    recordId: data.id,
    previousData: { settings: previous ?? [] },
    newData: data
  });

  return NextResponse.json({ setting: data });
}
