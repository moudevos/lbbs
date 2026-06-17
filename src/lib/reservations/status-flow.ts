import type { ReservationStatus } from "./types";

export type ReservationAction = {
  status: ReservationStatus;
  label: string;
  critical?: boolean;
  kind?: "status" | "reschedule";
};

export function getReservationNextAction(status: ReservationStatus): ReservationAction | null {
  if (status === "pendiente") return { status: "contactado", label: "Marcar contactado" };
  if (status === "contactado") return { status: "confirmado", label: "Confirmar", critical: true };
  if (status === "confirmado") return { status: "atendido", label: "Confirmar atencion", critical: true };
  return null;
}

export function getReservationAllowedActions(status: ReservationStatus): ReservationAction[] {
  if (status === "pendiente") {
    return [
      { status: "confirmado", label: "Confirmar", critical: true },
      { status: "pendiente", label: "Reprogramar", kind: "reschedule" },
      { status: "cancelado", label: "Cancelar", critical: true }
    ];
  }
  if (status === "contactado") {
    return [
      { status: "contactado", label: "Reprogramar", kind: "reschedule" },
      { status: "cancelado", label: "Cancelar", critical: true }
    ];
  }
  if (status === "confirmado") {
    return [
      { status: "confirmado", label: "Reprogramar", kind: "reschedule" },
      { status: "no_asistio", label: "No asistio", critical: true },
      { status: "cancelado", label: "Cancelar", critical: true }
    ];
  }
  return [];
}

export function reservationStatusLabel(status: ReservationStatus) {
  const labels: Record<ReservationStatus, string> = {
    pendiente: "Pendiente",
    contactado: "Contactado",
    confirmado: "Confirmado",
    atendido: "Atendido",
    cancelado: "Cancelado",
    no_asistio: "No asistio"
  };
  return labels[status];
}
