import { ReactNode } from "react";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  href?: string;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow] overflow-hidden";

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 rounded",
  secondary:
    "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded",
  destructive:
    "border-transparent bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
  outline:
    "text-foreground hover:bg-accent hover:text-accent-foreground",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
  href,
}: BadgeProps) {
  const computedClass = `${baseClasses} ${variantClasses[variant]} ${className}`.trim();

  if (href) {
    return (
      <a href={href} className={computedClass}>
        {children}
      </a>
    );
  }

  return <span className={computedClass}>{children}</span>;
}
