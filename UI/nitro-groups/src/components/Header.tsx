"use client";

import { useUser } from "@auth0/nextjs-auth0/client";
import { useState } from "react";
import Image from "next/image";

export default function Header() {
  const { user, isLoading } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <Image
            src="/img/Logo.png"
            alt="NitroGroups Logo"
            width={30}
            height={30}
            style={{ marginTop: "5px" }}
          />
          <span className="text-xl font-semibold">NitroGroups</span>
        </div>

        {/* Desktop Navigation */}
        {isLoading ? null : user ? (
          <div className="hidden md:flex items-center space-x-6">
            <span>Panel de Artista</span>
            <span className="text-muted-foreground">Hola, {user.name ?? user.nickname ?? user.email}</span>
            <a
              href="/api/auth/logout"
              className="bg-primary hover:bg-primary/90 h-8 gap-1.5 px-3 flex items-center text-white rounded"
            >
              Cerrar Sesión
            </a>
          </div>
        ) : (
          <>
            <nav className="hidden md:flex items-center space-x-6 h-full">
              {/* Navigation links can be added here */}
            </nav>
            <div className="hidden md:flex items-center space-x-3">
              <a
                href="/api/auth/login"
                className="flex items-center cursor-pointer rounded hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 gap-1.5 px-3"
              >
                Iniciar Sesión
              </a>
              <a
                href="/api/auth/login?screen_hint=signup"
                className="flex items-center bg-primary cursor-pointer hover:bg-primary/90 h-8 gap-1.5 px-3 text-white rounded"
              >
                Registrarse
              </a>
            </div>
          </>
        )}

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={toggleMenu}>
          {isMenuOpen ? (
            <span className="text-2xl">✕</span>
          ) : (
            <span className="text-2xl">☰</span>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`${isMenuOpen ? "block" : "hidden"} md:hidden border-t py-2`}>
        {isLoading ? null : user ? (
          <div className="flex flex-col space-y-2 px-4">
            <span className="text-lg font-medium py-2">Panel de Artista</span>
            <span className="text-muted-foreground">Hola, {user.name ?? user.nickname ?? user.email}</span>
            <a
              href="/api/auth/logout"
              className="bg-primary hover:bg-primary/90 py-2 text-white rounded text-center"
            >
              Cerrar Sesión
            </a>
          </div>
        ) : (
          <div className="flex flex-col space-y-1 px-4">
            <a
              href="#artistas"
              onClick={toggleMenu}
              className="block py-2 px-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Artistas
            </a>
            <a
              href="#clientes"
              onClick={toggleMenu}
              className="block py-2 px-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Clientes
            </a>
            <a
              href="#funcionalidades"
              onClick={toggleMenu}
              className="block py-2 px-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              Funcionalidades
            </a>

            <div className="pt-4 flex flex-col space-y-2">
              <a
                href="/api/auth/login"
                className="py-2 text-center border rounded hover:bg-accent"
              >
                Iniciar Sesión
              </a>
              <a
                href="/api/auth/login?screen_hint=signup"
                className="bg-primary hover:bg-primary/90 py-2 text-center text-white rounded"
              >
                Registrarse
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

