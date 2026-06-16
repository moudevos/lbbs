import { PublicReservationForm } from "@/components/reservations/public-reservation-form";

export default function ReservarPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Reserva publica</p>
        <h1 className="mt-3 text-4xl font-semibold">Agenda tu visita</h1>
        <p className="mt-3 text-[var(--text-muted)]">La solicitud entra como pendiente y recepcion la confirma por WhatsApp.</p>
      </div>
      <div className="glass-panel gold-border rounded-lg p-6">
        <PublicReservationForm />
      </div>
    </main>
  );
}
