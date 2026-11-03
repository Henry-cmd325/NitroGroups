"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import PhoneInput from "@/components/ui/PhoneInput";
import { groupsService } from "@/features/groups/services/groups.service";
import {
    GROUP_DESCRIPTION_MAX,
    GROUP_NAME_MAX,
    SLUG_MIN,
    parseInviteEmail,
    parseOptionalPrice,
    toGroupSlug,
    validateManagerStep,
    type FieldError,
    type ManagerField,
    type SlugStatus,
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
    TextareaField,
} from "@/features/onboarding/components/OnboardingParts";

interface ManagerFormData {
    // Datos del grupo
    groupName: string;
    slug: string;
    groupDescription: string;
    biography: string;
    // Ubicación y contacto
    locationText: string;
    phone: string;
    email: string;
    // Precios
    basePrice: string;
    hourlyRate: string;
    minimumDurationHours: number;
    serviceRadiusKm: number;
    currency: string;
    // Invitaciones
    inviteEmails: string[];
    currentEmail: string;
}

const STEPS = [
    { id: "welcome", label: "Tu rol" },
    { id: "group", label: "Grupo" },
    { id: "pricing", label: "Precios" },
    { id: "invite", label: "Músicos" },
    { id: "complete", label: "Revisar" },
];

/** Nota lateral de cada paso: qué se hace con lo que escribe y qué viene después. */
const ASIDE: Record<number, string> = {
    1: "Son cinco pasos y toman unos minutos. Al final tu grupo queda publicado en el catálogo.",
    2: "El nombre define la dirección del perfil público. La ubicación sirve para que te encuentren clientes de tu zona.",
    3: "Los precios son de referencia: a cada cliente le respondes con una cotización propia.",
    4: "Puedes dejar esta lista vacía. Los músicos también se suman después, desde tu panel.",
    5: "Al crear el grupo se publica su perfil y entras a tu panel para agregar fotos y fechas.",
};

const ROLE_ITEMS = [
    "Crear y administrar tu grupo musical",
    "Llevar el calendario y la disponibilidad",
    "Responder cotizaciones y solicitudes de clientes",
    "Sumar a los músicos del grupo",
];

const formatMoney = (value: string, currency: string) => {
    const parsed = parseOptionalPrice(value);
    if (parsed === undefined) return null;
    return `$${parsed.toLocaleString("es-MX")} ${currency}`;
};

