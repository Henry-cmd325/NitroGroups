import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Providers from "./providers";

// Una sola familia variable: el eje de ancho (wdth 62–125) da la voz de cartel
// (condensada) y la de lectura (normal). Ver DESIGN.md.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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
  themeColor: "#1C0B0E",
  colorScheme: "dark" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={archivo.variable}>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
      >
        <Providers>
          <Header />
          <main id="contenido">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
