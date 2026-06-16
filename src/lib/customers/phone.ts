export function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function isValidPeruMobilePhone(phone: string) {
  return /^9\d{8}$/.test(normalizePhone(phone));
}
