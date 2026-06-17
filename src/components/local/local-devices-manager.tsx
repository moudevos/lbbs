"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import { ButtonSpinner, TableSkeleton } from "@/components/ui/loading-state";

type Device = Record<string, any>;

export function LocalDevicesManager() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [editing, setEditing] = useState({ name: "", branchId: "" });
  const [lastLink, setLastLink] = useState("");
  const [qr, setQr] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [devicesRes, optionsRes] = await Promise.all([fetch("/api/control/local-devices"), fetch("/api/public/reservation-options")]);
    const devicesData = await devicesRes.json();
    const optionsData = await optionsRes.json();
    setLoading(false);
    if (!devicesRes.ok) return showError("No se pudo cargar dispositivos", devicesData.error ?? "Error desconocido");
    setDevices(devicesData.devices ?? []);
    setBranches(optionsData.branches ?? []);
  }

  async function create() {
    setSaving(true);
    const response = await fetch("/api/control/local-devices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
    const data = await response.json();
    setSaving(false);
    if (!response.ok) return showError("No se pudo crear dispositivo", data.error ?? "Revisa sede y nombre.");
    setLastLink(data.link);
    setQr(await QRCode.toDataURL(data.link, { width: 220, margin: 1 }));
    setEditing({ name: "", branchId: "" });
    await load();
    await showSuccess("Dispositivo creado", "Escanea el QR o copia el enlace. El token no se muestra en texto plano.");
  }

  async function action(id: string, actionName: "revoke" | "regenerate") {
    if (!(await showConfirm(actionName === "revoke" ? "Revocar dispositivo" : "Regenerar token", "La accion quedara auditada."))) return;
    const response = await fetch(`/api/control/local-devices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName }) });
    const data = await response.json();
    if (!response.ok) return showError("No se pudo actualizar", data.error ?? "Intenta nuevamente.");
    if (data.link) {
      setLastLink(data.link);
      setQr(await QRCode.toDataURL(data.link, { width: 220, margin: 1 }));
    }
    await load();
  }

  async function copyLink() {
    if (!lastLink) return;
    await navigator.clipboard.writeText(lastLink);
    await showSuccess("Link copiado");
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-3xl font-semibold">Dispositivos locales</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Conecta tablets o kioskos por sede con token limitado.</p>
      </div>
      <div className="rounded-2xl border border-[var(--border-soft)] bg-black/35 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" placeholder="Nombre del dispositivo" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
          <select className="rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={editing.branchId} onChange={(event) => setEditing({ ...editing, branchId: event.target.value })}>
            <option value="">Sede</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black disabled:opacity-60" disabled={saving} onClick={create}>{saving ? <ButtonSpinner /> : null} Crear</button>
        </div>
        {lastLink ? <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center"><div className="flex-1 rounded-lg border border-[var(--border-soft)] bg-black/40 p-3 text-xs text-[var(--gold-soft)]">Enlace de conexión generado. El token queda embebido en el QR/link y no se muestra en texto plano.</div><button className="rounded-lg border border-[var(--border-soft)] px-3 py-2" onClick={copyLink}>Copiar link seguro</button>{qr ? <Image src={qr} alt="QR dispositivo" width={128} height={128} className="rounded-lg bg-white p-2" /> : null}</div> : null}
      </div>
      {loading ? <TableSkeleton /> : null}
      <div className="grid gap-2">
        {devices.map((device) => {
          const branch = Array.isArray(device.branches) ? device.branches[0] : device.branches;
          return <article key={device.id} className="rounded-xl border border-[var(--border-soft)] bg-black/35 p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{device.device_name}</p><p className="text-sm text-[var(--text-muted)]">{device.device_code} - {branch?.name ?? "Sede"} - {device.status}</p><p className="text-xs text-[var(--text-muted)]">Ultimo acceso: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("es-PE") : "Nunca"}</p></div><div className="flex gap-2"><button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => action(device.id, "regenerate")}>Regenerar token</button><button className="rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-200" onClick={() => action(device.id, "revoke")}>Revocar</button></div></div></article>;
        })}
      </div>
    </section>
  );
}
