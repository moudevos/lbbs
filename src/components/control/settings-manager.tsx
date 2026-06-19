"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Loader2, Palette, Save } from "lucide-react";
import { CONTROL_DENSITY_KEY, CONTROL_MOTION_KEY, CONTROL_THEME_KEY } from "./control-theme-provider";

type Template = { id: string; key: string; name: string; body: string; is_active: boolean };

export function SettingsManager() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  async function load() {
    const [settingsRes, templatesRes] = await Promise.all([fetch("/api/control/settings"), fetch("/api/control/whatsapp-templates")]);
    const settingsData = await settingsRes.json();
    const templatesData = await templatesRes.json();
    setSettings(settingsData.settings ?? {});
    setTemplates(templatesData.templates ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings() {
    if (savingSettings) return;
    setSavingSettings(true);
    const response = await fetch("/api/control/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    if (!response.ok) {
      const data = await response.json();
      setSavingSettings(false);
      await Swal.fire("No se pudo guardar", data.error ?? "Error desconocido", "error");
      return;
    }
    persistAppearance(settings);
    setSavingSettings(false);
    await Swal.fire("Configuracion guardada", "", "success");
  }

  async function saveTemplate(template: Template) {
    if (savingTemplateId) return;
    setSavingTemplateId(template.id);
    const response = await fetch(`/api/control/whatsapp-templates/${template.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: template.body, isActive: template.is_active }) });
    if (!response.ok) {
      const data = await response.json();
      setSavingTemplateId(null);
      await Swal.fire("No se pudo guardar", data.error ?? "Error desconocido", "error");
      return;
    }
    setSavingTemplateId(null);
    await Swal.fire("Plantilla guardada", "", "success");
  }

  function updateAppearance(patch: Record<string, unknown>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    persistAppearance(next);
  }

  if (loading) return <div className="grid gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)]" />)}</div>;

  return (
    <section className="grid gap-6">
      <div><h1 className="text-3xl font-semibold">Configuracion</h1><p className="mt-1 text-sm text-[var(--text-muted)]">Datos base y plantillas WhatsApp.</p></div>
      <div className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5">
        <h2 className="text-lg font-semibold">Datos de barberia</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Input label="Nombre comercial" value={settings.businessName ?? ""} onChange={(v) => setSettings({ ...settings, businessName: v })} />
          <Input label="Duracion servicio personalizado" type="number" value={settings.customServiceDurationMinutes ?? 60} onChange={(v) => setSettings({ ...settings, customServiceDurationMinutes: Number(v) })} />
          <Input label="Telefonos" value={(settings.phones ?? []).join(", ")} onChange={(v) => setSettings({ ...settings, phones: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
          <Input label="Redes sociales" value={(settings.socialLinks ?? []).join(", ")} onChange={(v) => setSettings({ ...settings, socialLinks: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
        </div>
      </div>
      <div className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-5">
        <div className="flex items-center gap-2"><Palette size={20} className="text-[var(--control-primary)]" /><div><h2 className="text-lg font-semibold">Apariencia del dashboard</h2><p className="text-sm text-[var(--control-muted)]">Preferencias funcionales guardadas en este navegador y en la configuración general.</p></div></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="text-sm text-[var(--control-muted)]">Tema del dashboard<select className="control-input mt-2" value={settings.controlTheme ?? "dark-functional"} onChange={(e) => updateAppearance({ controlTheme: e.target.value })}><option value="dark-functional">Funcional oscuro</option><option value="light-operational">Claro operativo</option><option value="high-contrast">Alto contraste</option></select></label>
          <label className="text-sm text-[var(--control-muted)]">Densidad de interfaz<select className="control-input mt-2" value={settings.controlDensity ?? "comfortable"} onChange={(e) => updateAppearance({ controlDensity: e.target.value })}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
          <label className="text-sm text-[var(--control-muted)]">Mostrar animaciones<select className="control-input mt-2" value={settings.controlMotion === false ? "off" : "on"} onChange={(e) => updateAppearance({ controlMotion: e.target.value === "on" })}><option value="on">Sí</option><option value="off">No</option></select></label>
        </div>
      </div>
      <button className="control-primary-action inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 font-semibold disabled:opacity-60" disabled={savingSettings} onClick={saveSettings}>{savingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {savingSettings ? "Guardando..." : "Guardar configuración"}</button>
      <div className="grid gap-3">
        {templates.map((template, index) => (
          <article key={template.id} className="control-card rounded-2xl border border-[var(--control-border)] bg-[var(--control-surface)] p-4">
            <h3 className="font-semibold">{template.name}</h3>
            <textarea className="mt-3 min-h-28 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={template.body} onChange={(e) => setTemplates((current) => current.map((item, i) => i === index ? { ...item, body: e.target.value } : item))} />
            <button disabled={Boolean(savingTemplateId)} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[var(--control-border)] px-3 py-2 text-sm disabled:opacity-60" onClick={() => saveTemplate(template)}>{savingTemplateId === template.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Guardar plantilla</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: any; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--control-muted)]">{label}<input className="control-input mt-2" type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}

function persistAppearance(settings: Record<string, any>) {
  const theme = String(settings.controlTheme ?? "dark-functional");
  const density = String(settings.controlDensity ?? "comfortable");
  const motion = settings.controlMotion !== false;
  localStorage.setItem(CONTROL_THEME_KEY, theme);
  localStorage.setItem(CONTROL_DENSITY_KEY, density);
  localStorage.setItem(CONTROL_MOTION_KEY, motion ? "on" : "off");
  window.dispatchEvent(new CustomEvent("control-preferences-change", { detail: { theme, density, motion } }));
}
