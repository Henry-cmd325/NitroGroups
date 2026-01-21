"use client";

import { Auth0Provider } from "@auth0/nextjs-auth0";

type ProvidersProps = {
  children: React.ReactNode;
};

export default function Providers({ children }: ProvidersProps) {
  return <Auth0Provider>{children}</Auth0Provider>;
}
