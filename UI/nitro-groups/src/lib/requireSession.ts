import { redirect } from "next/navigation";
import { getNitroSession, type NitroSession } from "@/services/session";

export async function requireSession(returnTo: string): Promise<NitroSession> {
  const session = await getNitroSession();

  if (!session?.user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return session;
}
