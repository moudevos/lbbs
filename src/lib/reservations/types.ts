export type ReservationStatus = "pendiente" | "contactado" | "confirmado" | "atendido" | "cancelado" | "no_asistio";

export type ReservationOption = {
  id: string;
  name: string;
};

export type BranchOption = ReservationOption & {
  phone: string | null;
};

export type ServiceOption = ReservationOption & {
  sku: string;
  durationMinutes: number;
  price: number | null;
  branchId?: string | null;
};

export type BarberOption = ReservationOption & {
  branchId: string | null;
};

export type ReservationSummary = {
  id: string;
  status: ReservationStatus;
  source: string;
  startsAt: string;
  endsAt: string;
  price: number | null;
  observations: string | null;
  branch: string;
  branchPhone: string | null;
  customer: string;
  customerPhone: string;
  service: string;
  barber: string | null;
  whatsappUrl: string;
};
