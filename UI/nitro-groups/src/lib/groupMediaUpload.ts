"use client";

import { getBrowserApiBase } from "@/lib/backendBaseUrl";

export type GroupUploadMediaType = "photo" | "video" | "audio";

export type GroupMediaUploadResult = {
  url: string;
  mediaType: GroupUploadMediaType;
};

/**
 * Sube un archivo vía API .NET (`POST /api/groups/.../media/upload`; almacenamiento R2 en servidor).
 */
export async function uploadGroupMediaFile(
  groupId: number,
  file: File
): Promise<GroupMediaUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(
    `${getBrowserApiBase()}/groups/${groupId}/media/upload`,
    {
      method: "POST",
      body: form,
    }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || res.statusText || "Error al subir el archivo");
  }
  return res.json() as Promise<GroupMediaUploadResult>;
}
