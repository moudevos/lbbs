import { normalizePhone } from "@/lib/customers/phone";

export type CustomerImportRow = Record<string, unknown>;

function getValue(row: CustomerImportRow, keys: string[]) {
  const entries = Object.entries(row);
  for (const key of keys) {
    const exact = row[key];
    if (exact != null && String(exact).trim()) return String(exact).trim();
    const match = entries.find(([entryKey]) => entryKey.trim().toLowerCase() === key.trim().toLowerCase());
    if (match?.[1] != null && String(match[1]).trim()) return String(match[1]).trim();
  }
  return "";
}

function normalizeOptionalBranch(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "sin sede" || normalized === "null" || normalized === "ninguna") return null;
  return value.trim();
}

export function normalizeCustomerImportRow(row: CustomerImportRow) {
  const phone = getValue(row, ["phone", "Phone 1 - Value", "Phone 2 - Value", "Mobile Phone", "Phone", "Celular"]);
  const normalizedPhone = normalizePhone(phone);
  const firstName = getValue(row, ["Given Name", "First Name"]);
  const lastName = getValue(row, ["Family Name", "Last Name"]);
  const fullName = getValue(row, ["fullname", "fullName", "full_name", "Nombre completo", "Name"]) || `${firstName} ${lastName}`.trim() || (normalizedPhone ? `Cliente ${normalizedPhone}` : "");
  const email = getValue(row, ["E-mail 1 - Value", "Email", "E-mail Address"]);
  const notes = getValue(row, ["notes", "Notas", "nota", "Nota"]);
  const branch = normalizeOptionalBranch(getValue(row, ["branch", "branch_id", "sede", "Sede"]));
  return { fullName, phone, normalizedPhone, email, notes, branch, source: getValue(row, ["source"]) || "xlsx" };
}
