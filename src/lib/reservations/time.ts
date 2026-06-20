import { combinePeruDateAndTime, peruDayRange, PERU_TIME_ZONE } from "@/lib/datetime/peru-time";

export function toLocalDateTime(date: string, time: string) {
  return combinePeruDateAndTime(date, time);
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
    timeZone: PERU_TIME_ZONE
  }).format(new Date(dateIso));
}

export function formatDate(dateIso: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: PERU_TIME_ZONE
  }).format(new Date(dateIso));
}

export function dateRangeForDay(date: string) {
  return peruDayRange(date);
}
