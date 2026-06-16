import type { AppRole } from "./types";

export type ControlModule = {
  label: string;
  href: string;
  roles: AppRole[];
};

export const controlModules: ControlModule[] = [
  { label: "Reservas", href: "/app/control/reservas", roles: ["admin", "recepcion"] },
  { label: "Agenda", href: "/app/control/agenda", roles: ["admin", "recepcion"] },
  { label: "Mi agenda", href: "/app/control/agenda", roles: ["barbero"] },
  { label: "Clientes", href: "/app/control/clientes", roles: ["admin", "recepcion"] },
  { label: "Empleados", href: "/app/control/empleados", roles: ["admin"] },
  { label: "Servicios", href: "/app/control/servicios", roles: ["admin", "recepcion"] },
  { label: "Sedes", href: "/app/control/sedes", roles: ["admin"] },
  { label: "Configuracion", href: "/app/control/configuracion", roles: ["admin"] },
  { label: "Auditoria", href: "/app/control/auditoria", roles: ["admin"] },
  { label: "Mis servicios/cortes", href: "/app/control/mis-servicios", roles: ["barbero"] }
];

export function getModulesForRole(role: AppRole) {
  return controlModules.filter((module) => module.roles.includes(role));
}
