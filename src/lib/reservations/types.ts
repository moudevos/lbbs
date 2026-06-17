export type ReservationStatus = "pendiente" | "contactado" | "confirmado" | "atendido" | "cancelado" | "no_asistio";

export type ReservationOption = {
  id: string;
  name: string;
};

export type BranchOption = ReservationOption & {
  code: string;
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
  branchId: string;
  branchPhone: string | null;
  customer: string;
  customerPhone: string;
  service: string;
  serviceId: string | null;
  barber: string | null;
  barberId: string | null;
  whatsappUrl: string;
  whatsappTemplateMissing?: string | null;
  serviceOrderId?: string | null;
};
