type ScheduleDay = {
  dayOfWeek: number;
  startsAt?: string;
  endsAt?: string;
  opensAt?: string;
  closesAt?: string;
  isActive?: boolean;
};

const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function ScheduleEditor({ value, onChange, mode = "employee" }: { value: ScheduleDay[]; onChange: (value: ScheduleDay[]) => void; mode?: "employee" | "branch" }) {
  function update(dayOfWeek: number, patch: Partial<ScheduleDay>) {
    const current = value.find((item) => item.dayOfWeek === dayOfWeek) ?? { dayOfWeek, isActive: true };
    const next = value.filter((item) => item.dayOfWeek !== dayOfWeek).concat({ ...current, ...patch }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    onChange(next);
  }

  return (
    <div className="grid gap-2">
      {days.map((day, index) => {
        const current = value.find((item) => item.dayOfWeek === index);
        const startKey = mode === "branch" ? "opensAt" : "startsAt";
        const endKey = mode === "branch" ? "closesAt" : "endsAt";
        return (
          <div key={day} className="grid grid-cols-[52px_1fr_1fr_auto] items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)]">{day}</span>
            <input className="rounded-lg border border-[var(--border-soft)] bg-black px-2 py-2 text-white" type="time" value={(current?.[startKey] as string) ?? "09:00"} onChange={(event) => update(index, { [startKey]: event.target.value })} />
            <input className="rounded-lg border border-[var(--border-soft)] bg-black px-2 py-2 text-white" type="time" value={(current?.[endKey] as string) ?? "18:00"} onChange={(event) => update(index, { [endKey]: event.target.value })} />
            <input type="checkbox" checked={current?.isActive ?? true} onChange={(event) => update(index, { isActive: event.target.checked })} />
          </div>
        );
      })}
    </div>
  );
}
