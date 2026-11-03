"use client";

import { useGroupMedia } from "../hooks/useGroupMedia";
import type { ListGroupMediaRequest } from "../types/groupMedia.types";
import { Button } from "@/components/ui/Button";

interface GroupMediaPanelProps {
  groupId: number;
}

/** Vista de diagnóstico: muestra la respuesta cruda de la API de medios del grupo. */
export default function GroupMediaPanel({ groupId }: GroupMediaPanelProps) {
  const params: ListGroupMediaRequest = {
    groupId,
    after: "",
    limit: 20,
    sort: "createdAt",
    order: "desc",
  };
  const { data, error, isLoading, refetch } = useGroupMedia(params);

  if (isLoading) return <p className="text-tinta-2" aria-busy>Cargando medios…</p>;
  if (error) return <p role="alert" className="text-error">No pudimos cargar los medios: {error.message}</p>;
  if (!data) return <p className="text-tinta-2">La API no devolvió datos.</p>;

  return (
    <section className="bg-fondo-2 p-6 text-tinta">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="type-heading text-2xl">Medios del grupo</h2>
        <Button variant="secondary" size="sm" onClick={() => { void refetch(); }}>
          Volver a cargar
        </Button>
      </div>
      <pre className="overflow-auto bg-fondo p-4 text-sm text-tinta-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </section>
  );
}
