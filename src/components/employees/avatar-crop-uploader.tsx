"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { showError, showSuccess } from "@/lib/ui/swal";

type Row = Record<string, any>;

export function AvatarCropUploader({ row, onUploaded }: { row: Row; onUploaded: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(row.profilePhotoUrl || null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  function selectFile(file: File | null) {
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
  }

  async function confirmCrop() {
    if (!sourceUrl || !row.id) return;
    const image = imageRef.current;
    if (!image) return;

    setUploading(true);
    try {
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 600;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo preparar el recorte");

      context.fillStyle = "#111111";
      context.fillRect(0, 0, canvas.width, canvas.height);
      const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) * zoom;
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const x = (canvas.width - width) / 2 + offsetX;
      const y = (canvas.height - height) / 2 + offsetY;
      context.drawImage(image, x, y, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
      if (!blob) throw new Error("No se pudo comprimir la imagen");

      const form = new FormData();
      form.set("file", new File([blob], `avatar-${row.id}.jpg`, { type: "image/jpeg" }));
      const response = await fetch(`/api/control/employees/${row.id}/avatar`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) return showError("No se pudo subir foto", data.error ?? "Revisa el archivo.");
      setPreviewUrl(data.publicUrl);
      setSourceUrl(null);
      onUploaded(data.publicUrl);
      await showSuccess("Foto actualizada", "La foto se guardo en Supabase Storage.");
    } catch (error) {
      await showError("No se pudo preparar imagen", error instanceof Error ? error.message : "Archivo invalido.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="text-sm text-[var(--text-muted)]">
      <p>Foto de perfil</p>
      <input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      {previewUrl ? <img src={previewUrl} alt="Avatar actual" className="mt-3 h-20 w-20 rounded-full object-cover" /> : null}
      {sourceUrl ? (
        <div className="fixed inset-0 z-[1001] grid place-items-center bg-black/80 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-main)] p-5">
            <h2 className="text-lg font-semibold text-white">Recortar avatar</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Ajusta zoom y posicion antes de subir.</p>
            <div className="mt-4 grid place-items-center">
              <div className="relative h-72 w-72 overflow-hidden rounded-full border border-[var(--gold)] bg-black">
                <img
                  ref={imageRef}
                  src={sourceUrl}
                  alt="Preview recorte"
                  className="h-full w-full object-cover"
                  style={{ transform: `translate(${offsetX / 4}px, ${offsetY / 4}px) scale(${zoom})` }}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <label>Zoom<input className="mt-2 w-full" type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
              <label>Mover horizontal<input className="mt-2 w-full" type="range" min="-180" max="180" step="2" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label>
              <label>Mover vertical<input className="mt-2 w-full" type="range" min="-180" max="180" step="2" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={uploading} onClick={confirmCrop}>{uploading ? <Loader2 size={16} className="animate-spin" /> : null} Confirmar y subir</button>
              <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2" disabled={uploading} onClick={() => setSourceUrl(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
