import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La Bajadita Barber Shop",
  description: "PWA profesional para reservas, agenda y control interno."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
