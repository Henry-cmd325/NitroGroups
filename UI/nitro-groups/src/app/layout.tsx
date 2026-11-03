import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Providers from "./providers";
import Reveal from "@/components/layout/Reveal";

// Inter para leer, Inter Tight para los títulos: sobria, de líneas limpias. Ver DESIGN.md.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NitroGroups — Música en vivo para tu evento",
    template: "%s · NitroGroups",
  },
  description:
    "Encuentra el grupo para tu boda, XV años o evento: revisa su música, su disponibilidad y su precio, y envíale una solicitud.",
};

export const viewport = {
  themeColor: "#0A090E",
  colorScheme: "dark" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${interTight.variable}`}>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <Providers>
          <Header />
          <main id="contenido">{children}</main>
          <Footer />
          <Reveal />
        </Providers>
      </body>
    </html>
  );
}
