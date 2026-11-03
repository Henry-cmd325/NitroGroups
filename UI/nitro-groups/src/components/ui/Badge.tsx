import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Etiqueta pequeña en minúsculas de oración sobre telon-3. Sin píldora: solo un estado lleva
 * punto de color, y el texto siempre dice el estado (el color nunca va solo).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 bg-telon-3 px-2 py-0.5 text-sm font-medium leading-6",
  {
    variants: {
      variant: {
        default: "text-papel",
        secondary: "text-papel-2",
        destructive: "text-error",
        ok: "text-ok",
        outline: "bg-transparent px-0 text-papel-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof badgeVariants> {
  /** Muestra un punto del color del texto: úsalo solo para estados. */
  status?: boolean
}

function Badge({ className, variant, status = false, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {status && <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
export default Badge
