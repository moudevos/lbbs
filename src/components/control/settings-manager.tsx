"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Save } from "lucide-react";

type Template = { id: string; key: string; name: string; body: string; is_active: boolean };

export function SettingsManager() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<Template[]>([]);

  async function load() {
    const [settingsRes, templatesRes] = await Promise.all([fetch("/api/control/settings"), fetch("/api/control/whatsapp-templates")]);
    const settingsData = await settingsRes.json();
    const templatesData = await templatesRes.json();
    setSettings(settingsData.settings ?? {});
    setTemplates(templatesData.templates ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    const response = await fetch("/api/control/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    if (!response.ok) {
      const data = await response.json();
      await Swal.fire("No se pudo guardar", data.error ?? "Error desconocido", "error");
      return;
    }
    await Swal.fire("Configuracion guardada", "", "success");
  }

  async function saveTemplate(template: Template) {
    const response = await fetch(`/api/control/whatsapp-templates/${template.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: template.body, isActive: template.is_active }) });
    if (!response.ok) {
      const data = await response.json();
      await Swal.fire("No se pudo guardar", data.error ?? "Error desconocido", "error");
      return;
    }
    await Swal.fire("Plantilla guardada", "", "success");
  }

  return (
    <section className="grid gap-6">
      <div><h1 className="text-3xl font-semibold">Configuracion</h1><p className="mt-1 text-sm text-[var(--text-muted)]">Datos base y plantillas WhatsApp.</p></div>
      <div className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
        <h2 className="text-lg font-semibold">Datos de barberia</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Nombre comercial" value={settings.businessName ?? ""} onChange={(v) => setSettings({ ...settings, businessName: v })} />
          <Input label="Duracion servicio personalizado" type="number" value={settings.customServiceDurationMinutes ?? 60} onChange={(v) => setSettings({ ...settings, customServiceDurationMinutes: Number(v) })} />
          <Input label="Telefonos" value={(settings.phones ?? []).join(", ")} onChange={(v) => setSettings({ ...settings, phones: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
          <Input label="Redes sociales" value={(settings.socialLinks ?? []).join(", ")} onChange={(v) => setSettings({ ...settings, socialLinks: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
          <label className="text-sm text-[var(--text-muted)]">Tema visual
            <select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={settings.visualTheme ?? "black-gold"} onChange={(e) => setSettings({ ...settings, visualTheme: e.target.value })}>
              <option value="black-gold">Negro/Oro</option>
              <option value="black-white">Negro/Blanco</option>
              <option value="charcoal-soft-gold">Carbon/Oro suave</option>
            </select>
          </label>
        </div>
        <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={saveSettings}><Save size={16} /> Guardar</button>
      </div>
      <div className="grid gap-3">
        {templates.map((template, index) => (
          <article key={template.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
            <h3 className="font-semibold">{template.name}</h3>
            <textarea className="mt-3 min-h-28 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={template.body} onChange={(e) => setTemplates((current) => current.map((item, i) => i === index ? { ...item, body: e.target.value } : item))} />
            <button className="mt-3 rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => saveTemplate(template)}>Guardar plantilla</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
