import type { ReactNode } from "react";
import { requireSession } from "@/lib/requireSession";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireSession("/onboarding");

  // Pantallas de trabajo: las mismas tintas sobre una hoja más clara (DESIGN.md).

  return <div className="hoja-clara bg-fondo text-tinta pb-24">{children}</div>;
}
