"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import Loader from "@/components/ui/Loader";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import PhoneInput from "@/components/ui/PhoneInput";
import { groupsService, generateSlug } from "@/features/groups/services/groups.service";

interface ManagerFormData {
    // Group info
    groupName: string;
    slug: string;
    groupDescription: string;
    biography: string;
    // Location & Contact
    locationText: string;
    phone: string;
    email: string;
    // Pricing
    basePrice: string;
    hourlyRate: string;
    minimumDurationHours: number;
    serviceRadiusKm: number;
    currency: string;
    // Invitations
    inviteEmails: string[];
    currentEmail: string;
}

const STEPS = [
    { id: "welcome", label: "Bienvenida", description: "Tu rol como manager" },
    { id: "group", label: "Grupo", description: "Información básica" },
    { id: "pricing", label: "Precios", description: "Tarifas y servicio" },
    { id: "invite", label: "Invitar", description: "Agrega músicos" },
    { id: "complete", label: "Listo", description: "Resumen final" },
];

export default function ManagerOnboardingPage() {
    const router = useRouter();
    const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
    const { user } = useCurrentUser();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

    const [formData, setFormData] = useState<ManagerFormData>({
        groupName: "",
        slug: "",
        groupDescription: "",
        biography: "",
        locationText: "",
        phone: "",
        email: "",
        basePrice: "",
        hourlyRate: "",
        minimumDurationHours: 2,
        serviceRadiusKm: 50,
        currency: "MXN",
        inviteEmails: [],
        currentEmail: "",
    });

    // Set initial email from auth user
    useEffect(() => {
        if (authUser?.email && !formData.email) {
            setFormData(prev => ({
                ...prev,
                email: authUser.email || "",
            }));
        }
    }, [authUser]);

    // Check slug availability with debounce
    const checkSlug = useCallback(async (slug: string) => {
        if (!slug || slug.length < 3) {
            setSlugStatus("idle");
            return;
        }
        setSlugStatus("checking");
        try {
            const available = await groupsService.checkSlugAvailability(slug);
            setSlugStatus(available ? "available" : "taken");
        } catch {
            setSlugStatus("idle");
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (formData.slug) {
                checkSlug(formData.slug);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [formData.slug, checkSlug]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const updateFormData = <K extends keyof ManagerFormData>(
        field: K,
        value: ManagerFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError("");
    };

    const handleGroupNameChange = (value: string) => {
        const slug = generateSlug(value);
        setFormData(prev => ({
            ...prev,
            groupName: value,
            slug,
        }));
        setError("");
    };

    const addEmail = () => {
        const email = formData.currentEmail.trim();
        if (email && email.includes("@") && !formData.inviteEmails.includes(email)) {
            setFormData((prev) => ({
                ...prev,
                inviteEmails: [...prev.inviteEmails, email],
                currentEmail: "",
            }));
        }
    };

    const removeEmail = (email: string) => {
        setFormData((prev) => ({
            ...prev,
            inviteEmails: prev.inviteEmails.filter((e) => e !== email),
        }));
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 2:
                if (!formData.groupName.trim()) {
                    setError("Por favor ingresa el nombre del grupo");
                    return false;
                }
                if (formData.groupName.trim().length < 3) {
                    setError("El nombre del grupo debe tener al menos 3 caracteres");
                    return false;
                }
                if (slugStatus === "taken") {
                    setError("Este nombre de grupo ya está en uso, elige otro");
                    return false;
                }
                if (!formData.locationText.trim()) {
                    setError("Por favor ingresa la ubicación del grupo");
                    return false;
                }
                break;
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
        }
    };

    const handleBack = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        setError("");
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        setError("");

        try {
            // Call POST /api/groups
            await groupsService.create({
                ownerUserId: user!.id,
                slug: formData.slug || generateSlug(formData.groupName),
                groupName: formData.groupName,
                description: formData.groupDescription,
                biography: formData.biography,
                numMembers: 1,
                yearsExperience: 0,
                phone: formData.phone,
                email: formData.email,
                locationText: formData.locationText,
                serviceRadiusKm: formData.serviceRadiusKm,
                currency: formData.currency,
                basePrice: formData.basePrice ? parseFloat(formData.basePrice) : undefined,
                hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
                minimumDurationHours: formData.minimumDurationHours,
                setupTimeMinutes: 30,
                isAcceptingBookings: true,
                active: true,
            });

            // TODO: Send invitations to musicians when endpoint is ready
            // for (const email of formData.inviteEmails) {
            //     await invitationsService.send(groupId, email);
            // }

            // Clear signup session data
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("nitro_signup_user_type");
            }

            router.push("/dashboard/musician");
        } catch (err) {
            setError("Error al crear el grupo. Por favor intenta de nuevo.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background px-4 py-12">
            <div className="w-full max-w-2xl space-y-8 animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">
                        💼 Configura tu Grupo Musical
                    </h1>
                    <p className="text-muted-foreground">
                        Administra tu grupo profesionalmente
                    </p>
                </div>

                {/* Progress Steps */}
                <ProgressSteps steps={STEPS} currentStep={currentStep} />

                {/* Form Card */}
                <div className="bg-card border rounded-lg shadow-lg p-8 space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Step 1: Welcome */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-4 py-4">
                                <div className="text-6xl">💼</div>
                                <h2 className="text-2xl font-semibold">Bienvenido, Manager</h2>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Como manager, podrás administrar tu grupo musical,
                                    gestionar contrataciones y hacer crecer tu negocio.
                                </p>
                            </div>

                            <div className="space-y-3 bg-muted/50 rounded-lg p-6">
                                <h3 className="font-medium mb-4">Tu rol incluye:</h3>
                                {[
                                    "Crear y administrar tu grupo musical",
                                    "Gestionar calendario y disponibilidad",
                                    "Manejar cotizaciones y contratos",
                                    "Invitar músicos a tu grupo",
                                    "Recibir contrataciones de clientes",
                                    "Acceso a reportes financieros",
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-primary">✓</span>
                                        <span className="text-sm">{item}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>💡 Tip:</strong> Al terminar este proceso, tu grupo aparecerá
                                    en el catálogo público y podrás empezar a recibir solicitudes.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Group Info */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">🎵</div>
                                <h2 className="text-xl font-semibold">Información del grupo</h2>
                                <p className="text-sm text-muted-foreground">
                                    Datos básicos para el perfil público de tu grupo
                                </p>
                            </div>

                            {/* Group Name */}
                            <div className="space-y-2">
                                <Input
                                    label="Nombre del grupo *"
                                    type="text"
                                    placeholder="Ej: Los Mariachis del Valle"
                                    value={formData.groupName}
                                    onChange={(e) => handleGroupNameChange(e.target.value)}
                                    required
                                />
                                {formData.slug && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-muted-foreground">URL:</span>
                                        <code className="bg-muted px-2 py-0.5 rounded">
                                            nitrogroups.com/{formData.slug}
                                        </code>
                                        {slugStatus === "checking" && (
                                            <span className="text-muted-foreground">Verificando...</span>
                                        )}
                                        {slugStatus === "available" && (
                                            <span className="text-green-600">✓ Disponible</span>
                                        )}
                                        {slugStatus === "taken" && (
                                            <span className="text-destructive">✗ No disponible</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Descripción del grupo
                                </label>
                                <textarea
                                    className="w-full min-h-[100px] px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    placeholder="Describe el estilo musical, servicios que ofrecen..."
                                    value={formData.groupDescription}
                                    onChange={(e) => updateFormData("groupDescription", e.target.value)}
                                    maxLength={500}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {formData.groupDescription.length}/500
                                </p>
                            </div>

                            {/* Location */}
                            <Input
                                label="Ubicación *"
                                type="text"
                                placeholder="Ej: Guadalajara, Jalisco, México"
                                value={formData.locationText}
                                onChange={(e) => updateFormData("locationText", e.target.value)}
                                required
                                icon={
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                }
                            />

                            {/* Phone & Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <PhoneInput
                                    label="Teléfono del grupo"
                                    value={formData.phone}
                                    onChange={(phone) => updateFormData("phone", phone)}
                                />
                                <Input
                                    label="Email de contacto"
                                    type="email"
                                    placeholder="grupo@email.com"
                                    value={formData.email}
                                    onChange={(e) => updateFormData("email", e.target.value)}
                                    icon={
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Pricing */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">💰</div>
                                <h2 className="text-xl font-semibold">Tarifas y servicio</h2>
                                <p className="text-sm text-muted-foreground">
                                    Configura los precios base de tu grupo (puedes modificarlos después)
                                </p>
                            </div>

                            {/* Currency Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Moneda</label>
                                <div className="flex gap-2">
                                    {["MXN", "USD"].map((curr) => (
                                        <button
                                            key={curr}
                                            type="button"
                                            onClick={() => updateFormData("currency", curr)}
                                            className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${formData.currency === curr
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-muted hover:border-primary/50"
                                                }`}
                                        >
                                            {curr === "MXN" ? "🇲🇽 MXN" : "🇺🇸 USD"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Prices */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Precio base por evento"
                                    type="number"
                                    placeholder="Ej: 5000"
                                    value={formData.basePrice}
                                    onChange={(e) => updateFormData("basePrice", e.target.value)}
                                    helperText={`En ${formData.currency}`}
                                    icon={
                                        <span className="text-sm font-medium">$</span>
                                    }
                                />
                                <Input
                                    label="Tarifa por hora"
                                    type="number"
                                    placeholder="Ej: 1500"
                                    value={formData.hourlyRate}
                                    onChange={(e) => updateFormData("hourlyRate", e.target.value)}
                                    helperText={`En ${formData.currency}`}
                                    icon={
                                        <span className="text-sm font-medium">$/hr</span>
                                    }
                                />
                            </div>

                            {/* Duration & Radius */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Duración mínima del evento
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="12"
                                            value={formData.minimumDurationHours}
                                            onChange={(e) => updateFormData("minimumDurationHours", parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="text-lg font-bold min-w-[4ch] text-right">
                                            {formData.minimumDurationHours}h
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        Radio de servicio
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="10"
                                            max="500"
                                            step="10"
                                            value={formData.serviceRadiusKm}
                                            onChange={(e) => updateFormData("serviceRadiusKm", parseInt(e.target.value))}
                                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                        />
                                        <span className="text-lg font-bold min-w-[6ch] text-right">
                                            {formData.serviceRadiusKm} km
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Distancia máxima que estás dispuesto a viajar para un evento
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-lg">
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    <strong>Nota:</strong> Los precios son referenciales. Podrás crear
                                    cotizaciones personalizadas para cada cliente.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Invite Musicians */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">📧</div>
                                <h2 className="text-xl font-semibold">Invita a tus músicos</h2>
                                <p className="text-sm text-muted-foreground">
                                    Agrega los emails de los músicos que formarán parte del grupo
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Input
                                    label=""
                                    type="email"
                                    placeholder="musico@email.com"
                                    value={formData.currentEmail}
                                    onChange={(e) => updateFormData("currentEmail", e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addEmail();
                                        }
                                    }}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addEmail}
                                    className="shrink-0 mt-1"
                                >
                                    Agregar
                                </Button>
                            </div>

                            {formData.inviteEmails.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">
                                        Músicos a invitar ({formData.inviteEmails.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.inviteEmails.map((email) => (
                                            <div
                                                key={email}
                                                className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm"
                                            >
                                                <span>{email}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmail(email)}
                                                    className="text-muted-foreground hover:text-foreground"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No has agregado músicos aún</p>
                                    <p className="text-sm">
                                        Puedes hacer esto después desde tu dashboard
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 5: Complete */}
                    {currentStep === 5 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">🚀</div>
                                <h2 className="text-xl font-semibold">¡Todo listo!</h2>
                                <p className="text-sm text-muted-foreground">
                                    Revisa la información de tu grupo
                                </p>
                            </div>

                            <div className="space-y-4 bg-muted/50 rounded-lg p-6">
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Nombre del grupo</span>
                                    <span className="font-medium text-right">{formData.groupName}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">URL</span>
                                    <code className="text-sm bg-background px-2 py-0.5 rounded">{formData.slug}</code>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Ubicación</span>
                                    <span className="font-medium text-right">{formData.locationText}</span>
                                </div>
                                {formData.phone && (
                                    <div className="flex justify-between items-start">
                                        <span className="text-muted-foreground">Teléfono</span>
                                        <span className="font-medium">{formData.phone}</span>
                                    </div>
                                )}
                                {(formData.basePrice || formData.hourlyRate) && (
                                    <div className="flex justify-between items-start">
                                        <span className="text-muted-foreground">Precios</span>
                                        <div className="text-right text-sm">
                                            {formData.basePrice && (
                                                <p>Base: ${formData.basePrice} {formData.currency}</p>
                                            )}
                                            {formData.hourlyRate && (
                                                <p>Por hora: ${formData.hourlyRate} {formData.currency}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Radio de servicio</span>
                                    <span className="font-medium">{formData.serviceRadiusKm} km</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Músicos a invitar</span>
                                    <span className="font-medium">{formData.inviteEmails.length}</span>
                                </div>
                                {formData.groupDescription && (
                                    <div className="pt-2 border-t">
                                        <p className="text-muted-foreground text-sm mb-1">Descripción</p>
                                        <p className="text-sm">{formData.groupDescription}</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                <p>Las invitaciones se enviarán cuando los músicos se registren</p>
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
                            >
                                Atrás
                            </Button>
                        )}

                        {currentStep < STEPS.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="flex-1"
                                size="lg"
                            >
                                Siguiente
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleComplete}
                                className="flex-1"
                                size="lg"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader />
                                        <span>Creando grupo...</span>
                                    </>
                                ) : (
                                    "Crear grupo y continuar"
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
