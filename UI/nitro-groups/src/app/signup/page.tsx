"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import Loader from "@/components/ui/Loader";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import PhoneInput from "@/components/ui/PhoneInput";

type UserType = "musician" | "client" | "band_member";

interface FormData {
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    userType: UserType;
    phone: string;
}

interface FieldTouched {
    email: boolean;
    password: boolean;
    confirmPassword: boolean;
    firstName: boolean;
    lastName: boolean;
}

const STEPS = [
    { id: "account", label: "Cuenta", description: "Información básica" },
    { id: "profile", label: "Perfil", description: "Datos personales" },
    { id: "type", label: "Tipo", description: "Selecciona tu rol" },
];

// ── Validation helpers ──

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface PasswordStrength {
    score: number;        // 0-4
    label: string;
    color: string;
    barColor: string;
}

function getPasswordStrength(password: string): PasswordStrength {
    if (!password) return { score: 0, label: "", color: "", barColor: "bg-muted" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: "Débil", color: "text-red-500", barColor: "bg-red-500" };
    if (score <= 2) return { score: 2, label: "Regular", color: "text-orange-500", barColor: "bg-orange-500" };
    if (score <= 3) return { score: 3, label: "Buena", color: "text-yellow-500", barColor: "bg-yellow-500" };
    return { score: 4, label: "Fuerte", color: "text-green-500", barColor: "bg-green-500" };
}

