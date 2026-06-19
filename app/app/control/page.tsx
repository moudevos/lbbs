import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { getModulesForRole } from "@/lib/auth/permissions";
import { DashboardSummary } from "@/components/control/dashboard-summary";

export default async function ControlHome() {
  const employee = await getCurrentEmployee();
  const modules = employee ? getModulesForRole(employee.role) : [];

  return (
    <section className="min-w-0 grid gap-6">
      {employee?.role !== "barbero" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Link className="rounded-2xl bg-[var(--control-primary)] p-5 font-semibold text-[#17130a] transition hover:bg-[var(--control-primary-hover)]" href="/app/control/atenciones/nueva">
            Registrar atención
          </Link>
          <Link className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 font-semibold transition hover:border-[var(--control-primary)]" href="/app/control/caja">
            Ver caja
          </Link>
          <Link className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 font-semibold transition hover:border-[var(--control-primary)]" href="/app/control/reservas">
            Nueva reserva
          </Link>
        </div>
      ) : null}

      <DashboardSummary />

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {modules.map((module) => (
          <Link key={module.href} href={module.href} className="control-card min-w-0 rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--control-primary)]">
            <h2 className="truncate text-lg font-semibold">{module.label}</h2>
            <p className="mt-2 text-sm text-[var(--control-muted)]">Modulo habilitado para tu rol.</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
