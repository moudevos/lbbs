"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { prepareImageForUpload } from "@/lib/storage/upload-image";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";

type GalleryRow = {
  id: string;
  title: string | null;
  description: string | null;
  service_name: string | null;
  barber_name: string | null;
  alt_text: string | null;
  is_active: boolean;
  sort_order: number;
  featured: boolean;
  image_url: string | null;
};

const emptyForm = {
  title: "",
  description: "",
  serviceName: "",
  barberName: "",
  altText: "",
  sortOrder: "0",
  featured: false,
  isActive: true
};

export function LandingGalleryManager() {
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/control/landing/gallery", { cache: "no-store" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return showError("No se pudo cargar la galeria", data.error);
    setItems(data.items ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function createItem(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (!file || !form.title.trim()) return showError("Completa los campos", "Titulo e imagen son obligatorios.");
    setSaving(true);
    try {
      const prepared = await prepareImageForUpload(file, { maxWidth: 1800, maxHeight: 1800 });
      const body = new FormData();
      body.set("file", prepared);
      Object.entries(form).forEach(([key, value]) => body.set(key, String(value)));
      const response = await fetch("/api/control/landing/gallery", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar");
      setForm(emptyForm);
      setFile(null);
      await load();
      await showSuccess("Imagen agregada", "La galeria publica se actualizara en la siguiente revalidacion.");
    } catch (error) {
      await showError("No se pudo guardar", error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(item: GalleryRow) {
    if (saving) return;
    setSaving(true);
    const response = await fetch(`/api/control/landing/gallery/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return showError("No se pudo actualizar", data.error);
    await showSuccess("Cambios guardados");
  }

  async function removeItem(item: GalleryRow) {
    if (!(await showConfirm("Ocultar imagen", "La imagen dejara de aparecer en el landing."))) return;
    const response = await fetch(`/api/control/landing/gallery/${item.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo ocultar", data.error);
    await load();
  }

  function patchItem(id: string, patch: Partial<GalleryRow>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold-soft)]">Comercial</p>
        <h2 className="mt-2 text-2xl font-semibold">Landing / Galeria</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Administra trabajos publicados, contenido SEO y orden visual.</p>
      </div>

      <form onSubmit={createItem} className="glass-panel gold-border grid gap-4 rounded-2xl p-5 lg:grid-cols-[280px_1fr]">
        <label className="relative grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-[var(--border-soft)] bg-black/30">
          {preview ? <Image src={preview} alt="Vista previa" fill unoptimized className="object-cover" /> : <span className="flex flex-col items-center gap-2 text-sm text-[var(--text-muted)]"><ImagePlus /> Seleccionar imagen</span>}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Titulo *" value={form.title} onChange={(title) => setForm({ ...form, title })} />
          <Field label="Servicio" value={form.serviceName} onChange={(serviceName) => setForm({ ...form, serviceName })} />
          <Field label="Barbero" value={form.barberName} onChange={(barberName) => setForm({ ...form, barberName })} />
          <Field label="Orden" type="number" value={form.sortOrder} onChange={(sortOrder) => setForm({ ...form, sortOrder })} />
          <Field label="Alt SEO recomendado" value={form.altText} onChange={(altText) => setForm({ ...form, altText })} className="sm:col-span-2" />
          <Field label="Descripcion corta" value={form.description} onChange={(description) => setForm({ ...form, description })} className="sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Destacar</label>
          <button disabled={saving} className="rounded-lg bg-[var(--gold)] px-5 py-3 font-semibold text-black disabled:opacity-50">{saving ? "Subiendo..." : "Subir imagen"}</button>
        </div>
      </form>

      <div className="grid gap-4">
        {loading ? <p className="text-sm text-[var(--text-muted)]">Cargando galeria...</p> : null}
        {!loading && !items.length ? <p className="rounded-xl border border-[var(--border-soft)] p-6 text-sm text-[var(--text-muted)]">Aun no hay imagenes administradas.</p> : null}
        {items.map((item) => (
          <article key={item.id} className="glass-panel grid gap-4 rounded-2xl p-4 md:grid-cols-[180px_1fr_auto]">
            <div className="relative min-h-40 overflow-hidden rounded-xl bg-black">{item.image_url ? <Image src={item.image_url} alt={item.alt_text || item.title || "Trabajo"} fill unoptimized className="object-cover" /> : null}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Titulo" value={item.title ?? ""} onChange={(title) => patchItem(item.id, { title })} />
              <Field label="Servicio" value={item.service_name ?? ""} onChange={(service_name) => patchItem(item.id, { service_name })} />
              <Field label="Barbero" value={item.barber_name ?? ""} onChange={(barber_name) => patchItem(item.id, { barber_name })} />
              <Field label="Orden" type="number" value={String(item.sort_order)} onChange={(sort_order) => patchItem(item.id, { sort_order: Number(sort_order) || 0 })} />
              <Field label="Alt SEO" value={item.alt_text ?? ""} onChange={(alt_text) => patchItem(item.id, { alt_text })} className="sm:col-span-2" />
              <Field label="Descripcion" value={item.description ?? ""} onChange={(description) => patchItem(item.id, { description })} className="sm:col-span-2" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.is_active} onChange={(event) => patchItem(item.id, { is_active: event.target.checked })} /> Activa</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.featured} onChange={(event) => patchItem(item.id, { featured: event.target.checked })} /> Destacada</label>
            </div>
            <div className="flex gap-2 md:flex-col">
              <button disabled={saving} onClick={() => updateItem(item)} className="rounded-lg border border-[var(--border-soft)] p-3 text-[var(--gold-soft)]"><Save size={18} /></button>
              <button onClick={() => removeItem(item)} className="rounded-lg border border-red-900/60 p-3 text-red-300"><Trash2 size={18} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; className?: string }) {
  return <label className={`text-sm text-[var(--text-muted)] ${className}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-soft)] bg-black/40 px-3 py-2 text-white" /></label>;
}

