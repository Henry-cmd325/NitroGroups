import { getNitroSession } from "@/services/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
    const session = await getNitroSession();

    if (!session?.user) {
        redirect("/login");
    }

    // Check session user for redirect decision
    // Default to musician dashboard
    const userType = (session.user as Record<string, unknown>)['user_type'] as string | undefined;

    if (userType === 'client') {
        redirect("/dashboard/client");
    }

    redirect("/dashboard/musician");
}
