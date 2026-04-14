"use client";

import { Logo, MobileMenu, PublicNavigation, UserMenu } from "@/components/layout";
import { useAuth } from "@/hooks/useAuth";

function HeaderSkeleton() {
  return (
    <div className="hidden md:flex items-center space-x-4 animate-pulse opacity-50">
      <div className="h-9 w-24 bg-muted rounded-md" />
      <div className="h-9 w-24 bg-muted rounded-md" />
    </div>
  );
}

export default function Header() {
  const { isLoading } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo />
        {isLoading ? (
          <HeaderSkeleton />
        ) : (
          <>
            <UserMenu />
            <PublicNavigation />
          </>
        )}
        <MobileMenu />
      </div>
    </header>
  );
}
