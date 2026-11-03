"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { musiciansService } from "@/services/musicians.service";
import {
    SHORT_BIO_MAX,
    STAGE_NAME_MAX,
    GROUP_NAME_MAX,
    YEARS_MAX,
    experienceLabel,
    resolveSignupName,
    validateMusicianStep,
    type FieldError,
    type MusicianField,
} from "@/features/onboarding/rules";
import {
    ArrivalView,
    ChoiceGroup,
    FormError,
    OnboardingFrame,
    OnboardingLoading,
    RangeField,
    ReviewList,
    StepActions,
    StepHeading,
    SwitchField,
    TextareaField,
} from "@/features/onboarding/components/OnboardingParts";

interface MusicianFormData {
    stageName: string;
    shortBio: string;
    yearsExperience: number;
    isOpenToJoin: boolean;
    createGroup: boolean;
    groupName: string;
}

const STEPS = [
    { id: "profile", label: "Perfil" },
    { id: "experience", label: "Experiencia" },
    { id: "group", label: "Grupo" },
    { id: "complete", label: "Revisar" },
];

/** Nota lateral de cada paso: qué se hace con lo que escribe y qué viene después. */
const ASIDE: Record<number, string> = {
    1: "Tu nombre artístico es lo primero que leen los clientes cuando te encuentran. La biografía puedes pulirla después.",
    2: "La experiencia ayuda a los clientes a decidir. Si aceptas invitaciones, otros grupos podrán sumarte a sus proyectos.",
    3: "Con un perfil de grupo apareces en el catálogo y recibes solicitudes. Si eres solista, usa tu nombre artístico.",
    4: "Al crear tu perfil entras a tu panel, donde agregas fotos, precios y fechas disponibles.",
};

const yearsText = (years: number) => (years === 1 ? "1 año" : `${years} años`);