export default function ManagerOnboardingPage() {
    const { user: authUser, isLoading: authLoading, isAuthenticated } = useAuth();
    const { user } = useCurrentUser();
    const [currentStep, setCurrentStep] = useState(1);
    const [hasNavigated, setHasNavigated] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fieldError, setFieldError] = useState<FieldError<ManagerField> | null>(null);
    const [submitError, setSubmitError] = useState("");
    const [inviteError, setInviteError] = useState("");
    const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
    const [createdSlug, setCreatedSlug] = useState<string | null>(null);
    const fieldRefs = {
        groupName: useRef<HTMLInputElement>(null),
        locationText: useRef<HTMLInputElement>(null),
        basePrice: useRef<HTMLInputElement>(null),
        hourlyRate: useRef<HTMLInputElement>(null),
    };

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

    // Propone el correo de la sesión como contacto del grupo (solo si sigue vacío).
    const sessionEmail = authUser?.email;
    useEffect(() => {
        if (!sessionEmail) return;
        setFormData((prev) => (prev.email ? prev : { ...prev, email: sessionEmail }));
    }, [sessionEmail]);

    // Comprueba si la dirección está libre, 500 ms después de la última tecla.
    useEffect(() => {
        const slug = formData.slug;
        let cancelled = false;
        const timer = setTimeout(async () => {
            if (slug.length < SLUG_MIN) {
                setSlugStatus("idle");
                return;
            }
            setSlugStatus("checking");
            try {
                const available = await groupsService.checkSlugAvailability(slug);
                if (!cancelled) setSlugStatus(available ? "available" : "taken");
            } catch {
                if (!cancelled) setSlugStatus("idle");
            }
        }, 500);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [formData.slug]);

    if (authLoading) return <OnboardingLoading label="Cargando tu cuenta…" />;
    if (!isAuthenticated) return null;

    const updateFormData = <K extends keyof ManagerFormData>(field: K, value: ManagerFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setFieldError((prev) => (prev?.field === field ? null : prev));
        setSubmitError("");
    };

    const handleGroupNameChange = (value: string) => {
        setFormData((prev) => ({ ...prev, groupName: value, slug: toGroupSlug(value) }));
        setFieldError((prev) => (prev?.field === "groupName" ? null : prev));
        setSubmitError("");
    };

    const errorFor = (field: ManagerField) => (fieldError?.field === field ? fieldError.message : undefined);

    const addEmail = () => {
        const result = parseInviteEmail(formData.currentEmail, formData.inviteEmails);
        if (!result.ok) {
            setInviteError(result.message);
            return;
        }
        setInviteError("");
        setFormData((prev) => ({
            ...prev,
            inviteEmails: [...prev.inviteEmails, result.email],
            currentEmail: "",
        }));
    };

    const removeEmail = (email: string) => {
        setFormData((prev) => ({
            ...prev,
            inviteEmails: prev.inviteEmails.filter((e) => e !== email),
        }));
    };

    const handleNext = () => {
        const problem = validateManagerStep(currentStep, formData, slugStatus);
        if (problem) {
            setFieldError(problem);
            fieldRefs[problem.field].current?.focus();
            return;
        }
        setFieldError(null);
        setInviteError("");
        setHasNavigated(true);
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    };

    const handleBack = () => {
        setFieldError(null);
        setSubmitError("");
        setInviteError("");
        setHasNavigated(true);
        setCurrentStep((prev) => Math.max(prev - 1, 1));
    };

    const handleComplete = async () => {
        if (!user) {
            setSubmitError("Aún estamos cargando los datos de tu cuenta. Espera unos segundos y vuelve a pulsar “Crear mi grupo”.");
            return;
        }
        setIsSubmitting(true);
        setSubmitError("");

        try {
            // POST /api/groups
            const group = await groupsService.create({
                ownerUserId: user.id,
                slug: formData.slug || toGroupSlug(formData.groupName),
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
                basePrice: parseOptionalPrice(formData.basePrice),
                hourlyRate: parseOptionalPrice(formData.hourlyRate),
                minimumDurationHours: formData.minimumDurationHours,
                setupTimeMinutes: 30,
                isAcceptingBookings: true,
                active: true,
            });

            // TODO: Send invitations to musicians when endpoint is ready
            // for (const email of formData.inviteEmails) {
            //     await invitationsService.send(groupId, email);
            // }

            // Limpia el dato temporal del registro
            if (typeof window !== "undefined") {
                sessionStorage.removeItem("nitro_signup_user_type");
            }

            setCreatedSlug(group?.slug || formData.slug);
        } catch (err) {
            setSubmitError("No pudimos crear el grupo. Revisa tu conexión y vuelve a intentarlo; lo que escribiste sigue aquí.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (createdSlug) {
        return (
            <ArrivalView
                name={formData.groupName}
                lead="¡Todo listo! Tu grupo ya está publicado en NitroGroups."
                actions={
                    <>
                        <Button asChild size="lg">
                            <Link href={`/groups/${createdSlug}`}>Ver mi perfil público</Link>
                        </Button>
                        <Button asChild size="lg" variant="secondary">
                            <Link href="/dashboard/musician">Ir a mi panel</Link>
                        </Button>
                    </>
                }
            >
                <p>
                    Así lo verán los clientes. Desde tu panel agregas fotos, ajustas precios y marcas las fechas
                    en que el grupo puede tocar.
                </p>
            </ArrivalView>
        );
    }

    const focusHeading = hasNavigated;
    const basePriceText = formatMoney(formData.basePrice, formData.currency);
    const hourlyRateText = formatMoney(formData.hourlyRate, formData.currency);

    return (
        <OnboardingFrame
            title="Publica tu grupo"
            intro="Crea el perfil del grupo que representas. Todo lo puedes cambiar después desde tu panel."
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
                        <StepHeading title="Como manager, llevas el grupo" focusOnMount={focusHeading}>
                            No necesitas tocar en el grupo. Te encargas de que lo encuentren, lo contraten y llegue a tiempo.
                        </StepHeading>
                        <ul className="bg-fondo-2 p-5 md:p-6 space-y-3">
                            {ROLE_ITEMS.map((item) => (
                                <li key={item} className="flex gap-3">
                                    <span aria-hidden className="mt-[0.6em] size-1.5 shrink-0 bg-acento" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6">
                        <StepHeading title="Datos del grupo" focusOnMount={focusHeading}>
                            Es lo que verán los clientes en el perfil público.
                        </StepHeading>

                        <div className="space-y-2">
                            <Input
                                ref={fieldRefs.groupName}
                                label="Nombre del grupo"
                                type="text"
                                placeholder="Ej.: Los Mariachis del Valle"
                                value={formData.groupName}
                                onChange={(e) => handleGroupNameChange(e.target.value)}
                                maxLength={GROUP_NAME_MAX}
                                required
                                error={errorFor("groupName")}
                                helperText={`Obligatorio, de 3 a ${GROUP_NAME_MAX} caracteres.`}
                            />
                            {formData.slug && (
                                <p className="text-sm text-tinta-2 break-all" aria-live="polite">
                                    Dirección del perfil: <span className="text-tinta">/groups/{formData.slug}</span>
                                    {slugStatus === "checking" && <span> (comprobando…)</span>}
                                    {slugStatus === "available" && <span className="text-ok"> (disponible)</span>}
                                    {slugStatus === "taken" && <span className="text-error"> (ya la usa otro grupo)</span>}
                                </p>
                            )}
                        </div>

                        <TextareaField
                            label="Descripción del grupo (opcional)"
                            value={formData.groupDescription}
                            onChange={(value) => updateFormData("groupDescription", value)}
                            max={GROUP_DESCRIPTION_MAX}
                            rows={4}
                            placeholder="Estilo musical, número de integrantes, tipo de eventos…"
                        />

                        <Input
                            ref={fieldRefs.locationText}
                            label="Ubicación"
                            type="text"
                            placeholder="Ej.: Guadalajara, Jalisco"
                            value={formData.locationText}
                            onChange={(e) => updateFormData("locationText", e.target.value)}
                            autoComplete="address-level2"
                            required
                            error={errorFor("locationText")}
                            helperText="Obligatorio. Ciudad y estado desde donde sale el grupo."
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
                            <PhoneInput
                                label="Teléfono del grupo (opcional)"
                                value={formData.phone}
                                onChange={(phone) => updateFormData("phone", phone)}
                            />
                            <Input
                                label="Correo de contacto"
                                type="email"
                                placeholder="grupo@correo.com"
                                value={formData.email}
                                onChange={(e) => updateFormData("email", e.target.value)}
                                autoComplete="email"
                                helperText="Propusimos el de tu cuenta; cámbialo si el grupo tiene otro."
                            />
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-6">
                        <StepHeading title="Precios y servicio" focusOnMount={focusHeading}>
                            Son precios de referencia para el perfil. A cada cliente le respondes con su propia cotización.
                        </StepHeading>

                        <ChoiceGroup
                            legend="Moneda"
                            name="currency"
                            layout="inline"
                            value={formData.currency}
                            onChange={(value) => updateFormData("currency", value)}
                            options={[
                                { value: "MXN", label: "Pesos (MXN)" },
                                { value: "USD", label: "Dólares (USD)" },
                            ]}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4">
                            <Input
                                ref={fieldRefs.basePrice}
                                label="Precio base por evento (opcional)"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                placeholder="5000"
                                value={formData.basePrice}
                                onChange={(e) => updateFormData("basePrice", e.target.value)}
                                error={errorFor("basePrice")}
                                helperText={`En ${formData.currency}, solo números.`}
                                icon={<span className="text-sm font-semibold" aria-hidden>$</span>}
                            />
                            <Input
                                ref={fieldRefs.hourlyRate}
                                label="Tarifa por hora (opcional)"
                                type="number"
                                inputMode="decimal"
                                min={0}
                                placeholder="1500"
                                value={formData.hourlyRate}
                                onChange={(e) => updateFormData("hourlyRate", e.target.value)}
                                error={errorFor("hourlyRate")}
                                helperText={`En ${formData.currency} por hora, solo números.`}
                                icon={<span className="text-sm font-semibold" aria-hidden>$</span>}
                            />
                        </div>

                        <RangeField
                            label="Duración mínima del evento"
                            value={formData.minimumDurationHours}
                            onChange={(value) => updateFormData("minimumDurationHours", value)}
                            min={1}
                            max={12}
                            format={(h) => (h === 1 ? "1 hora" : `${h} horas`)}
                            hint="De 1 a 12 horas. Lo mínimo que el grupo acepta tocar en un evento."
                        />

                        <RangeField
                            label="Distancia que viajan"
                            value={formData.serviceRadiusKm}
                            onChange={(value) => updateFormData("serviceRadiusKm", value)}
                            min={10}
                            max={500}
                            step={10}
                            format={(km) => `${km} km`}
                            hint="De 10 a 500 km desde tu ubicación. Lo más lejos que irían a tocar."
                        />
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6">
                        <StepHeading title="Los músicos del grupo" focusOnMount={focusHeading}>
                            Anota el correo de quienes tocan contigo. Puedes saltarte este paso.
                        </StepHeading>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                            <div className="flex-1">
                                <Input
                                    label="Correo del músico"
                                    type="email"
                                    placeholder="musico@correo.com"
                                    value={formData.currentEmail}
                                    onChange={(e) => {
                                        updateFormData("currentEmail", e.target.value);
                                        setInviteError("");
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addEmail();
                                        }
                                    }}
                                    error={inviteError || undefined}
                                    helperText="Escríbelo y pulsa Agregar o Enter."
                                />
                            </div>
                            <Button type="button" variant="secondary" onClick={addEmail} className="h-12 sm:mt-[1.625rem]">
                                Agregar
                            </Button>
                        </div>

                        {formData.inviteEmails.length > 0 ? (
                            <div className="space-y-3">
                                <p className="text-sm text-tinta-2" aria-live="polite">
                                    {formData.inviteEmails.length === 1
                                        ? "1 músico en la lista"
                                        : `${formData.inviteEmails.length} músicos en la lista`}
                                </p>
                                <ul className="flex flex-wrap gap-2">
                                    {formData.inviteEmails.map((email) => (
                                        <li key={email} className="flex items-center bg-fondo-2 pl-4 text-sm">
                                            <span className="break-all py-2">{email}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeEmail(email)}
                                                className="ml-2 size-9 grid place-items-center text-tinta-2 hover:bg-fondo-3 hover:text-tinta transition-colors"
                                                aria-label={`Quitar ${email}`}
                                            >
                                                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                                                    <path d="M6 6l12 12M18 6L6 18" />
                                                </svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <p className="text-tinta-2">Aún no hay músicos en la lista. Puedes agregarlos después desde tu panel.</p>
                        )}

                        <p className="text-sm text-tinta-2">
                            El envío de invitaciones todavía no está disponible: por ahora esta lista no se envía ni se guarda.
                        </p>
                    </div>
                )}

                {currentStep === 5 && (
                    <div className="space-y-6">
                        <StepHeading title="Revisa antes de crear" focusOnMount={focusHeading}>
                            Si algo no está bien, vuelve al paso anterior. Todo se puede editar después.
                        </StepHeading>
                        <ReviewList
                            items={[
                                { label: "Nombre del grupo", value: formData.groupName },
                                { label: "Dirección del perfil", value: <span className="break-all">/groups/{formData.slug}</span> },
                                { label: "Ubicación", value: formData.locationText },
                                ...(formData.phone ? [{ label: "Teléfono", value: formData.phone }] : []),
                                ...(formData.email ? [{ label: "Correo de contacto", value: formData.email }] : []),
                                ...(basePriceText || hourlyRateText
                                    ? [{
                                        label: "Precios",
                                        value: (
                                            <span className="tabular block space-y-1">
                                                {basePriceText && <span className="block">Por evento desde {basePriceText}</span>}
                                                {hourlyRateText && <span className="block">Por hora {hourlyRateText}</span>}
                                            </span>
                                        ),
                                    }]
                                    : []),
                                {
                                    label: "Servicio",
                                    value: (
                                        <span className="tabular">
                                            Mínimo {formData.minimumDurationHours === 1 ? "1 hora" : `${formData.minimumDurationHours} horas`}, hasta {formData.serviceRadiusKm} km
                                        </span>
                                    ),
                                },
                                {
                                    label: "Músicos en la lista",
                                    value: formData.inviteEmails.length === 0 ? "Ninguno por ahora" : <span className="tabular">{formData.inviteEmails.length}</span>,
                                },
                                ...(formData.groupDescription
                                    ? [{ label: "Descripción", value: <span className="whitespace-pre-line">{formData.groupDescription}</span> }]
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
                        {currentStep === 1
                            ? "Empezar"
                            : currentStep < STEPS.length
                                ? "Continuar"
                                : isSubmitting
                                    ? "Creando tu grupo…"
                                    : "Crear mi grupo"}
                    </Button>
                </StepActions>
            </form>
        </OnboardingFrame>
    );
}
