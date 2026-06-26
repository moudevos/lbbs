import { normalizePhone } from "@/lib/customers/phone";

export type CustomerImportRow = Record<string, unknown>;

export function normalizeCustomerImportRow(row: CustomerImportRow) {
  const get = (key: string) => String(row[key] ?? "").trim();
  const phone = get("phone") || get("Phone 1 - Value") || get("Phone 2 - Value") || get("Mobile Phone") || get("Phone") || get("Celular");
  const normalizedPhone = normalizePhone(phone);
  const fullName = get("fullName") || get("Name") || `${get("Given Name") || get("First Name")} ${get("Family Name") || get("Last Name")}`.trim() || (normalizedPhone ? `Cliente ${normalizedPhone}` : "");
  const email = get("E-mail 1 - Value") || get("Email") || get("E-mail Address");
  return { fullName, phone, normalizedPhone, email, source: get("source") || "csv" };
}
