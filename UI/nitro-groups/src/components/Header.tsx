"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function Header() {
  const { user, isLoading } = useUser();

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-semibold">NitroGroups</span>
        </div>

        <nav className="hidden items-center space-x-6 md:flex">
          <a
            href="#artistas"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Artistas
          </a>
          <a
            href="#clientes"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Clientes
          </a>
          <a
            href="#funcionalidades"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Funcionalidades
          </a>
        </nav>

        <div className="flex items-center space-x-3">
          {isLoading ? null : user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name ?? "Usuario"}
                    className="h-8 w-8 rounded-full border"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border bg-muted">
                    {user.name?.slice(0, 1) ?? "U"}
                  </span>
                )}
                <span className="hidden text-foreground md:inline">
                  {user.name ?? user.nickname ?? user.email}
                </span>
              </div>
              <a
                href="/api/auth/logout"
                className="h-8 gap-1.5 rounded border px-3 text-sm hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
              >
                Salir
              </a>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <a
                href="/api/auth/login"
                className="h-8 gap-1.5 px-3 text-sm hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
              >
                Iniciar Sesión
              </a>
              <a
                href="/api/auth/login"
                className="h-8 gap-1.5 rounded bg-primary px-3 text-sm text-white hover:bg-primary/90"
              >
                Registrarse
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
