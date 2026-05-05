"use client";

import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Protector({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth finishes loading and user is still not authenticated
    // (e.g. session expired or logged out), redirect instantly.
    if (!isLoading && !isAuthenticated) {
        router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="p-8 text-white"><Loader /></div>;
  if (!isAuthenticated) return null; // Wait for redirect

  return <>{children}</>;
}