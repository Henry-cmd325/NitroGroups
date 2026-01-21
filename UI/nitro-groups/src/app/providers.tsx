"use client";

import { UserProvider } from "@auth0/nextjs-auth0/client";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <UserProvider>{children}</UserProvider>;
}