export default function SignupPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState<FormData>({
        email: "",
        password: "",
        confirmPassword: "",
        firstName: "",
        lastName: "",
        userType: "musician",
        phone: "",
    });
    const [touched, setTouched] = useState<FieldTouched>({
        email: false,
        password: false,
        confirmPassword: false,
        firstName: false,
        lastName: false,
    });

    const updateFormData = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError("");
    };

    const markTouched = (field: keyof FieldTouched) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
    };

    // ── Real-time validation state ──

    const emailError = useMemo(() => {
        if (!touched.email || !formData.email) return undefined;
        if (!isValidEmail(formData.email)) return "Ingresa un correo electrónico válido";
        return undefined;
    }, [formData.email, touched.email]);

    const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

    const passwordError = useMemo(() => {
        if (!touched.password || !formData.password) return undefined;
        if (formData.password.length < 8) return "Mínimo 8 caracteres";
        return undefined;
    }, [formData.password, touched.password]);

    const confirmPasswordError = useMemo(() => {
        if (!touched.confirmPassword || !formData.confirmPassword) return undefined;
        if (formData.password !== formData.confirmPassword) return "Las contraseñas no coinciden";
        return undefined;
    }, [formData.password, formData.confirmPassword, touched.confirmPassword]);

    const confirmPasswordSuccess = useMemo(() => {
        return formData.confirmPassword.length > 0 && formData.password === formData.confirmPassword;
    }, [formData.password, formData.confirmPassword]);

    const firstNameError = useMemo(() => {
        if (!touched.firstName || !formData.firstName) return undefined;
        if (formData.firstName.trim().length < 2) return "Mínimo 2 caracteres";
        return undefined;
    }, [formData.firstName, touched.firstName]);

    const lastNameError = useMemo(() => {
        if (!touched.lastName || !formData.lastName) return undefined;
        if (formData.lastName.trim().length < 2) return "Mínimo 2 caracteres";
        return undefined;
    }, [formData.lastName, touched.lastName]);

    // ── Step validity (determines if "Siguiente" is enabled) ──

    const isStepValid = useMemo(() => {
        switch (currentStep) {
            case 1:
                return (
                    formData.email.length > 0 &&
                    isValidEmail(formData.email) &&
                    formData.password.length >= 8 &&
                    formData.confirmPassword.length > 0 &&
                    formData.password === formData.confirmPassword
                );
            case 2:
                return formData.firstName.trim().length >= 2 && formData.lastName.trim().length >= 2;
            default:
                return true;
        }
    }, [currentStep, formData]);

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.email || !formData.password || !formData.confirmPassword) {
                    setError("Por favor completa todos los campos");
                    return false;
                }
                if (!isValidEmail(formData.email)) {
                    setError("El correo electrónico no es válido");
                    return false;
                }
                if (formData.password.length < 8) {
                    setError("La contraseña debe tener al menos 8 caracteres");
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setError("Las contraseñas no coinciden");
                    return false;
                }
                break;
            case 2:
                if (!formData.firstName.trim() || !formData.lastName.trim()) {
                    setError("Por favor completa tu nombre");
                    return false;
                }
                if (formData.firstName.trim().length < 2 || formData.lastName.trim().length < 2) {
                    setError("El nombre debe tener al menos 2 caracteres");
                    return false;
                }
                break;
        }
        return true;
    };

    const handleNext = () => {
        // Mark all fields as touched for the current step
        if (currentStep === 1) {
            setTouched(prev => ({ ...prev, email: true, password: true, confirmPassword: true }));
        } else if (currentStep === 2) {
            setTouched(prev => ({ ...prev, firstName: true, lastName: true }));
        }
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setError("");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentStep < STEPS.length) {
            handleNext();
        }
    };

    const handleSelectUserType = async (userType: string) => {
        if (isLoading) return;

        setIsLoading(true);
        setError("");
        updateFormData("userType", userType);

        try {
            // Step 1: Create user in Auth0
            const signupResponse = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    userType: userType,
                }),
            });

            const signupData = await signupResponse.json();

            if (!signupResponse.ok) {
                setError(signupData.error || "Error al crear la cuenta");
                setIsLoading(false);
                return;
            }

            // Step 2: Auto-login to establish session
            const loginResponse = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    userType: userType,
                }),
            });

            if (!loginResponse.ok) {
                window.location.href = `/login?email=${encodeURIComponent(formData.email)}`;
                return;
            }

            localStorage.setItem("nitro_logged_in", "true");
            sessionStorage.setItem("nitro_signup_user_type", userType);

            let returnTo: string;
            switch (userType) {
                case "client":
                    returnTo = "/dashboard/client";
                    break;
                case "musician":
                    returnTo = "/onboarding/musician";
                    break;
                case "band_member":
                    returnTo = "/onboarding/manager";
                    break;
                default:
                    returnTo = "/onboarding";
            }

            window.location.href = returnTo;
        } catch (err) {
            console.error("Signup error:", err);
            setError("Error al conectar con el servidor");
            setIsLoading(false);
        }
    };

    return (
        <div className="page-frame py-16 md:py-24 grid md:grid-cols-12 gap-x-8 gap-y-10">
            <div className="md:col-span-7 w-full max-w-2xl space-y-10">
                {/* Header */}
                <div className="space-y-3">
                    <h1 className="type-poster text-[clamp(3.25rem,8vw,6rem)]">
                        Crear cuenta
                    </h1>
                    <p className="text-muted-foreground">
                        Crea tu cuenta y comienza a conectar con la música
                    </p>
                </div>

                {/* Progress Steps */}
                <ProgressSteps steps={STEPS} currentStep={currentStep} />

                {/* Signup Form */}
                <div className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Step 1: Account Information */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                                <Input
                                    label="Correo electrónico"
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={formData.email}
                                    onChange={(e) => updateFormData("email", e.target.value)}
                                    onBlur={() => markTouched("email")}
                                    required
                                    error={emailError}
                                    success={touched.email && !!formData.email && !emailError}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    }
                                />

                                <div className="space-y-2">
                                    <Input
                                        label="Contraseña"
                                        type="password"
                                        placeholder="Mínimo 8 caracteres"
                                        value={formData.password}
                                        onChange={(e) => updateFormData("password", e.target.value)}
                                        onBlur={() => markTouched("password")}
                                        required
                                        error={passwordError}
                                        icon={
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                        }
                                    />
                                    {/* Password Strength Bar */}
                                    {formData.password.length > 0 && (
                                        <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                                            <div className="flex gap-1.5">
                                                {[1, 2, 3, 4].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrength.score >= level
                                                            ? passwordStrength.barColor
                                                            : "bg-muted"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className={`text-xs font-medium ${passwordStrength.color}`}>
                                                    {passwordStrength.label}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Usa letras, números y símbolos
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    label="Confirmar contraseña"
                                    type="password"
                                    placeholder="Repite tu contraseña"
                                    value={formData.confirmPassword}
                                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                                    onBlur={() => markTouched("confirmPassword")}
                                    required
                                    success={confirmPasswordSuccess}
                                    error={confirmPasswordError}
                                />
                            </div>
                        )}

                        {/* Step 2: Profile Information */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Nombre"
                                        type="text"
                                        placeholder="Tu nombre"
                                        value={formData.firstName}
                                        onChange={(e) => updateFormData("firstName", e.target.value)}
                                        onBlur={() => markTouched("firstName")}
                                        required
                                        error={firstNameError}
                                        success={touched.firstName && formData.firstName.trim().length >= 2}
                                    />

                                    <Input
                                        label="Apellido"
                                        type="text"
                                        placeholder="Tu apellido"
                                        value={formData.lastName}
                                        onChange={(e) => updateFormData("lastName", e.target.value)}
                                        onBlur={() => markTouched("lastName")}
                                        required
                                        error={lastNameError}
                                        success={touched.lastName && formData.lastName.trim().length >= 2}
                                    />
                                </div>

                                <PhoneInput
                                    label="Teléfono (opcional)"
                                    value={formData.phone}
                                    onChange={(phone) => updateFormData("phone", phone)}
                                />
                            </div>
                        )}

                        {/* Step 3: User Type Selection */}
                        {currentStep === 3 && (
                            <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                                <p className="text-lg font-medium text-center">
                                    ¿Qué vienes a hacer a NitroGroups?
                                </p>

                                {/* Client Option */}
                                <button
                                    type="button"
                                    onClick={() => handleSelectUserType("client")}
                                    disabled={isLoading}
                                    className={`w-full p-6 border-2 rounded-lg transition-all hover:shadow-lg text-left disabled:opacity-50 ${formData.userType === "client" && isLoading
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="text-4xl">🎉</div>
                                        <div className="space-y-1">
                                            <h3 className="font-semibold text-lg">Contratar músicos</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Quiero encontrar y contratar músicos para mis eventos
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-muted" />
                                    </div>
                                    <div className="relative flex justify-start text-sm">
                                        <span className="bg-background pr-3 text-muted-foreground">
                                            Ofrecer servicios
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Musician Option */}
                                    <button
                                        type="button"
                                        onClick={() => handleSelectUserType("musician")}
                                        disabled={isLoading}
                                        className={`p-6 border-2 rounded-lg transition-all hover:shadow-lg text-left disabled:opacity-50 ${formData.userType === "musician" && isLoading
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="text-4xl">🎸</div>
                                            <h3 className="font-semibold text-lg">Músico / Líder de Banda</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Toco música y quiero ofrecer mis servicios. Puedo liderar o formar parte de grupos.
                                            </p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                                    Apareces en catálogo
                                                </span>
                                                <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                                    Perfil de músico
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Manager Option */}
                                    <button
                                        type="button"
                                        onClick={() => handleSelectUserType("band_member")}
                                        disabled={isLoading}
                                        className={`p-6 border-2 rounded-lg transition-all hover:shadow-lg text-left disabled:opacity-50 ${formData.userType === "band_member" && isLoading
                                            ? "border-primary bg-primary/5"
                                            : "border-muted hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="space-y-3">
                                            <div className="text-4xl">💼</div>
                                            <h3 className="font-semibold text-lg">Manager / Representante</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Administro grupos musicales pero no toco. Gestiono contratos y agenda.
                                            </p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                                                    Solo administración
                                                </span>
                                                <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                                                    Invita músicos
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex gap-3 pt-4">
                            {currentStep > 1 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBack}
                                    className="flex-1"
                                    disabled={isLoading}
                                >
                                    Atrás
                                </Button>
                            )}

                            {currentStep < STEPS.length && (
                                <Button
                                    type="button"
                                    onClick={handleNext}
                                    className="flex-1"
                                    size="lg"
                                    disabled={!isStepValid}
                                >
                                    Siguiente
                                </Button>
                            )}

                            {currentStep === STEPS.length && isLoading && (
                                <div className="flex-1 flex items-center justify-center gap-2 py-3">
                                    <Loader />
                                    <span className="text-sm text-muted-foreground">Creando cuenta...</span>
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Divider - Only show on first step */}
                </div>

                {/* Login Link */}
                <p className="text-sm text-muted-foreground">
                    ¿Ya tienes una cuenta?{" "}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                        Inicia sesión
                    </Link>
                </p>
            </div>
            <aside className="hidden md:block md:col-span-4 md:col-start-9 md:pt-40">
                <p className="text-[clamp(1.35rem,2vw,1.85rem)] leading-snug text-papel-2 max-w-[24ch]">
                    Una cuenta de cliente para contratar grupos, o de músico para publicar el tuyo. Lo eliges al final.
                </p>
            </aside>
        </div>
    );
}
