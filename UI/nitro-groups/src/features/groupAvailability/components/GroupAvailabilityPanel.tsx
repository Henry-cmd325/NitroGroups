"use client";

import { useGroupAvailability } from "../hooks/useGroupAvailability";
import type { ListScheduleRequest } from "../types/groupAvailability.types";
import { Button } from "@/components/ui/Button";

/** Vista de diagnóstico: muestra la respuesta cruda de la API de disponibilidad. */
export default function GroupAvailabilityPanel() {
  const params: ListScheduleRequest = {
    groupId: 0,
    start: "",
    end: "",
    source: undefined,
    typeFilter: undefined
  };
  const { data, error, isLoading, refetch } = useGroupAvailability(params);

  if (isLoading) return <p className="text-tinta-2" aria-busy>Cargando disponibilidad…</p>;
  if (error) return <p role="alert" className="text-error">No pudimos cargar la disponibilidad: {error.message}</p>;
  if (!data) return <p className="text-tinta-2">La API no devolvió datos.</p>;

  return (
    <section className="bg-fondo-2 p-6 text-tinta">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="type-heading text-2xl">Disponibilidad del grupo</h2>
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
