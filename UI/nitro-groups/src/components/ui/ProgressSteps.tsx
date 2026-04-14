import * as React from "react";
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

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
    return (
        <nav aria-label="Progress" className={cn("w-full", className)}>
            <ol role="list" className="flex items-start justify-between">
                {steps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isCompleted = stepNumber < currentStep;
                    const isCurrent = stepNumber === currentStep;
                    const isPending = stepNumber > currentStep;
                    const isLast = index === steps.length - 1;

                    return (
                        <li
                            key={step.id}
                            className="relative flex-1 flex flex-col items-center"
                        >
                            {/* Connector Line — from this circle to the next */}
                            {!isLast && (
                                <div
                                    className="absolute top-4 left-1/2 w-full h-0.5"
                                    aria-hidden="true"
                                >
                                    <div
                                        className={cn(
                                            "h-full transition-all duration-500",
                                            isCompleted ? "bg-primary" : "bg-muted"
                                        )}
                                    />
                                </div>
                            )}

                            {/* Step Circle + Label wrapper */}
                            <div className="relative z-10 flex flex-col items-center">
                                {/* Step Circle */}
                                <span
                                    className={cn(
                                        "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                                        isCompleted &&
                                        "border-primary bg-primary text-primary-foreground",
                                        isCurrent &&
                                        "border-primary bg-background text-primary ring-4 ring-primary/20",
                                        isPending && "border-muted bg-background text-muted-foreground"
                                    )}
                                >
                                    {isCompleted ? (
                                        <svg
                                            className="h-5 w-5"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    ) : (
                                        <span className="text-sm font-medium">{stepNumber}</span>
                                    )}
                                </span>

                                {/* Step Label */}
                                <span
                                    className={cn(
                                        "mt-2 text-xs font-medium transition-colors duration-300 text-center whitespace-nowrap",
                                        isCurrent && "text-primary",
                                        isCompleted && "text-foreground",
                                        isPending && "text-muted-foreground"
                                    )}
                                >
                                    {step.label}
                                </span>

                                {/* Step Description (optional) */}
                                {step.description && (
                                    <span className="mt-0.5 text-[10px] text-muted-foreground text-center hidden sm:block whitespace-nowrap">
                                        {step.description}
                                    </span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
