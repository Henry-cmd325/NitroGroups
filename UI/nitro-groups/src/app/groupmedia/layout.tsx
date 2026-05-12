import type { ReactNode } from "react";
import { requireSession } from "@/lib/requireSession";

export default async function GroupMediaLayout({ children }: { children: ReactNode }) {
  await requireSession("/groupmedia");

  return children;
}
