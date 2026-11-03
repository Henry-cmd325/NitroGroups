import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Botones planos, esquinas rectas, un relleno por variante (DESIGN.md → Components).
const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-[1.1em] [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-tungsteno text-telon hover:bg-tungsteno-press active:bg-tungsteno-press",
                destructive: "bg-error text-telon hover:brightness-95",
                outline: "bg-transparent text-papel shadow-[inset_0_0_0_2px_var(--telon-3)] hover:bg-telon-3",
                secondary: "bg-telon-2 text-papel hover:bg-telon-3",
                ghost: "text-papel hover:bg-telon-2",
                link: "text-papel underline decoration-tungsteno decoration-2 underline-offset-4 hover:text-tungsteno px-0",
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
