"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EyeOff, Star } from "lucide-react";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import { TableSkeleton } from "@/components/ui/loading-state";
import QRCode from "qrcode";

type Review = Record<string, any>;

export function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [reviewUrl, setReviewUrl] = useState("/cliente/resena");
  const [qrDataUrl, setQrDataUrl] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ status });
    params.set("branch_id", localStorage.getItem("lbbs:branchScope") ?? "all");
    const response = await fetch(`/api/control/reviews?${params}`);
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar reseñas", data.error ?? "Error desconocido");
    setReviews(data.reviews ?? []);
  }

  useEffect(() => {
    const url = `${window.location.origin}/cliente/resena`;
    setReviewUrl(url);
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#111111", light: "#ffffff" } }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
    load();
    const listener = () => load();
    window.addEventListener("branch-scope-change", listener);
    return () => window.removeEventListener("branch-scope-change", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function update(id: string, nextStatus: string) {
    if (!(await showConfirm(`Cambiar a ${nextStatus}`, "La accion quedara auditada."))) return;
    const response = await fetch(`/api/control/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo actualizar", data.error ?? "Intenta nuevamente.");
    await load();
    await showSuccess("Reseña actualizada");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(reviewUrl);
    await showSuccess("Link copiado");
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "qr-resenas-la-bajadita.png";
    link.click();
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-col gap-3">
        <h1 className="sr-only">Reseñas</h1>
        <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
          <option value="hidden">Ocultas</option>
          <option value="all">Todas</option>
        </select>
      </div>
      <section className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Link para reseñas</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Comparte este QR para que tus clientes dejen su comentario.</p>
            <p className="mt-2 break-all rounded-lg border border-[var(--border-soft)] bg-black/40 px-3 py-2 text-xs text-[var(--gold-soft)]">{reviewUrl}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="rounded-lg bg-[var(--gold)] px-3 py-2 text-sm font-semibold text-black" type="button" onClick={copyLink}>Copiar link</button>
              <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" type="button" onClick={downloadQr}>Descargar QR PNG</button>
            </div>
          </div>
          {qrDataUrl ? <Image src={qrDataUrl} alt="QR para reseñas" width={176} height={176} className="h-44 w-44 rounded-xl bg-white p-2" /> : <div className="h-44 w-44 animate-pulse rounded-xl bg-white/10" />}
        </div>
      </section>
      {loading ? <TableSkeleton /> : null}
      {!loading && reviews.length === 0 ? <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4 text-sm text-[var(--text-muted)]">No hay reseñas para este filtro.</div> : null}
      <div className="grid gap-3">
        {reviews.map((review) => {
          const branch = Array.isArray(review.branches) ? review.branches[0] : review.branches;
          return (
            <article key={review.id} className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--gold-soft)]">
                    <span>{review.status}</span>
                    <span>{branch?.name ?? "Sin sede"}</span>
                    <span className="inline-flex items-center gap-1"><Star size={13} /> {review.rating}</span>
                  </div>
                  <h2 className="mt-2 font-semibold">{review.is_anonymous ? "Cliente anonimo" : review.display_name || "Cliente La Bajadita"}</h2>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">{review.comment}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => update(review.id, "approved")}>Aprobar</button>
                  <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => update(review.id, "rejected")}>Rechazar</button>
                  <button className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-xs" onClick={() => update(review.id, "hidden")}><EyeOff size={14} /> Ocultar</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
