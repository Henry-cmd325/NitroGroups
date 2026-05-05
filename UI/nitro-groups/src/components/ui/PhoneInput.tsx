"use client";

import { useState, useRef, useEffect } from "react";

interface CountryCode {
    code: string;
    name: string;
    dial: string;
    flag: string;
}

const COUNTRY_CODES: CountryCode[] = [
    { code: "MX", name: "México", dial: "+52", flag: "🇲🇽" },
    { code: "US", name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
    { code: "CO", name: "Colombia", dial: "+57", flag: "🇨🇴" },
    { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷" },
    { code: "ES", name: "España", dial: "+34", flag: "🇪🇸" },
    { code: "CL", name: "Chile", dial: "+56", flag: "🇨🇱" },
    { code: "PE", name: "Perú", dial: "+51", flag: "🇵🇪" },
    { code: "EC", name: "Ecuador", dial: "+593", flag: "🇪🇨" },
    { code: "VE", name: "Venezuela", dial: "+58", flag: "🇻🇪" },
    { code: "GT", name: "Guatemala", dial: "+502", flag: "🇬🇹" },
    { code: "CR", name: "Costa Rica", dial: "+506", flag: "🇨🇷" },
    { code: "PA", name: "Panamá", dial: "+507", flag: "🇵🇦" },
    { code: "DO", name: "Rep. Dominicana", dial: "+1", flag: "🇩🇴" },
    { code: "HN", name: "Honduras", dial: "+504", flag: "🇭🇳" },
    { code: "SV", name: "El Salvador", dial: "+503", flag: "🇸🇻" },
    { code: "NI", name: "Nicaragua", dial: "+505", flag: "🇳🇮" },
    { code: "BO", name: "Bolivia", dial: "+591", flag: "🇧🇴" },
    { code: "PY", name: "Paraguay", dial: "+595", flag: "🇵🇾" },
    { code: "UY", name: "Uruguay", dial: "+598", flag: "🇺🇾" },
    { code: "CU", name: "Cuba", dial: "+53", flag: "🇨🇺" },
    { code: "BR", name: "Brasil", dial: "+55", flag: "🇧🇷" },
];

interface PhoneInputProps {
    label?: string;
    value: string;
    onChange: (fullPhone: string) => void;
    required?: boolean;
    error?: string;
}

export default function PhoneInput({ label, value, onChange, required, error }: PhoneInputProps) {
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]); // Default: Mexico
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Extract phone number without country code
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

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/[^\d]/g, "");
        onChange(`${selectedCountry.dial} ${raw}`);
    };

    const handleSelectCountry = (country: CountryCode) => {
        setSelectedCountry(country);
        onChange(`${country.dial} ${phoneNumber}`);
        setIsOpen(false);
        setSearch("");
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
        <div className="space-y-1.5">
            {label && (
                <label className="text-sm font-medium leading-none">
                    {label}
                </label>
            )}
            <div className="flex gap-0">
                {/* Country Code Selector */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-1.5 h-10 px-3 border border-r-0 rounded-l-md bg-muted/50 hover:bg-muted transition-colors text-sm whitespace-nowrap"
                    >
                        <span className="text-lg leading-none">{selectedCountry.flag}</span>
                        <span className="text-muted-foreground">{selectedCountry.dial}</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                        >
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </button>

                    {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-auto bg-background border rounded-lg shadow-xl z-50 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                            {/* Search */}
                            <div className="sticky top-0 bg-background p-2 border-b">
                                <input
                                    type="text"
                                    placeholder="Buscar país..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full h-8 px-3 text-sm border rounded-md bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    autoFocus
                                />
                            </div>
                            {/* Country List */}
                            {filteredCountries.map((country) => (
                                <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => handleSelectCountry(country)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent transition-colors text-left ${selectedCountry.code === country.code
                                            ? "bg-primary/5 text-primary"
                                            : ""
                                        }`}
                                >
                                    <span className="text-lg leading-none">{country.flag}</span>
                                    <span className="flex-1">{country.name}</span>
                                    <span className="text-muted-foreground text-xs">
                                        {country.dial}
                                    </span>
                                </button>
                            ))}
                            {filteredCountries.length === 0 && (
                                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                                    No se encontraron países
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Phone Number Input */}
                <input
                    type="tel"
                    placeholder="10 1234 5678"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    required={required}
                    className={`flex-1 h-10 px-3 border rounded-r-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors ${error ? "border-destructive focus:ring-destructive/50" : "border-input"
                        }`}
                />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}
