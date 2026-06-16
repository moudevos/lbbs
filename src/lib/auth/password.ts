import { randomBytes } from "crypto";

export function generateTemporaryPassword() {
  const token = randomBytes(9).toString("base64url");
  return `Lbbs-${token}!7`;
}
