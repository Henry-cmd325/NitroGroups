import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente con service role: solo en servidor (Route Handlers, Server Actions).
 * No importar en componentes "use client".
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) {
    return cached;
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos.");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

/**
 * Nombre del bucket (Storage en Supabase). Por defecto `group-media`.
 * Si usas otro nombre, define `SUPABASE_STORAGE_BUCKET` en `.env.local`.
 */
export function getGroupMediaBucket(): string {
  return (process.env.SUPABASE_STORAGE_BUCKET || "group-media").trim();
}
