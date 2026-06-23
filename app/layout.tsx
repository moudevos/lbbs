import type { Metadata } from "next";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { VercelPublicAnalytics } from "@/components/analytics/vercel-public-analytics";
import { VercelPublicSpeedInsights } from "@/components/analytics/vercel-public-speed-insights";
import { PwaRegistration } from "@/components/pwa/pwa-registration";
import "./globals.css";

const appUrl = "https://labajaditabarberstudio.com";
const seoTitle = "La Bajadita Barber Studio | Barbería premium en Iquitos";
const seoDescription = "Reserva tu corte en La Bajadita Barber Studio, barbería premium en Iquitos: corte clásico, fade, barba y perfilado.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: seoTitle,
    template: "%s | La Bajadita Barber Studio"
  },
  description: seoDescription,
  keywords: [
    "barbería en Iquitos",
    "barber shop Iquitos",
    "corte de cabello Iquitos",
    "corte fade Iquitos",
    "barbería premium Iquitos",
    "corte clásico Iquitos",
    "barba Iquitos",
    "La Bajadita Barber Studio"
  ],
  applicationName: "La Bajadita Barber Studio",
  authors: [{ name: "La Bajadita Barber Studio" }],
  creator: "La Bajadita Barber Studio",
  publisher: "La Bajadita Barber Studio",
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
  category: "Barbería",
  formatDetection: { telephone: true, address: true, email: false },
  appleWebApp: { capable: true, title: "La Bajadita", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.png", apple: "/apple-icon.png" },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <PwaRegistration />
        <GoogleAnalytics />
        <VercelPublicAnalytics />
        <VercelPublicSpeedInsights />
      </body>
    </html>
  );
}
