import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Superficie elevada: un paso de tono sobre el fondo con un borde de luz tenue y esquinas
 * suaves (DESIGN.md → Tokens).
 */
export default function Card({ header, children, footer, className }: CardProps) {
  return (
    <div className={cn("flex flex-col gap-6 superficie rounded-xl p-6 text-tinta", className)}>
      {header && <div>{header}</div>}
      {children && <div>{children}</div>}
      {footer && <div className="text-sm text-tinta-2">{footer}</div>}
    </div>
  );
}
