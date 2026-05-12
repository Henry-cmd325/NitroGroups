import type { ReactNode } from "react";
import { requireSession } from "@/lib/requireSession";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  await requireSession("/onboarding");

  return children;
}
