"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { Star } from "lucide-react";

export function PublicReviewForm() {
  const [form, setForm] = useState({ displayName: "", phone: "", rating: "5", comment: "", isAnonymous: false });
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch("/api/public/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, rating: Number(form.rating) })
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) {
      await Swal.fire("No se pudo enviar", data.error ?? "Revisa el comentario.", "error");
      return;
    }
    setForm({ displayName: "", phone: "", rating: "5", comment: "", isAnonymous: false });
    await Swal.fire("Reseña enviada", "Quedara pendiente de aprobacion antes de publicarse.", "success");
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <form onSubmit={submit} className="glass-panel gold-border mx-auto max-w-2xl rounded-3xl p-7">
        <div className="flex items-start gap-4">
          <Star className="mt-1 text-[var(--gold)]" size={34} />
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--gold-soft)]">Comentarios</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Deja tu reseña</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">No se publica automaticamente. El equipo revisara el comentario antes de mostrarlo en la landing.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Input label="Nombre opcional" value={form.displayName} onChange={(displayName) => setForm({ ...form, displayName })} />
          <Input label="Celular opcional" value={form.phone} onChange={(phone) => setForm({ ...form, phone })} />
          <label className="text-sm text-[var(--text-muted)]">Calificacion
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })}>
              {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} estrellas</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 self-end rounded-lg border border-[var(--border-soft)] bg-black/30 px-3 py-3 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={form.isAnonymous} onChange={(event) => setForm({ ...form, isAnonymous: event.target.checked })} />
            Publicar como anonimo
          </label>
          <label className="text-sm text-[var(--text-muted)] md:col-span-2">Comentario
            <textarea className="mt-2 min-h-32 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          </label>
        </div>
        <button className="mt-6 w-full rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:opacity-60" disabled={saving}>
          {saving ? "Enviando..." : "Enviar reseña"}
        </button>
      </form>
    </main>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-3 text-white" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
