import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Superficie elevada: un paso de tono sobre el fondo (telon-2), sin borde, sombra ni esquinas
 * redondeadas (DESIGN.md → Tokens).
 */
export default function Card({ header, children, footer, className }: CardProps) {
  return (
    <div className={cn("flex flex-col gap-6 bg-telon-2 p-6 text-papel", className)}>
      {header && <div>{header}</div>}
      {children && <div>{children}</div>}
      {footer && <div className="text-sm text-papel-2">{footer}</div>}
    </div>
  );
}
