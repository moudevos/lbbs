"use client";

import { useState } from "react";
import { BadgeCheck, Search, Sparkles } from "lucide-react";
import { showError, showWarning } from "@/lib/ui/swal";

type Result = {
  found: boolean;
  customer?: {
    name: string;
    totalVisits: number;
    totalAttendedReservations: number;
    lastVisitAt: string | null;
    progressToNextReward: number;
    availableRewards: number;
    earnedRewards: number;
    redeemedRewards: number;
  };
  history?: { id: string; date: string; service?: string | null; branch?: string | null }[];
};

export function CustomerVisitsLookup() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function search() {
    if (!phone) {
      await showWarning("Celular requerido", "Ingresa tu numero para consultar asistencias.");
      return;
    }
    setLoading(true);
    const response = await fetch(`/api/public/customer-visits?phone=${encodeURIComponent(phone)}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      await showError("No se pudo consultar", data.error ?? "Error desconocido");
      return;
    }
    setResult(data);
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-3xl">
        <div className="glass-panel gold-border rounded-3xl p-7">
          <div className="flex items-start gap-4">
            <Sparkles className="mt-1 text-[var(--gold)]" size={34} />
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Atenciones</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Consulta tus asistencias</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Ingresa tu celular. Solo mostramos datos basicos de visitas, nunca pagos ni notas internas.</p>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input className="flex-1 rounded-lg border border-[var(--border-soft)] bg-black px-4 py-3 text-white" placeholder="Celular" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:opacity-60" onClick={search} disabled={loading}>
              <Search size={18} />
              {loading ? "Consultando..." : "Consultar"}
            </button>
          </div>
        </div>

        {result?.found === false ? (
          <div className="mt-5 rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5 text-sm text-[var(--text-muted)]">
            Aun no encontramos asistencias registradas con este numero.
          </div>
        ) : null}

        {result?.found && result.customer ? (
          <div className="mt-5 grid gap-4">
            <article className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-5">
              <div className="flex items-center gap-3">
                <BadgeCheck className="text-[var(--gold)]" />
                <div>
                  <h2 className="text-xl font-semibold">{result.customer.name}</h2>
                  <p className="text-sm text-[var(--text-muted)]">Total de atenciones: {result.customer.totalVisits}</p>
                  <p className="text-sm text-[var(--text-muted)]">Progreso: {result.customer.progressToNextReward} / 6</p>
                  <p className="text-sm text-[var(--text-muted)]">Recompensas disponibles: {result.customer.availableRewards}</p>
                  <p className="text-sm text-[var(--text-muted)]">Ultima atencion: {result.customer.lastVisitAt ? new Date(result.customer.lastVisitAt).toLocaleDateString("es-PE") : "Sin registro"}</p>
                  <p className="mt-2 text-sm text-[var(--gold-soft)]">Cada 6 servicios puedes reclamar un corte clasico o un vale de S/30.</p>
                </div>
              </div>
            </article>
            {(result.history ?? []).map((item) => (
              <article key={item.id} className="rounded-xl border border-[var(--border-soft)] bg-black/25 p-4 text-sm">
                <p className="font-semibold">{new Date(item.date).toLocaleString("es-PE")}</p>
                <p className="text-[var(--text-muted)]">{item.service ?? "Servicio"} - {item.branch ?? "Sede"}</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
