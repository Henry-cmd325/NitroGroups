import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";

interface ProtectedPageProps {
    children: React.ReactNode;
}

export default async function ProtectedPage({ children }: ProtectedPageProps) {
  const session = await auth0.getSession();
  
  if (!session) {
    redirect('/auth/login');
  }

  return (
    <>{children}</>
  );
}