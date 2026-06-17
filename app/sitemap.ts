import type { MetadataRoute } from "next";

const appUrl = "https://labajaditabarberstudio.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${appUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/reservar`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${appUrl}/agenda`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${appUrl}/cliente/asistencias`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${appUrl}/cliente/resena`, lastModified: now, changeFrequency: "monthly", priority: 0.5 }
  ];
}
