"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import Loader from "@/components/ui/Loader";
import { safeReturnTo } from "@/lib/safeRedirect";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Error al iniciar sesión");
                setIsLoading(false);
                return;
            }

            // Login successful - redirect to the current default dashboard flow.
            // Solo rutas internas: evita un open redirect con ?returnTo=https://...
            window.location.href = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
        } catch (err) {
            console.error("Login error:", err);
            setError("Error al conectar con el servidor");
            setIsLoading(false);
        }
    };

    return (
        <div className="page-frame min-h-[calc(100vh-4rem)] grid md:grid-cols-12 gap-x-8 gap-y-10 content-center py-16">
            <div className="md:col-span-5 md:col-start-2 w-full max-w-md space-y-8">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="type-poster text-[clamp(3.5rem,8vw,6rem)]">
                        Entrar
                    </h1>
                    <p className="text-muted-foreground">
                        Inicia sesión para continuar con NitroGroups
                    </p>
                </div>

                {/* Login Form */}
                <div className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input
                            label="Correo electrónico"
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            icon={
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect width="20" height="16" x="2" y="4" rx="2" />
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                </svg>
                            }
                        />

                        <Input
                            label="Contraseña"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            icon={
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            }
                        />

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                                />
                                <span className="text-muted-foreground">Recordarme</span>
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-primary hover:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            size="lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader inline />
                                    <span>Iniciando sesión...</span>
                                </>
                            ) : (
                                "Iniciar sesión"
                            )}
                        </Button>
                    </form>

                    {/* Divider */}
                </div>

                {/* Sign Up Link */}
                <p className="text-sm text-muted-foreground">
                    ¿No tienes una cuenta?{" "}
                    <Link href="/signup" className="text-primary font-medium hover:underline">
                        Regístrate gratis
                    </Link>
                </p>
            </div>
            <aside className="hidden md:flex md:col-span-5 md:col-start-8 items-center">
                <p className="text-[clamp(1.5rem,2.4vw,2.25rem)] leading-snug text-tinta-2 max-w-[22ch]">
                    Tus solicitudes, tus fechas y cada conversación con los grupos, en un solo lugar.
                </p>
            </aside>
        </div>
    );
}
