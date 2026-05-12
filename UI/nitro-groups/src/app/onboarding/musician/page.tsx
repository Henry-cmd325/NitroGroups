"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import Loader from "@/components/ui/Loader";
import { ProgressSteps } from "@/components/ui/ProgressSteps";
import { musiciansService } from "@/services/musicians.service";

interface MusicianFormData {
    stageName: string;
    shortBio: string;
    yearsExperience: number;
    isOpenToJoin: boolean;
    createGroup: boolean;
    groupName: string;
}

const STEPS = [
    { id: "profile", label: "Perfil", description: "Tu identidad artística" },
    { id: "experience", label: "Experiencia", description: "Tu trayectoria" },
    { id: "group", label: "Grupo", description: "Configura tu grupo" },
    { id: "complete", label: "Listo", description: "Resumen final" },
];

export default function MusicianOnboardingPage() {
    const router = useRouter();
    const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [formData, setFormData] = useState<MusicianFormData>({
        stageName: "",
        shortBio: "",
        yearsExperience: 0,
        isOpenToJoin: true,
        createGroup: true,
        groupName: "",
    });

    // Set initial values from auth user
    useEffect(() => {
        if (authUser?.name && !formData.stageName) {
            setFormData(prev => ({
                ...prev,
                stageName: authUser.name || "",
                groupName: authUser.name || "",
            }));
        }
    }, [authUser]);

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const updateFormData = <K extends keyof MusicianFormData>(
        field: K,
        value: MusicianFormData[K]
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError("");
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.stageName.trim()) {
                    setError("Por favor ingresa tu nombre artístico");
                    return false;
                }
                break;
            case 3:
                if (formData.createGroup && !formData.groupName.trim()) {
                    setError("Por favor ingresa el nombre de tu grupo");
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
            // Use given_name/family_name from session (set during signup), fallback to splitting name
            const firstName = authUser?.given_name
                || authUser?.name?.split(" ")[0]
                || authUser?.email?.split("@")[0]
                || "Usuario";
            const lastName = authUser?.family_name
                || authUser?.name?.split(" ").slice(1).join(" ")
                || ".";

            // Call POST /api/musicians with the real backend request format
            await musiciansService.create({
                userInfo: {
                    auth0Id: authUser!.sub,
                    email: authUser!.email,
                    firstName,
                    lastName,
                    userType: 1, // Musician = 1 (backend enum integer)
                    origin: 0,   // SignUp = 0 (backend enum integer)
                },
                musicianProfile: {
                    shortBio: formData.shortBio || undefined,
                    yearsExperience: formData.yearsExperience,
                    isOpenToJoin: formData.isOpenToJoin,
                    createGroup: formData.createGroup,
                    groupName: formData.createGroup ? formData.groupName : undefined,
                },
                idGroup: 0, // Solo musician — backend triggers SoloMusicianCreatedEvent
            });

            // Clear signup session data
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("nitro_signup_user_type");
            }

            router.push("/dashboard/musician");
        } catch (err) {
            setError("Error al crear tu perfil. Por favor intenta de nuevo.");
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
                        🎸 Configura tu Perfil de Músico
                    </h1>
                    <p className="text-muted-foreground">
                        Cuéntanos sobre ti y tu música
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

                    {/* Step 1: Profile */}
                    {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">🎤</div>
                                <h2 className="text-xl font-semibold">Tu identidad artística</h2>
                                <p className="text-sm text-muted-foreground">
                                    ¿Cómo te conoce tu público?
                                </p>
                            </div>

                            <Input
                                label="Nombre artístico / Stage name"
                                type="text"
                                placeholder="Ej: DJ Thunder, Los Mariachis de Oro"
                                value={formData.stageName}
                                onChange={(e) => updateFormData("stageName", e.target.value)}
                                required
                            />

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Biografía corta
                                </label>
                                <textarea
                                    className="w-full min-h-[120px] px-4 py-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    placeholder="Cuéntanos sobre tu estilo, influencias y lo que te hace único..."
                                    value={formData.shortBio}
                                    onChange={(e) => updateFormData("shortBio", e.target.value)}
                                    maxLength={800}
                                />
                                <p className="text-xs text-muted-foreground text-right">
                                    {formData.shortBio.length}/800
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Experience */}
                    {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">⭐</div>
                                <h2 className="text-xl font-semibold">Tu experiencia</h2>
                                <p className="text-sm text-muted-foreground">
                                    Información sobre tu trayectoria musical
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Años de experiencia
                                </label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="50"
                                        value={formData.yearsExperience}
                                        onChange={(e) => updateFormData("yearsExperience", parseInt(e.target.value))}
                                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <span className="text-2xl font-bold min-w-[3ch] text-right">
                                        {formData.yearsExperience}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {formData.yearsExperience === 0 && "Recién comenzando"}
                                    {formData.yearsExperience > 0 && formData.yearsExperience <= 2 && "Principiante"}
                                    {formData.yearsExperience > 2 && formData.yearsExperience <= 5 && "Intermedio"}
                                    {formData.yearsExperience > 5 && formData.yearsExperience <= 10 && "Experimentado"}
                                    {formData.yearsExperience > 10 && "Veterano 🎖️"}
                                </p>
                            </div>

                            <div className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">¿Abierto a unirte a otros grupos?</p>
                                        <p className="text-sm text-muted-foreground">
                                            Otros músicos podrán invitarte a sus proyectos
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={formData.isOpenToJoin}
                                        onClick={() => updateFormData("isOpenToJoin", !formData.isOpenToJoin)}
                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${formData.isOpenToJoin ? "bg-primary" : "bg-muted"
                                            }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.isOpenToJoin ? "translate-x-5" : "translate-x-0"
                                                }`}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Group */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">🎵</div>
                                <h2 className="text-xl font-semibold">Tu grupo musical</h2>
                                <p className="text-sm text-muted-foreground">
                                    Crea tu perfil público para recibir contrataciones
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    type="button"
                                    onClick={() => updateFormData("createGroup", true)}
                                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${formData.createGroup
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">✅</span>
                                        <div>
                                            <p className="font-medium">Crear mi perfil de grupo</p>
                                            <p className="text-sm text-muted-foreground">
                                                Apareceré en el catálogo y podré recibir contrataciones
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => updateFormData("createGroup", false)}
                                    className={`w-full p-4 border-2 rounded-lg transition-all text-left ${!formData.createGroup
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">⏭️</span>
                                        <div>
                                            <p className="font-medium">Hacerlo después</p>
                                            <p className="text-sm text-muted-foreground">
                                                Solo quiero explorar la plataforma por ahora
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            {formData.createGroup && (
                                <div className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                                    <Input
                                        label="Nombre del grupo"
                                        type="text"
                                        placeholder="Ej: Los Rockers, Banda XYZ"
                                        value={formData.groupName}
                                        onChange={(e) => updateFormData("groupName", e.target.value)}
                                        required
                                        helperText="Puedes usar tu nombre artístico si eres solista"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Complete */}
                    {currentStep === 4 && (
                        <div className="space-y-6 animate-in fade-in-50 slide-in-from-right-4 duration-300">
                            <div className="text-center space-y-2 pb-4">
                                <div className="text-5xl">🚀</div>
                                <h2 className="text-xl font-semibold">¡Todo listo!</h2>
                                <p className="text-sm text-muted-foreground">
                                    Revisa tu información antes de continuar
                                </p>
                            </div>

                            <div className="space-y-4 bg-muted/50 rounded-lg p-6">
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Nombre artístico</span>
                                    <span className="font-medium text-right">{formData.stageName}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Experiencia</span>
                                    <span className="font-medium">{formData.yearsExperience} años</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Abierto a colaborar</span>
                                    <span className="font-medium">{formData.isOpenToJoin ? "Sí" : "No"}</span>
                                </div>
                                {formData.createGroup && (
                                    <div className="flex justify-between items-start">
                                        <span className="text-muted-foreground">Grupo</span>
                                        <span className="font-medium text-right">{formData.groupName}</span>
                                    </div>
                                )}
                                {formData.shortBio && (
                                    <div className="pt-2 border-t">
                                        <p className="text-muted-foreground text-sm mb-1">Biografía</p>
                                        <p className="text-sm">{formData.shortBio}</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-sm text-muted-foreground">
                                <p>Podrás completar más detalles en tu dashboard</p>
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
                                        <span>Configurando...</span>
                                    </>
                                ) : (
                                    "Ir a mi Dashboard"
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
