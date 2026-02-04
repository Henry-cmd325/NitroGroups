import { ReactNode } from "react";

interface CardProps {
  header?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export default function Card({ header, children, footer, className = "" }: CardProps) {
  return (
    <div className={`bg-card text-card-foreground flex flex-col gap-6 rounded border ${className}`}>
      {header && (
        <div className="@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6">
          {header}
        </div>
      )}

      {children && (
        <div className="px-6 [&:last-child]:pb-6">
          {children}
        </div>
      )}

      {footer && (
        <div className="flex items-center px-6 pb-6 [.border-t]:pt-6">
          {footer}
        </div>
      )}
    </div>
  );
}
