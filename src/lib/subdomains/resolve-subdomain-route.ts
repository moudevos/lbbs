const ROOT_DOMAIN = "labajaditabarberstudio.com";

export type PublicSubdomain = "reservas" | "control" | "resenas" | "dispositivos";

export function getRequestHostname(headers: Headers) {
  const forwardedHost = headers.get("x-forwarded-host");
  const host = (forwardedHost || headers.get("host") || "").split(",")[0].trim();
  return host.split(":")[0].toLowerCase();
}

export function resolveSubdomain(hostname: string): PublicSubdomain | null {
  if (hostname === ROOT_DOMAIN || hostname === `www.${ROOT_DOMAIN}`) return null;
  const suffix = `.${ROOT_DOMAIN}`;
  if (!hostname.endsWith(suffix)) return null;

  const subdomain = hostname.slice(0, -suffix.length);
  return ["reservas", "control", "resenas", "dispositivos"].includes(subdomain)
    ? subdomain as PublicSubdomain
    : null;
}

export function getSubdomainRootRoute(subdomain: PublicSubdomain, hasSession = false) {
  switch (subdomain) {
    case "reservas":
      return "/reservar";
    case "control":
      return hasSession ? "/app/control" : "/app/login";
    case "resenas":
      return "/cliente/resena";
    case "dispositivos":
      return "/local/login";
  }
}

export function isInternalSubdomain(subdomain: PublicSubdomain | null) {
  return subdomain === "control" || subdomain === "dispositivos";
}

