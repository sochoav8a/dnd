import type { Metadata, Viewport } from "next";
import { Cinzel, Crimson_Text, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./providers";

const display = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const serif = Crimson_Text({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcana — Compendio de campañas",
  description:
    "Hojas de personaje, combates y bestiario para tus partidas de D&D 5e en mesa.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0c0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`h-full ${display.variable} ${serif.variable} ${sans.variable}`}
    >
      <body className="flex min-h-full flex-col bg-grain text-stone-100 antialiased">
        <SessionProvider>
          <div className="flex-1 animate-fade-in">{children}</div>
          <footer className="mt-12 border-t border-stone-900 px-4 py-4 text-center text-[10px] text-stone-600">
            <span className="font-display uppercase tracking-[0.2em] text-stone-700">
              Arcana
            </span>{" "}
            · Iconos por{" "}
            <a
              href="https://game-icons.net"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-parchment-400 hover:underline"
            >
              game-icons.net
            </a>{" "}
            (CC BY 3.0) · Contenido bajo SRD 5.1 (OGL)
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
