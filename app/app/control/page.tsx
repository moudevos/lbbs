import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { getModulesForRole } from "@/lib/auth/permissions";
import { DashboardSummary } from "@/components/control/dashboard-summary";

export default async function ControlHome() {
  const employee = await getCurrentEmployee();
  const modules = employee ? getModulesForRole(employee.role) : [];

  return (
    <section className="grid gap-5">
      {employee?.role !== "barbero" ? (
        <div className="grid gap-3 md:grid-cols-3">
          <Link className="rounded-lg bg-[var(--gold)] p-4 font-semibold text-black" href="/app/control/atenciones/nueva">
            Registrar atención
          </Link>
          <Link className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 font-semibold" href="/app/control/caja">
            Ver caja
          </Link>
          <Link className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 font-semibold" href="/app/control/reservas">
            Nueva reserva
          </Link>
        </div>
      ) : null}

      <DashboardSummary />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="glass-panel gold-border rounded-lg p-5">
            <h2 className="text-lg font-semibold">{module.label}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Modulo habilitado para tu rol.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
