export const PERU_TIME_ZONE = "America/Lima";
const PERU_OFFSET = "-05:00";

export function parsePeruDateTime(date: string, time = "00:00") {
  return new Date(`${date}T${time.length === 5 ? `${time}:00` : time}${PERU_OFFSET}`);
}

export function combinePeruDateAndTime(date: string, time: string) {
  return parsePeruDateTime(date, time);
}

export function formatPeruDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: PERU_TIME_ZONE,
    ...options
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatPeruDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: PERU_TIME_ZONE
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatPeruTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: PERU_TIME_ZONE
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function toPeruDate(value: string | Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: PERU_TIME_ZONE
  }).formatToParts(typeof value === "string" ? new Date(value) : value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function getPeruNow() {
  return new Date();
}

export function peruDayRange(date: string) {
  const from = parsePeruDateTime(date, "00:00");
  const to = new Date(parsePeruDateTime(date, "23:59:59").getTime() + 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function peruDayOfWeek(date: string) {
  return parsePeruDateTime(date, "12:00").getUTCDay();
}
