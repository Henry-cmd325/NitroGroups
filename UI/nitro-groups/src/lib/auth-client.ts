"use client";

import { getAccessToken } from "@auth0/nextjs-auth0";

export async function getApiAccessToken() {
  return getAccessToken();
}
