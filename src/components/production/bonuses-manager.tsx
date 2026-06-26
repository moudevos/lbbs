"use client";

import { useEffect, useState } from "react";
import type { BarberOption, BranchOption, ServiceOption } from "@/lib/reservations/types";
import { showError, showSuccess } from "@/lib/ui/swal";

type BonusForm = {
  id?: string;
  name: string;
  amount: string;
  period: string;
  targetType: "production_amount" | "service_count";
  targetAmount: string;
  targetCount: string;
  branchId: string;
  appliesAllBarbers: boolean;
  isActive: boolean;
  serviceIds: string[];
  barberIds: string[];
};

const blank: BonusForm = {
  name: "",
  amount: "0",
  period: "mensual",
  targetType: "production_amount",
  targetAmount: "0",
  targetCount: "0",
  branchId: "",
  appliesAllBarbers: true,
  isActive: true,
  serviceIds: [],
  barberIds: []
};

export function BonusesManager() {
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [form, setForm] = useState<BonusForm>(blank);
  const [options, setOptions] = useState<{ branches: BranchOption[]; services: ServiceOption[]; barbers: BarberOption[] }>({ branches: [], services: [], barbers: [] });
  const [settings, setSettings] = useState<any[]>([]);

  async function load() {
    const [bonusesResponse, optionsResponse, settingsResponse] = await Promise.all([
      fetch("/api/control/bonuses"),
      fetch("/api/public/reservation-options"),
      fetch("/api/control/production/settings")
    ]);
    const bonusesData = await bonusesResponse.json();
    const optionsData = await optionsResponse.json();
    const settingsData = await settingsResponse.json();
    if (!bonusesResponse.ok) return showError("No se pudo cargar bonos", bonusesData.error ?? "Solo admin.");
    setBonuses(bonusesData.bonuses ?? []);
    setOptions({ branches: optionsData.branches ?? [], services: optionsData.services ?? [], barbers: optionsData.barbers ?? [] });
    setSettings(settingsData.barbers ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveBonus() {
    const response = await fetch(form.id ? `/api/control/bonuses/${form.id}` : "/api/control/bonuses", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amount: Number(form.amount),
        targetAmount: Number(form.targetAmount),
        targetCount: Number(form.targetCount)
      })
    });
    const data = await response.json();
    if (!response.ok) {
      await showError("No se pudo guardar bono", data.error ?? "Revisa los datos.");
      return;
    }
    setForm(blank);
    await load();
    await showSuccess("Bono guardado");
  }

  async function savePercentage(barberId: string, percentage: string) {
    const response = await fetch("/api/control/production/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barberId, percentage: Number(percentage) })
    });
    const data = await response.json();
    if (!response.ok) {
      await showError("No se pudo guardar porcentaje", data.error ?? "Revisa el valor.");
      return;
    }
    await load();
    await showSuccess("Porcentaje actualizado");
  }

  function editBonus(bonus: any) {
    setForm({
      id: bonus.id,
      name: bonus.name,
      amount: String(bonus.amount ?? 0),
      period: bonus.period,
      targetType: bonus.target_type,
      targetAmount: String(bonus.target_amount ?? 0),
      targetCount: String(bonus.target_count ?? 0),
      branchId: bonus.branch_id ?? "",
      appliesAllBarbers: Boolean(bonus.applies_all_barbers),
      isActive: Boolean(bonus.is_active),
      serviceIds: (bonus.bonus_config_services ?? []).map((item: any) => item.service_id),
      barberIds: (bonus.bonus_config_barbers ?? []).map((item: any) => item.barber_id)
    });
  }

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  return (
    <section className="grid gap-5">
      <h1 className="sr-only">Bonos y produccion</h1>

      <section className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
        <h2 className="font-semibold">Porcentaje por barbero</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {settings.map((barber) => (
            <PercentageRow key={barber.id} barber={barber} onSave={savePercentage} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
        <h2 className="font-semibold">{form.id ? "Editar bono" : "Nuevo bono"}</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label="Nombre" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <Input label="Monto bono" type="number" value={form.amount} onChange={(value) => setForm({ ...form, amount: value })} />
          <Select label="Periodo" value={form.period} onChange={(value) => setForm({ ...form, period: value })} options={[["diario", "Diario"], ["semanal", "Semanal"], ["mensual", "Mensual"]]} />
          <Select label="Meta" value={form.targetType} onChange={(value) => setForm({ ...form, targetType: value as BonusForm["targetType"] })} options={[["production_amount", "Monto producido"], ["service_count", "Cantidad de servicios"]]} />
          {form.targetType === "production_amount" ? <Input label="Meta produccion" type="number" value={form.targetAmount} onChange={(value) => setForm({ ...form, targetAmount: value })} /> : <Input label="Meta cantidad" type="number" value={form.targetCount} onChange={(value) => setForm({ ...form, targetCount: value })} />}
          <Select label="Sede" value={form.branchId} onChange={(value) => setForm({ ...form, branchId: value })} options={[["", "Global"], ...options.branches.map((branch) => [branch.id, branch.name] as [string, string])]} />
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={form.appliesAllBarbers} onChange={(event) => setForm({ ...form, appliesAllBarbers: event.target.checked })} />
            Aplica a todos los barberos
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
            Activo
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <CheckList title="Servicios que cuentan" items={options.services} selected={form.serviceIds} onToggle={(id) => setForm({ ...form, serviceIds: toggle(form.serviceIds, id) })} />
          {!form.appliesAllBarbers ? <CheckList title="Barberos incluidos" items={options.barbers} selected={form.barberIds} onToggle={(id) => setForm({ ...form, barberIds: toggle(form.barberIds, id) })} /> : null}
        </div>

        <div className="mt-4 flex gap-2">
          <button className="rounded-lg bg-[var(--gold)] px-4 py-2 font-semibold text-black" onClick={saveBonus}>Guardar bono</button>
          {form.id ? <button className="rounded-lg border border-[var(--border-soft)] px-4 py-2" onClick={() => setForm(blank)}>Cancelar</button> : null}
        </div>
      </section>

      <section className="grid gap-3">
        {bonuses.map((bonus) => (
          <article key={bonus.id} className="rounded-lg border border-[var(--border-soft)] bg-black/35 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold">{bonus.name}</h2>
                <p className="text-sm text-[var(--text-muted)]">S/ {Number(bonus.amount).toFixed(2)} - {bonus.period} - {bonus.target_type === "production_amount" ? `Meta S/ ${Number(bonus.target_amount ?? 0).toFixed(2)}` : `Meta ${bonus.target_count} servicios`}</p>
              </div>
              <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => editBonus(bonus)}>Editar</button>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function PercentageRow({ barber, onSave }: { barber: any; onSave: (barberId: string, percentage: string) => Promise<void> }) {
  const [value, setValue] = useState(String(barber.percentage ?? 50));
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-black/25 p-3">
      <p className="font-semibold">{barber.name}</p>
      <p className="text-xs text-[var(--text-muted)]">{barber.branchName}</p>
      <div className="mt-2 flex gap-2">
        <input className="min-w-0 flex-1 rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type="number" value={value} onChange={(event) => setValue(event.target.value)} />
        <button className="rounded-lg border border-[var(--border-soft)] px-3 py-2 text-sm" onClick={() => onSave(barber.id, value)}>Guardar</button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<input className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <label className="text-sm text-[var(--text-muted)]">{label}<select className="mt-2 w-full rounded-lg border border-[var(--border-soft)] bg-black px-3 py-2 text-white" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}

function CheckList({ title, items, selected, onToggle }: { title: string; items: { id: string; name: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="rounded-lg border border-[var(--border-soft)] bg-black/25 p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2 grid max-h-56 gap-2 overflow-y-auto">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}
