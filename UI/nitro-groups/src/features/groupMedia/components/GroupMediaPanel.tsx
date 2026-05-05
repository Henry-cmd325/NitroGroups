"use client";

import { useGroupMedia } from "../hooks/useGroupMedia";
import type { ListGroupMediaRequest } from "../types/groupMedia.types";

interface GroupMediaPanelProps {
  groupId: number;
}

export default function GroupMediaPanel({ groupId }: GroupMediaPanelProps) {
  const params: ListGroupMediaRequest = {
    groupId,
    after: "",
    limit: 20,
    sort: "createdAt",
    order: "desc",
  };
  const { data, error, isLoading, refetch } = useGroupMedia(params);

  if (isLoading) return <div className="text-gray-400">Cargando...</div>;
  if (error) return <div className="text-red-400">Error al cargar: {error.message}</div>;
  if (!data) return <div className="text-gray-500">Sin datos disponibles.</div>;

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">GroupMedia</h2>
        <button
          className="rounded-lg bg-violet-500 px-4 py-2 text-white hover:bg-violet-600"
          onClick={() => { void refetch(); }}
        >
          Recargar
        </button>
      </div>
      <pre className="overflow-auto rounded-md bg-gray-950 p-4 text-sm text-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}