export default function MusicianOnboardingPage() {
    const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [hasNavigated, setHasNavigated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldError, setFieldError] = useState<FieldError<MusicianField> | null>(null);
    const [submitError, setSubmitError] = useState("");
    const [created, setCreated] = useState(false);
    const stageNameRef = useRef<HTMLInputElement>(null);
    const groupNameRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<MusicianFormData>({
        stageName: "",
        shortBio: "",
        yearsExperience: 0,
        isOpenToJoin: true,
        createGroup: true,
        groupName: "",
    });

    // El nombre artístico empieza vacío: el nombre de la cuenta casi nunca es el del escenario.
    if (authLoading) return <OnboardingLoading label="Cargando tu cuenta…" />;
    if (!isAuthenticated) return null;

    const updateFormData = <K extends keyof MusicianFormData>(field: K, value: MusicianFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setFieldError((prev) => (prev?.field === field ? null : prev));
        setSubmitError("");
    };

    const errorFor = (field: MusicianField) => (fieldError?.field === field ? fieldError.message : undefined);

    const handleNext = () => {
        const problem = validateMusicianStep(currentStep, formData);
        if (problem) {
            setFieldError(problem);
            (problem.field === "stageName" ? stageNameRef : groupNameRef).current?.focus();
            return;
        }
        setFieldError(null);
        setHasNavigated(true);
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    };

    const handleBack = () => {
        setFieldError(null);
        setSubmitError("");
        setHasNavigated(true);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleComplete = async () => {
        setIsSubmitting(true);
        setSubmitError("");

        try {
            // Nombre y apellido de la sesión (registro); si faltan, se derivan del nombre o del correo.
            const { firstName, lastName } = resolveSignupName(authUser);

            // POST /api/musicians con el formato real del backend
            await musiciansService.create({
                userInfo: {
                    auth0Id: authUser!.sub,
                    email: authUser!.email,
                    firstName,
                    lastName,
                    userType: 1, // Musician = 1 (enum entero del backend)
                    origin: 0,   // SignUp = 0 (enum entero del backend)
                },
                musicianProfile: {
                    shortBio: formData.shortBio || undefined,
                    yearsExperience: formData.yearsExperience,
                    isOpenToJoin: formData.isOpenToJoin,
                    createGroup: formData.createGroup,
                    groupName: formData.createGroup ? formData.groupName : undefined,
                },
                idGroup: 0, // Músico solista: el backend dispara SoloMusicianCreatedEvent
            });

            // Limpia el dato temporal del registro
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("nitro_signup_user_type");
            }

            setCreated(true);
        } catch (err) {
            setSubmitError("No pudimos crear tu perfil. Revisa tu conexión y vuelve a intentarlo; lo que escribiste sigue aquí.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (created) {
        const name = formData.createGroup ? formData.groupName : formData.stageName;
        return (
            <ArrivalView
                name={name}
                lead={formData.createGroup ? "¡Todo listo! Creamos tu perfil de músico y tu grupo." : "¡Todo listo! Tu perfil de músico está creado."}
                actions={
                    <Button asChild size="lg">
                        <Link href="/dashboard/musician">Ir a mi panel</Link>
                    </Button>
                }
            >
                <p>
                    {formData.createGroup
                        ? "En tu panel completas el perfil público del grupo: fotos, precios y las fechas en que puedes tocar. Mientras más completo, más fácil es que te contraten."
                        : "Cuando quieras publicar un grupo y recibir solicitudes, lo haces desde tu panel."}
                </p>
            </ArrivalView>
        );
    }

    const focusHeading = hasNavigated;

    return (
        <OnboardingFrame
            title="Tu perfil de músico"
            intro="Cuatro pasos cortos. Todo lo puedes cambiar después desde tu panel."
            steps={STEPS}
            currentStep={currentStep}
            aside={<p>{ASIDE[currentStep]}</p>}
        >
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    if (currentStep < STEPS.length) handleNext();
                    else if (!isSubmitting) void handleComplete();
                }}
                className="space-y-8"
            >
                {currentStep === 1 && (
                    <div className="space-y-6">
                        <StepHeading title="¿Cómo te conoce tu público?" focusOnMount={focusHeading}>
                            Es el nombre que verán los clientes en tu perfil y en las búsquedas.
                        </StepHeading>
                        <Input
                            ref={stageNameRef}
                            label="Nombre artístico"
                            type="text"
                            placeholder="Ej.: DJ Trueno, Mariachi Oro de Jalisco"
                            value={formData.stageName}
                            onChange={(e) => updateFormData("stageName", e.target.value)}
                            maxLength={STAGE_NAME_MAX}
                            autoComplete="nickname"
                            required
                            error={errorFor("stageName")}
                            helperText={`Obligatorio, hasta ${STAGE_NAME_MAX} caracteres.`}
                        />
                        <TextareaField
                            label="Biografía corta (opcional)"
                            value={formData.shortBio}
                            onChange={(value) => updateFormData("shortBio", value)}
                            max={SHORT_BIO_MAX}
                            placeholder="Tu estilo, tus influencias y el tipo de eventos donde tocas…"
                            hint="Dos o tres frases bastan para empezar."
                        />
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <StepHeading title="Tu trayectoria" focusOnMount={focusHeading}>
                            Ninguno de estos datos es obligatorio, pero ayudan a que un cliente te elija.
                        </StepHeading>
                        <RangeField
                            label="Años de experiencia"
                            value={formData.yearsExperience}
                            onChange={(value) => updateFormData("yearsExperience", value)}
                            min={0}
                            max={YEARS_MAX}
                            format={yearsText}
                            hint={`${experienceLabel(formData.yearsExperience)}. De 0 a ${YEARS_MAX} años.`}
                        />
                        <SwitchField
                            label="Acepto invitaciones de otros grupos"
                            description="Otros músicos podrán invitarte a sus proyectos. Puedes desactivarlo cuando quieras."
                            checked={formData.isOpenToJoin}
                            onChange={(value) => updateFormData("isOpenToJoin", value)}
                        />
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <StepHeading title="Tu grupo" focusOnMount={focusHeading}>
                            Con un perfil de grupo apareces en el catálogo y puedes recibir solicitudes de contratación.
                        </StepHeading>
                        <ChoiceGroup
                            legend="¿Creamos tu perfil de grupo ahora?"
                            name="createGroup"
                            value={formData.createGroup ? "yes" : "no"}
                            onChange={(value) => updateFormData("createGroup", value === "yes")}
                            options={[
                                {
                                    value: "yes",
                                    label: "Crear mi perfil de grupo",
                                    description: "Aparecerás en el catálogo y podrás recibir contrataciones.",
                                },
                                {
                                    value: "no",
                                    label: "Hacerlo después",
                                    description: "Solo quiero explorar la plataforma por ahora.",
                                },
                            ]}
                        />
                        {formData.createGroup && (
                            <Input
                                ref={groupNameRef}
                                label="Nombre del grupo"
                                type="text"
                                placeholder="Ej.: Los Rockers del Norte"
                                value={formData.groupName}
                                onChange={(e) => updateFormData("groupName", e.target.value)}
                                maxLength={GROUP_NAME_MAX}
                                required
                                error={errorFor("groupName")}
                                helperText={`Si eres solista, puedes usar tu nombre artístico. Hasta ${GROUP_NAME_MAX} caracteres.`}
                            />
                        )}
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6">
                        <StepHeading title="Revisa antes de crear" focusOnMount={focusHeading}>
                            Si algo no está bien, vuelve al paso anterior. Podrás completar más detalles en tu panel.
                        </StepHeading>
                        <ReviewList
                            items={[
                                { label: "Nombre artístico", value: formData.stageName },
                                { label: "Experiencia", value: <span className="tabular">{yearsText(formData.yearsExperience)}</span> },
                                { label: "Invitaciones de otros grupos", value: formData.isOpenToJoin ? "Las acepto" : "No por ahora" },
                                { label: "Grupo", value: formData.createGroup ? formData.groupName : "Lo creo después" },
                                ...(formData.shortBio
                                    ? [{ label: "Biografía", value: <span className="whitespace-pre-line">{formData.shortBio}</span> }]
                                    : []),
                            ]}
                        />
                    </div>
                )}

                <FormError message={submitError} />

                <StepActions>
                    {currentStep > 1 && (
                        <Button type="button" variant="secondary" size="lg" onClick={handleBack} disabled={isSubmitting}>
                            Atrás
                        </Button>
                    )}
                    <Button type="submit" size="lg" className="sm:min-w-56" disabled={isSubmitting} aria-busy={isSubmitting}>
                        {currentStep < STEPS.length
                            ? "Continuar"
                            : isSubmitting
                                ? "Creando tu perfil…"
                                : formData.createGroup ? "Crear mi perfil y mi grupo" : "Crear mi perfil"}
                    </Button>
                </StepActions>
            </form>
        </OnboardingFrame>
    );
}
