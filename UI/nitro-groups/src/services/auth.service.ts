"use client";

/**
 * Get API access token from our custom session.
 * This calls our profile API which returns the stored access token.
 */
export async function getApiAccessToken(): Promise<string> {
  const response = await fetch("/api/auth/token");
  if (!response.ok) {
    throw new Error("No authenticated session");
  }
  const data = await response.json();
  return data.accessToken;
}
