import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    success?: boolean;
    icon?: React.ReactNode;
    helperText?: string;
}

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
        <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
        <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
        <path d="m2 2 20 20" />
    </svg>
);

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, success, icon, helperText, ...props }, ref) => {
        const inputId = React.useId();
        const hasError = !!error;
        const hasSuccess = success && !hasError;
        const isPasswordType = type === "password";
        const [showPassword, setShowPassword] = React.useState(false);

        const currentType = isPasswordType && showPassword ? "text" : type;

        return (
            <div className="w-full space-y-2">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        id={inputId}
                        type={currentType}
                        className={cn(
                            // DESIGN.md → Inputs: relleno fondo-2 con un borde de luz muy tenue, anillo acento al enfocar.
                            "flex h-12 w-full rounded-xl bg-fondo-2 shadow-[inset_0_0_0_1px_var(--linea)] px-4 text-base text-tinta file:border-0 file:bg-transparent file:font-medium placeholder:text-tinta-2/70 outline-none focus-visible:outline-2 focus-visible:outline-acento focus-visible:-outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            icon && "pl-11",
                            isPasswordType && "pr-12",
                            hasError && "shadow-[inset_0_-2px_0_var(--error)]",
                            hasSuccess && "shadow-[inset_0_-2px_0_var(--ok)]",
                            className
                        )}
                        ref={ref}
                        aria-invalid={hasError}
                        aria-describedby={
                            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
                        }
                        {...props}
                    />
                    {isPasswordType && (
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 size-9 grid place-items-center text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    )}
                </div>
                {error && (
                    <p
                        id={`${inputId}-error`}
                        className="text-sm text-destructive animate-in fade-in-50 duration-200"
                    >
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p
                        id={`${inputId}-helper`}
                        className="text-sm text-muted-foreground"
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = "Input";

export { Input };
