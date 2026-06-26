"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { BranchOption } from "@/lib/reservations/types";
import { showConfirm, showError, showSuccess } from "@/lib/ui/swal";
import { ButtonSpinner, TableSkeleton } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ControlButton, ControlCard, ControlInput } from "@/components/ui/control-primitives";

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
    if (saving) return;
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

  useEffect(() => { load(); }, []);

  return (
    <section className="grid min-w-0 gap-5">
      <h1 className="sr-only">Dispositivos locales</h1>
      <ControlCard className="p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <ControlInput placeholder="Nombre del dispositivo" value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
          <select className="control-input" value={editing.branchId} onChange={(event) => setEditing({ ...editing, branchId: event.target.value })}><option value="">Sede</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
          <ControlButton variant="primary" disabled={saving} onClick={create}>{saving ? <ButtonSpinner /> : null} Crear</ControlButton>
        </div>
        {lastLink ? <div className="mt-5 grid min-w-0 gap-4 md:grid-cols-[1fr_auto_auto] md:items-center"><div className="break-words rounded-xl border border-[var(--control-info)] bg-[var(--control-info-soft)] p-3 text-xs text-[var(--control-info)]">Enlace de conexion generado. El token permanece oculto dentro del QR/link.</div><ControlButton onClick={async () => { await navigator.clipboard.writeText(lastLink); await showSuccess("Link copiado"); }}>Copiar link seguro</ControlButton>{qr ? <div className="mx-auto rounded-xl border border-[var(--control-border)] bg-white p-2"><Image src={qr} alt="QR dispositivo" width={128} height={128} className="max-w-full" /></div> : null}</div> : null}
      </ControlCard>
      {loading ? <TableSkeleton /> : null}
      <div className="grid min-w-0 gap-3">
        {devices.map((device) => {
          const branch = Array.isArray(device.branches) ? device.branches[0] : device.branches;
          return <ControlCard key={device.id} className="p-4"><div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><p className="truncate font-semibold">{device.device_name}</p><div className="mt-2 flex flex-wrap items-center gap-2"><span className="break-all text-sm text-[var(--control-muted)]">{device.device_code}</span><span className="text-sm text-[var(--control-muted)]">{branch?.name ?? "Sede"}</span><StatusBadge label={device.status} /></div><p className="mt-1 text-xs text-[var(--control-muted-2)]">Ultimo acceso: {device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("es-PE") : "Nunca"}</p></div><div className="flex flex-wrap gap-2"><ControlButton onClick={() => action(device.id, "regenerate")}>Regenerar token</ControlButton><ControlButton variant="danger" onClick={() => action(device.id, "revoke")}>Revocar</ControlButton></div></div></ControlCard>;
        })}
      </div>
    </section>
  );
}
