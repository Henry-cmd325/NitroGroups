import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
    id: string;
    label: string;
    description?: string;
}

interface ProgressStepsProps {
    steps: Step[];
    currentStep: number;
    className?: string;
}

/**
 * Pasos de un flujo: cada paso es una barra con su nombre debajo. El actual se ilumina en
 * tungsteno; los completados llevan una marca. Sin círculos ni halos (DESIGN.md).
 */
export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
    return (
        <nav aria-label="Pasos" className={cn("w-full", className)}>
            <ol role="list" className="grid gap-3" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;

                    return (
                        <li key={step.id} aria-current={isCurrent ? "step" : undefined}>
                            <span
                                aria-hidden
                                className={cn(
                                    "block h-1 transition-colors duration-300",
                                    isCurrent ? "bg-tungsteno" : isCompleted ? "bg-papel-2" : "bg-telon-3"
                                )}
                            />
                            <span className={cn("mt-3 flex items-center gap-1.5 text-sm", isCurrent ? "text-papel font-semibold" : "text-papel-2")}>
                                {isCompleted && <Check className="size-3.5" aria-hidden />}
                                {step.label}
                                <span className="sr-only">
                                    {isCompleted ? " (completado)" : isCurrent ? " (paso actual)" : ""}
                                </span>
                            </span>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
