"use client";

import { useState } from "react";
import { clearCachedAccessToken } from "@/lib/api-client";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearCachedAccessToken();
      window.location.href = "/";
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      {isLoading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}
