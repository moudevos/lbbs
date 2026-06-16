import Link from "next/link";
import { getCurrentEmployee } from "@/lib/auth/current-employee";
import { getModulesForRole } from "@/lib/auth/permissions";

export default async function ControlHome() {
  const employee = await getCurrentEmployee();
  const modules = employee ? getModulesForRole(employee.role) : [];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => (
        <Link key={module.href} href={module.href} className="glass-panel gold-border rounded-lg p-5">
          <h2 className="text-lg font-semibold">{module.label}</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Modulo habilitado para tu rol.</p>
        </Link>
      ))}
    </section>
  );
}
