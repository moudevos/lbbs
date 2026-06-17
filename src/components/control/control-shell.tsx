"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, BarChart3, CalendarCheck, CalendarDays, ChevronDown, Gift, Images, MonitorSmartphone, MessageSquareText, LayoutDashboard, Menu, ReceiptText, Scissors, Settings, ShieldCheck, Store, UserRound, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import type { CurrentEmployee } from "@/lib/auth/types";
import { getModulesForRole } from "@/lib/auth/permissions";
import { LogoutButton } from "@/components/auth/logout-button";
import { NavigationLoadingProvider, useNavigationLoading } from "@/components/navigation/navigation-loading-provider";
import { TopProgressBar } from "@/components/navigation/top-progress-bar";
import { ModuleRouteSkeleton } from "@/components/navigation/module-route-skeleton";
import { RealtimeNotificationCenter } from "@/components/realtime/realtime-notification-center";
import { ControlThemeProvider } from "./control-theme-provider";
import { ControlNavLink } from "./control-nav-link";
import { BranchScopeSelector } from "./branch-scope-selector";

const icons = {
  Dashboard: LayoutDashboard,
  Reservas: CalendarCheck,
  Agenda: CalendarDays,
  "Mi agenda": CalendarDays,
  Sedes: Store,
  Empleados: Users,
  Clientes: UserRound,
  Rewards: Gift,
  Servicios: Scissors,
  Atenciones: ReceiptText,
  Caja: ReceiptText,
  Productos: ReceiptText,
  Produccion: BarChart3,
  Liquidaciones: ReceiptText,
  Bonos: Award,
  Resenas: MessageSquareText,
  Rankings: BarChart3,
  "Landing / Galeria": Images,
  Dispositivos: MonitorSmartphone,
  Configuracion: Settings,
  Auditoria: ShieldCheck,
  "Mis servicios/cortes": ReceiptText
};

export function ControlShell({ employee, children }: { employee: CurrentEmployee; children: React.ReactNode }) {
  return (
    <NavigationLoadingProvider>
      <ControlShellContent employee={employee}>{children}</ControlShellContent>
    </NavigationLoadingProvider>
  );
}

function ControlShellContent({ employee, children }: { employee: CurrentEmployee; children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isNavigating, targetPathname } = useNavigationLoading();
  const pathname = usePathname();
  const modules = getModulesForRole(employee.role);
  const dashboard = employee.role !== "barbero" ? [{ label: "Dashboard", href: "/app/control" }] : [];
  const allModules = [...dashboard, ...modules];
  const primaryModules = allModules.filter((item) => ["Dashboard", "Reservas", "Agenda", "Mi agenda", "Atenciones", "Caja", "Mis servicios/cortes"].includes(item.label));
  const groupedModules = groupModules(allModules);
  const activeGroup = groupedModules.find((group) => group.items.some((item) => pathname === item.href || (item.href !== "/app/control" && pathname.startsWith(item.href))))?.title;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groupedModules.map((group) => [group.title, group.title === "Principal" || group.title === activeGroup]))
  );

  function toggleGroup(title: string) {
    setOpenGroups((current) => ({ ...current, [title]: !current[title] }));
  }

  const nav = (
    <nav className="grid gap-2">
      {primaryModules.length > 0 ? (
        <div className="grid gap-1">
          {primaryModules.map((module) => (
            <ControlNavLink key={`${module.href}-${module.label}`} href={module.href} label={module.label} icon={icons[module.label as keyof typeof icons] ?? LayoutDashboard} onNavigate={() => setMobileOpen(false)} />
          ))}
        </div>
      ) : null}
      {groupedModules.map((group) => (
        <div key={group.title} className="rounded-xl border border-[var(--border-soft)] bg-black/25">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-[var(--gold-soft)]"
            onClick={() => toggleGroup(group.title)}
            aria-expanded={Boolean(openGroups[group.title])}
          >
            <span>{group.title}</span>
            <ChevronDown size={15} className={`transition-transform ${openGroups[group.title] ? "rotate-180" : ""}`} />
          </button>
          {openGroups[group.title] ? (
            <div className="grid gap-1 px-2 pb-2">
              {group.items.map((module) => (
                <ControlNavLink key={`${module.href}-${module.label}`} href={module.href} label={module.label} icon={icons[module.label as keyof typeof icons] ?? LayoutDashboard} onNavigate={() => setMobileOpen(false)} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg-main)]">
      <ControlThemeProvider />
      <TopProgressBar />
      <div className="flex h-[calc(100%-2px)]">
        <aside className="hidden h-full w-72 shrink-0 overflow-y-auto border-r border-[var(--border-soft)] bg-black/70 p-4 lg:block">
          <Brand />
          {nav}
        </aside>

        <div className={`fixed inset-0 z-40 bg-black/70 transition lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileOpen(false)} />
        <aside className={`fixed left-0 top-0 z-50 h-full w-72 border-r border-[var(--border-soft)] bg-black p-4 transition-transform duration-200 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-4 flex items-center justify-between">
            <Brand />
            <button className="rounded-lg border border-[var(--border-soft)] p-2" onClick={() => setMobileOpen(false)}><X size={18} /></button>
          </div>
          {nav}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 border-b border-[var(--border-soft)] bg-black/80 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <button className="rounded-lg border border-[var(--border-soft)] p-2 lg:hidden" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--gold-soft)]">Panel interno</p>
                  <h1 className="text-lg font-semibold">La Bajadita Barber Shop</h1>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{employee.fullName} - {employee.role}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <BranchScopeSelector role={employee.role} branchName={employee.branchName} />
                <RealtimeNotificationCenter branchId={employee.role === "admin" ? null : employee.branchId} />
                <Link href="/" className="rounded-lg gold-border px-4 py-2 text-sm">Inicio publico</Link>
                <LogoutButton />
              </div>
            </div>
          </header>
          <main className="relative min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6">
            <div className="transition-opacity duration-200 ease-out">
              {isNavigating ? <ModuleRouteSkeleton pathname={targetPathname} /> : children}
            </div>
          </main>
        </section>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="mb-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold-soft)]">Control</p>
      <h1 className="mt-2 text-lg font-semibold">La Bajadita</h1>
    </div>
  );
}

function groupModules(items: { label: string; href: string }[]) {
  const groups = [
    { title: "Gestion", labels: ["Clientes", "Empleados", "Servicios", "Productos", "Sedes", "Rewards"] },
    { title: "Comercial", labels: ["Landing / Galeria", "Resenas", "Rankings", "WhatsApp/Plantillas", "Dispositivos"] },
    { title: "Finanzas/Produccion", labels: ["Produccion", "Bonos", "Liquidaciones"] },
    { title: "Sistema", labels: ["Configuracion", "Auditoria"] }
  ];
  return groups
    .map((group) => ({ title: group.title, items: items.filter((item) => group.labels.includes(item.label)) }))
    .filter((group) => group.items.length > 0);
}
