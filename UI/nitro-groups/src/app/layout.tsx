import type { Metadata } from "next";
import { Onest, Unbounded } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Providers from "./providers";
import Reveal from "@/components/layout/Reveal";

// Voz de cartel (Unbounded, ancha y pesada) y voz de lectura (Onest). Ver DESIGN.md.
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
  themeColor: "#D6BEFF",
  colorScheme: "light" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${unbounded.variable} ${onest.variable}`}>
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
