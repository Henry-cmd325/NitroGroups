import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Aviso en línea: icono y texto sobre fondo-2. El color vive en el icono y, en errores, en el
 * texto; nunca en un borde lateral (DESIGN.md → Refused on purpose).
 */
const alertVariants = cva("relative flex w-full items-start gap-3 bg-fondo-2 px-4 py-3.5 text-tinta", {
    variants: {
        variant: {
            default: "[&_[data-alert-icon]]:text-tinta-2",
            info: "[&_[data-alert-icon]]:text-tinta-2",
            destructive: "text-error [&_[data-alert-icon]]:text-error",
            success: "[&_[data-alert-icon]]:text-ok",
            warning: "[&_[data-alert-icon]]:text-acento",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>["variant"]>;

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
    default: <Info />,
    info: <Info />,
    destructive: <CircleAlert />,
    success: <CircleCheck />,
    warning: <TriangleAlert />,
};

export interface AlertProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
    onClose?: () => void;
    icon?: React.ReactNode;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant, onClose, icon, children, ...props }, ref) => {
        const v: AlertVariant = variant ?? "default";
        return (
            <div
                ref={ref}
                // Errores y advertencias interrumpen; el resto se anuncia sin cortar la lectura.
                role={v === "destructive" || v === "warning" ? "alert" : "status"}
                className={cn(alertVariants({ variant }), onClose && "pr-12", className)}
                {...props}
            >
                <span data-alert-icon aria-hidden className="mt-0.5 shrink-0 [&>svg]:size-5">
                    {icon ?? defaultIcons[v]}
                </span>
                <div className="min-w-0 flex-1">{children}</div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-2 top-2 grid size-9 place-items-center text-tinta-2 transition-colors hover:bg-fondo-3 hover:text-tinta"
                        aria-label="Cerrar aviso"
                    >
                        <X aria-hidden className="size-4" />
                    </button>
                )}
            </div>
        );
    }
);

Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <p ref={ref} className={cn("font-semibold leading-snug", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-[0.95rem] leading-snug [&_p]:leading-relaxed", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
