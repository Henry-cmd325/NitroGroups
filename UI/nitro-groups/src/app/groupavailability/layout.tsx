import type { ReactNode } from "react";
import { requireSession } from "@/lib/requireSession";

export default async function GroupAvailabilityLayout({ children }: { children: ReactNode }) {
  await requireSession("/groupavailability");

  return children;
}
