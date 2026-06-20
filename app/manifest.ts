import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "La Bajadita Barber Studio",
    short_name: "La Bajadita",
    description: "Dashboard operativo, reservas y dispositivos de La Bajadita Barber Studio.",
    start_url: "/app/login",
    display: "standalone",
    background_color: "#080806",
    theme_color: "#d4af37",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/apple-icon.png", sizes: "512x512", type: "image/png" }
    ]
  };
}
