export function toLocalDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && startB < endA;
}

export function formatTime(dateIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima"
  }).format(new Date(dateIso));
}

export function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima"
  }).format(new Date(dateIso));
}

export function dateRangeForDay(date: string) {
  return {
    from: new Date(`${date}T00:00:00`).toISOString(),
    to: new Date(`${date}T23:59:59`).toISOString()
  };
}
