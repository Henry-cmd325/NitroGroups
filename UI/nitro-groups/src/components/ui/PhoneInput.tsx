"use client";

import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown } from "lucide-react";

interface CountryCode {
    code: string;
    name: string;
    dial: string;
}

// Sin banderas emoji: el código ISO y la lada se leen igual en cualquier sistema.
const COUNTRY_CODES: CountryCode[] = [
    { code: "MX", name: "México", dial: "+52" },
    { code: "US", name: "Estados Unidos", dial: "+1" },
    { code: "CO", name: "Colombia", dial: "+57" },
    { code: "AR", name: "Argentina", dial: "+54" },
    { code: "ES", name: "España", dial: "+34" },
    { code: "CL", name: "Chile", dial: "+56" },
    { code: "PE", name: "Perú", dial: "+51" },
    { code: "EC", name: "Ecuador", dial: "+593" },
    { code: "VE", name: "Venezuela", dial: "+58" },
    { code: "GT", name: "Guatemala", dial: "+502" },
    { code: "CR", name: "Costa Rica", dial: "+506" },
    { code: "PA", name: "Panamá", dial: "+507" },
    { code: "DO", name: "Rep. Dominicana", dial: "+1" },
    { code: "HN", name: "Honduras", dial: "+504" },
    { code: "SV", name: "El Salvador", dial: "+503" },
    { code: "NI", name: "Nicaragua", dial: "+505" },
    { code: "BO", name: "Bolivia", dial: "+591" },
    { code: "PY", name: "Paraguay", dial: "+595" },
    { code: "UY", name: "Uruguay", dial: "+598" },
    { code: "CU", name: "Cuba", dial: "+53" },
    { code: "BR", name: "Brasil", dial: "+55" },
];

interface PhoneInputProps {
    label?: string;
    value: string;
    onChange: (fullPhone: string) => void;
    required?: boolean;
    error?: string;
}

/** Teléfono con lada: mismo lenguaje que `Input` (relleno telon-2, sin borde, anillo al enfocar). */
export default function PhoneInput({ label, value, onChange, required, error }: PhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Por defecto: México
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const id = useId();
    const inputId = `${id}-phone`;
    const listId = `${id}-countries`;
    const errorId = `${id}-error`;

    // Número sin la lada del país
    const phoneNumber = value.startsWith(selectedCountry.dial)
        ? value.slice(selectedCountry.dial.length).trim()
        : value.replace(/^\+\d+\s*/, "");

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch("");
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const close = () => {
        setIsOpen(false);
        setSearch("");
        triggerRef.current?.focus();
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        onChange(`${selectedCountry.dial} ${raw}`);
    };

    const handleSelectCountry = (country: CountryCode) => {
        setSelectedCountry(country);
        onChange(`${country.dial} ${phoneNumber}`);
        close();
    };

    const filteredCountries = search
        ? COUNTRY_CODES.filter(
            (c) =>
                c.name.toLowerCase().includes(search.toLowerCase()) ||
                c.dial.includes(search) ||
                c.code.toLowerCase().includes(search.toLowerCase())
        )
        : COUNTRY_CODES;

    return (
        <div className="w-full space-y-2">
            {label && (
                <label htmlFor={inputId} className="text-sm font-medium leading-none">
                    {label}
                </label>
            )}
            <div className="flex gap-0.5">
                {/* Lada */}
                <div
                    className="relative"
                    ref={dropdownRef}
                    onKeyDown={(e) => {
                        if (e.key === "Escape" && isOpen) {
                            e.stopPropagation();
                            close();
                        }
                    }}
                >
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? listId : undefined}
                        aria-label={`Lada: ${selectedCountry.name} ${selectedCountry.dial}. Cambiar país`}
                        className="flex h-12 items-center gap-2 whitespace-nowrap bg-telon-2 px-3.5 text-papel tabular transition-colors hover:bg-telon-3 focus-visible:-outline-offset-2"
                    >
                        <span className="text-sm text-papel-2">{selectedCountry.code}</span>
                        <span>{selectedCountry.dial}</span>
                        <ChevronDown aria-hidden className={`size-4 text-papel-2 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isOpen && (
                        // Menú flotante: es lo único que lleva sombra (DESIGN.md → Tokens).
                        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-72 overflow-auto bg-telon-2 shadow-[0_12px_32px_-8px_var(--telon)]">
                            <div className="sticky top-0 bg-telon-2 p-2">
                                <input
                                    type="text"
                                    placeholder="Buscar país…"
                                    aria-label="Buscar país"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10 w-full bg-telon px-3 text-sm text-papel placeholder:text-papel-2/70 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tungsteno"
                                    autoFocus
                                />
                            </div>
                            <ul id={listId} aria-label="Países">
                                {filteredCountries.map((country) => {
                                    const isCurrent = selectedCountry.code === country.code;
                                    return (
                                        <li key={country.code}>
                                            <button
                                                type="button"
                                                onClick={() => handleSelectCountry(country)}
                                                aria-current={isCurrent ? "true" : undefined}
                                                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-telon-3 focus-visible:-outline-offset-2 ${isCurrent ? "text-tungsteno" : "text-papel"}`}
                                            >
                                                <span className="w-7 text-papel-2">{country.code}</span>
                                                <span className="flex-1">{country.name}</span>
                                                <span className="tabular text-papel-2">{country.dial}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                            {filteredCountries.length === 0 && (
                                <p className="px-3 py-4 text-sm text-papel-2">Ningún país coincide con “{search}”.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Número */}
                <input
                    id={inputId}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="55 1234 5678"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    required={required}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={`h-12 min-w-0 flex-1 bg-telon-2 px-4 text-base text-papel tabular placeholder:text-papel-2/70 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-tungsteno ${error ? "shadow-[inset_0_-2px_0_var(--error)]" : ""}`}
                />
            </div>
            {error && <p id={errorId} className="text-sm text-error">{error}</p>}
        </div>
    );
}
