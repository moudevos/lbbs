import type { MetadataRoute } from "next";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/reservar", "/agenda", "/cliente/asistencias", "/cliente/resena"],
        disallow: ["/app/control", "/api", "/local", "/app/login", "/app/auth", "/app/verificar-correo"]
      }
    ],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl
  };
}
