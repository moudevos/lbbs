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
  { label: "Atenciones", href: "/app/control/atenciones", roles: ["admin", "recepcion"] },
  { label: "Caja", href: "/app/control/caja", roles: ["admin", "recepcion"] },
  { label: "Productos", href: "/app/control/productos", roles: ["admin", "recepcion"] },
  { label: "Produccion", href: "/app/control/produccion", roles: ["admin"] },
  { label: "Liquidaciones", href: "/app/control/liquidaciones", roles: ["admin", "barbero"] },
  { label: "Beneficios empleados", href: "/app/control/beneficios-empleados", roles: ["admin"] },
  { label: "Bonos", href: "/app/control/bonos", roles: ["admin"] },
  { label: "Resenas", href: "/app/control/resenas", roles: ["admin", "recepcion"] },
  { label: "Rankings", href: "/app/control/rankings", roles: ["admin"] },
  { label: "Landing / Galeria", href: "/app/control/landing/galeria", roles: ["admin"] },
  { label: "Hotspot visitas", href: "/app/control/hotspot-visitas", roles: ["admin", "recepcion"] },
  { label: "Dispositivos", href: "/app/control/dispositivos", roles: ["admin", "recepcion"] },
  { label: "Clientes", href: "/app/control/clientes", roles: ["admin", "recepcion"] },
  { label: "Empleados", href: "/app/control/empleados", roles: ["admin", "recepcion"] },
  { label: "Servicios", href: "/app/control/servicios", roles: ["admin", "recepcion"] },
  { label: "Sedes", href: "/app/control/sedes", roles: ["admin"] },
  { label: "Rewards", href: "/app/control/rewards", roles: ["admin", "recepcion"] },
  { label: "Configuracion", href: "/app/control/configuracion", roles: ["admin"] },
  { label: "Auditoria", href: "/app/control/auditoria", roles: ["admin"] },
  { label: "Mis servicios/cortes", href: "/app/control/mis-servicios", roles: ["barbero"] }
];

export function getModulesForRole(role: AppRole) {
  return controlModules.filter((module) => module.roles.includes(role));
}
