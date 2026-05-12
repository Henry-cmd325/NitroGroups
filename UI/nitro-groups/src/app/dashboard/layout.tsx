import type { ReactNode } from "react";
import { requireSession } from "@/lib/requireSession";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireSession("/dashboard");

  return children;
}
