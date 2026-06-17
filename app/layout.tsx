import type { Metadata } from "next";
import "./globals.css";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001").replace(/\/$/, "");
const seoTitle = "La Bajadita Barber Studio | Barbería premium en Iquitos";
const seoDescription = "Reserva tu corte en La Bajadita Barber Studio, barbería premium en Iquitos con corte clásico, fade, barba, perfilado y atención personalizada.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: seoTitle,
    template: "%s | La Bajadita Barber Studio"
  },
  description: seoDescription,
  keywords: [
    "barberia en Iquitos",
    "barber shop Iquitos",
    "corte de cabello Iquitos",
    "corte fade Iquitos",
    "barberia premium Iquitos",
    "corte clasico Iquitos",
    "barba Iquitos",
    "La Bajadita Barber Studio"
  ],
  applicationName: "La Bajadita Barber Studio",
  authors: [{ name: "La Bajadita Barber Studio" }],
  creator: "La Bajadita Barber Studio",
  publisher: "La Bajadita Barber Studio",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    url: appUrl,
    siteName: "La Bajadita Barber Studio",
    images: [{ url: "/landing/hero/hero-1.png", width: 1200, height: 630, alt: "La Bajadita Barber Studio, barbería premium en Iquitos" }],
    locale: "es_PE",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
    images: ["/landing/hero/hero-1.png"]
  },
  category: "Barberia",
  formatDetection: {
    telephone: true,
    address: true,
    email: false
  },
  appleWebApp: {
    capable: true,
    title: "La Bajadita",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
