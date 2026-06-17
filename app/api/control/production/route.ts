import { NextResponse, type NextRequest } from "next/server";
import { requireEmployee } from "@/lib/control/api";
import { resolveBranchScope } from "@/lib/branch-scope/branch-scope";

function sum(rows: any[], key: string) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

async function evaluateBonuses(admin: any, from: string, to: string) {
  const { data: configs } = await admin
    .from("bonus_configs")
    .select("*,bonus_config_services(service_id),bonus_config_barbers(barber_id)")
    .eq("is_active", true);

  if (!configs?.length) return;

  const { data: services } = await admin
    .from("barber_production_entries")
    .select("*")
    .eq("entry_type", "service")
    .is("voided_at", null)
    .gte("counted_at", `${from}T00:00:00.000Z`)
    .lte("counted_at", `${to}T23:59:59.999Z`);

  for (const config of configs) {
    const serviceIds = new Set((config.bonus_config_services ?? []).map((item: any) => item.service_id));
    const barberIds = new Set((config.bonus_config_barbers ?? []).map((item: any) => item.barber_id));
    const eligible = (services ?? []).filter((entry: any) => {
      if (config.branch_id && entry.branch_id !== config.branch_id) return false;
      if (serviceIds.size > 0 && !serviceIds.has(entry.service_id)) return false;
      if (!config.applies_all_barbers && !barberIds.has(entry.barber_id)) return false;
      return Boolean(entry.barber_id);
    });

    const byBarber = new Map<string, any[]>();
    for (const entry of eligible) {
      byBarber.set(entry.barber_id, [...(byBarber.get(entry.barber_id) ?? []), entry]);
    }

    for (const [barberId, rows] of byBarber) {
      const production = sum(rows, "production_amount");
      const serviceCount = rows.length;
      const achieved = config.target_type === "service_count"
        ? serviceCount >= Number(config.target_count ?? 0)
        : production >= Number(config.target_amount ?? 0);

      await admin.from("barber_bonus_results").upsert({
        bonus_config_id: config.id,
        barber_id: barberId,
        branch_id: config.branch_id ?? rows[0]?.branch_id,
        period_start: from,
        period_end: to,
        production_amount: production,
        service_count: serviceCount,
        bonus_amount: achieved ? Number(config.amount ?? 0) : 0,
        achieved,
        calculated_at: new Date().toISOString()
      }, { onConflict: "bonus_config_id,barber_id,period_start,period_end" });

      if (achieved) {
        const description = `Bono: ${config.name} (${config.id}) ${from}/${to}`;
        const { data: existing } = await admin
          .from("barber_production_entries")
          .select("id")
          .eq("entry_type", "bonus")
          .eq("barber_id", barberId)
          .eq("description", description)
          .maybeSingle();

        if (!existing) {
          await admin.from("barber_production_entries").insert({
            branch_id: config.branch_id ?? rows[0]?.branch_id,
            barber_id: barberId,
            entry_type: "bonus",
            gross_amount: Number(config.amount ?? 0),
            deduction_amount: 0,
            production_amount: Number(config.amount ?? 0),
            percentage: 100,
            barber_earning: Number(config.amount ?? 0),
            quantity: 1,
            description,
            counted_at: new Date().toISOString()
          });
        }
      }
    }
  }
}

export async function GET(request: NextRequest) {
  const context = await requireEmployee();
  if (!context.ok) return context.error;
  if (context.employee.role !== "admin") {
    return NextResponse.json({ error: "Solo admin puede acceder a produccion" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const today = new Date().toISOString().slice(0, 10);
  const from = searchParams.get("from") ?? today;
  const to = searchParams.get("to") ?? today;
  const branchId = searchParams.get("branch_id") ?? searchParams.get("branchId");
  const barberId = searchParams.get("barber_id") ?? searchParams.get("barberId");
  const type = searchParams.get("type") ?? "all";
  const scope = resolveBranchScope(context.employee, branchId);

  await evaluateBonuses(context.admin, from, to);

  let query = context.admin
    .from("barber_production_entries")
    .select("*")
    .gte("counted_at", `${from}T00:00:00.000Z`)
    .lte("counted_at", `${to}T23:59:59.999Z`)
    .order("counted_at", { ascending: false });

  if (scope.mode === "branch") query = query.eq("branch_id", scope.branchId);
  if (barberId) query = query.or(`barber_id.eq.${barberId},sold_by_employee_id.eq.${barberId}`);

  if (type === "services") query = query.eq("entry_type", "service");
  if (type === "products") query = query.eq("entry_type", "product_credit");
  if (type === "bonuses") query = query.eq("entry_type", "bonus");

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = data ?? [];
  const [{ data: employees }, { data: branches }] = await Promise.all([
    context.admin.from("employees").select("id,first_name,last_name"),
    context.admin.from("branches").select("id,name")
  ]);
  const employeeNames = new Map((employees ?? []).map((employee) => [employee.id, `${employee.first_name ?? ""} ${employee.last_name ?? ""}`.trim()]));
  const branchNames = new Map((branches ?? []).map((branch) => [branch.id, branch.name]));

  const rows = entries.map((entry) => ({
    ...entry,
    barberName: employeeNames.get(entry.barber_id) ?? "Sin barbero",
    sellerName: employeeNames.get(entry.sold_by_employee_id) ?? null,
    branchName: branchNames.get(entry.branch_id) ?? "Sede"
  }));

  const serviceRows = rows.filter((row) => row.entry_type === "service");
  const productRows = rows.filter((row) => row.entry_type === "product_credit");
  const bonusRows = rows.filter((row) => row.entry_type === "bonus");

  return NextResponse.json({
    summary: {
      serviceGross: sum(serviceRows, "gross_amount"),
      deductions: sum(serviceRows, "deduction_amount"),
      serviceProduction: sum(serviceRows, "production_amount"),
      barberEarnings: sum(serviceRows, "barber_earning"),
      productCredits: sum(productRows, "production_amount"),
      bonuses: sum(bonusRows, "barber_earning"),
      estimatedPay: sum(serviceRows, "barber_earning") + sum(productRows, "barber_earning") + sum(bonusRows, "barber_earning")
    },
    rows
  });
}
