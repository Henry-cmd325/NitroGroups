import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Botones en píldora, planos, un relleno por variante (DESIGN.md → Components).
const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-acento text-acento-ink hover:bg-acento-press",
                destructive: "bg-error text-acento-ink hover:brightness-95",
                outline: "bg-transparent text-tinta shadow-[inset_0_0_0_1px_var(--linea-fuerte)] hover:bg-fondo-2",
                secondary: "bg-fondo-2 text-tinta hover:bg-fondo-3",
                ghost: "text-tinta hover:bg-fondo-2",
                link: "text-tinta underline decoration-acento decoration-2 underline-offset-4 hover:text-acento px-0",
            },
            size: {
                default: "h-11 px-5 text-[0.95rem]",
                sm: "h-9 px-3.5 text-sm",
                lg: "h-14 px-7 text-base",
                icon: "h-11 w-11",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
