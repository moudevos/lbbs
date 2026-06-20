import { normalizePhone } from "./phone";

export const GENERIC_CUSTOMER_PHONE = "000000000";

export function isGenericCustomerPhone(phone: string | null | undefined) {
  return normalizePhone(phone ?? "") === GENERIC_CUSTOMER_PHONE;
}
