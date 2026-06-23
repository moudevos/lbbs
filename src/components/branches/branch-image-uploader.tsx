"use client";

/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { compressImage } from "@/lib/images/compress-image";
import { showError, showSuccess, swalThemed } from "@/lib/ui/swal";

type BranchImage = { id: string; imageUrl?: string | null; imageAlt?: string | null };

export function BranchImageUploader({ branch, onChange }: { branch: BranchImage; onChange: (patch: { imageUrl: string | null; imageAlt: string }) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [altText, setAltText] = useState(branch.imageAlt ?? "");

  async function upload(file: File | null) {
    if (!file || uploading) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1000, maxBytes: 2 * 1024 * 1024 });
      const form = new FormData();
      form.set("file", compressed);
      form.set("altText", altText);
      const response = await fetch(`/api/control/branches/${branch.id}/image`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo subir la foto", data.error ?? "Archivo invalido.");
      onChange({ imageUrl: data.publicUrl, imageAlt: data.imageAlt });
      setAltText(data.imageAlt);
      await showSuccess("Foto de sede actualizada");
    } catch (error) {
      await showError("No se pudo preparar la imagen", error instanceof Error ? error.message : "Archivo invalido.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (removing || !branch.imageUrl) return;
    const confirmation = await swalThemed.fire({ title: "Eliminar foto de sede", icon: "warning", showCancelButton: true, confirmButtonText: "Eliminar" });
    if (!confirmation.isConfirmed) return;
    setRemoving(true);
    const response = await fetch(`/api/control/branches/${branch.id}/image`, { method: "DELETE" });
    const data = await response.json();
    setRemoving(false);
    if (!response.ok) return showError("No se pudo eliminar", data.error ?? "Intenta nuevamente.");
    onChange({ imageUrl: null, imageAlt: altText });
    await showSuccess("Foto eliminada");
  }

  return (
    <section className="md:col-span-2 rounded-xl border border-[var(--border-soft)] p-4">
      <p className="text-sm font-semibold">Imagen de la sede</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">JPG, PNG o WEBP. Se comprime automáticamente hasta 2 MB.</p>
      {branch.imageUrl ? <img src={branch.imageUrl} alt={altText || "Imagen actual de la sede"} className="mt-3 h-44 w-full rounded-xl object-cover" /> : <div className="mt-3 grid h-36 place-items-center rounded-xl border border-dashed border-[var(--border-soft)] text-sm text-[var(--text-muted)]">Sin imagen</div>}
      <label className="mt-3 grid gap-2 text-sm text-[var(--text-muted)]">Texto alternativo
        <input className="control-input" value={altText} onChange={(event) => { setAltText(event.target.value); onChange({ imageUrl: branch.imageUrl ?? null, imageAlt: event.target.value }); }} />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={uploading || removing} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm disabled:opacity-50" onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="animate-spin" size={15} /> : <ImagePlus size={15} />} {branch.imageUrl ? "Cambiar foto" : "Subir foto"}
        </button>
        {branch.imageUrl ? <button type="button" disabled={uploading || removing} className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-sm text-red-300 disabled:opacity-50" onClick={remove}>{removing ? <Loader2 className="animate-spin" size={15} /> : <Trash2 size={15} />} Eliminar foto</button> : null}
        <input ref={inputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || removing} onChange={(event) => void upload(event.target.files?.[0] ?? null)} />
      </div>
    </section>
  );
}
