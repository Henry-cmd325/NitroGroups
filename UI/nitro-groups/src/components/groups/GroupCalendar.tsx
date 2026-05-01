"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventChangeArg, EventInput, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesService } from "@/services/schedules.service";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export type GroupCalendarMode = "public" | "private";

interface GroupCalendarProps {
  groupId: number;
  mode?: GroupCalendarMode;
}

type PendingDelete = { id: string; title: string; kind: "avail" | "busy" };

function formatRangeLabel(startStr: string, endStr: string): string {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const opts: Intl.DateTimeFormatOptions = {
      dateStyle: "medium",
      timeStyle: "short"
    };
    return `${s.toLocaleString(undefined, opts)} — ${e.toLocaleString(undefined, opts)}`;
  } catch {
    return `${startStr} → ${endStr}`;
  }
}

export default function GroupCalendar({ groupId, mode = "public" }: GroupCalendarProps) {
  const isPrivate = mode === "private";
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);

  const [pendingSelect, setPendingSelect] = useState<DateSelectArg | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), 
    end: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString() 
  });

  const { data: serverEvents = [], isLoading } = useQuery({
    queryKey: ["schedules", groupId, dateRange.start, dateRange.end],
    queryFn: () => schedulesService.getGroupSchedules(groupId, dateRange.start, dateRange.end),
    enabled: !!groupId
  });

  const createBusy = useMutation({
    mutationFn: (req: any) => schedulesService.createBusySchedule(groupId, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
  });

  const updateAvailability = useMutation({
    mutationFn: (req: { id: string, data: any }) => schedulesService.updateAvailability(groupId, req.id, req.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
  });

  const updateBusy = useMutation({
    mutationFn: (req: { id: string, data: any }) => schedulesService.updateBusySchedule(groupId, req.id, req.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
  });

  const deleteAvailability = useMutation({
    mutationFn: (id: string) => schedulesService.removeAvailability(groupId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
  });

  const deleteBusy = useMutation({
    mutationFn: (id: string) => schedulesService.removeBusySchedule(groupId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
  });

  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Calendario del grupo</h3>
          <p className="text-sm text-muted-foreground">
            {isPrivate
              ? "Por defecto el grupo está disponible. Selecciona un rango para marcar horario no disponible; arrastra un bloque para ajustar."
              : "El grupo está disponible salvo en los bloques señalados (no disponible o reglas explícitas)."}
          </p>
        </div>
        <Badge variant={isPrivate ? "secondary" : "outline"}>
          {isPrivate ? "Modo privado" : "Modo público"}
        </Badge>
      </div>
    ),
    [isPrivate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingSelect(null);
        setPendingDelete(null);
      }
    };
    if (pendingSelect || pendingDelete) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [pendingSelect, pendingDelete]);

  const confirmMarkUnavailable = () => {
    if (!pendingSelect) return;
    createBusy.mutate(
      {
        title: "No disponible",
        start: pendingSelect.startStr,
        end: pendingSelect.endStr,
        source: "personal"
      },
      { onSuccess: () => setPendingSelect(null) }
    );
  };

  const handleSelect = (selection: DateSelectArg) => {
    if (!isPrivate) return;
    setPendingSelect(selection);
  };

  const handleEventChange = (changeInfo: EventChangeArg) => {
    if (!isPrivate) return;
    
    if (!changeInfo.event.start || !changeInfo.event.end) {
      changeInfo.revert();
      return;
    }

    if (changeInfo.event.id.startsWith("avail_")) {
      updateAvailability.mutate({
        id: changeInfo.event.id,
        data: {
          start: changeInfo.event.start.toISOString(),
          end: changeInfo.event.end.toISOString()
        }
      });
    } else if (changeInfo.event.id.startsWith("busy_")) {
      updateBusy.mutate({
        id: changeInfo.event.id,
        data: {
          start: changeInfo.event.start.toISOString(),
          end: changeInfo.event.end.toISOString()
        }
      });
    }
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (!isPrivate) return;
    const id = clickInfo.event.id;
    const title = clickInfo.event.title || "Evento";
    if (id.startsWith("avail_")) {
      setPendingDelete({ id, title, kind: "avail" });
    } else if (id.startsWith("busy_")) {
      setPendingDelete({ id, title, kind: "busy" });
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "avail") {
      deleteAvailability.mutate(pendingDelete.id);
    } else {
      deleteBusy.mutate(pendingDelete.id);
    }
    setPendingDelete(null);
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setDateRange({ start: arg.startStr, end: arg.endStr });
  };

  return (
    <>
      <Card
        className="border-border bg-card/80 backdrop-blur"
        header={header}
        footer={
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <p className="text-[11px] leading-snug">
              Por defecto las franjas sin bloque cuentan como <span className="text-foreground">disponible</span>. Solo
              añadimos lo que excepciones a eso.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded border border-emerald-500/50 bg-emerald-500/15" title="Solo si existe en el sistema" />
                Disponible (bloque explícito)
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                No disponible
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {isPrivate ? "Arrastra o elimina excepciones" : "Solo lectura"}
              </span>
            </div>
          </div>
        }
      >
        <div className="rounded-xl bg-background/40 p-2 md:p-4">
          {isLoading ? (
            <div className="flex h-[400px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              height="auto"
              nowIndicator
              slotMinTime="08:00:00"
              slotMaxTime="23:00:00"
              editable={isPrivate}
              eventStartEditable={isPrivate}
              eventDurationEditable={isPrivate}
              eventResizableFromStart={isPrivate}
              selectable={isPrivate}
              selectMirror={isPrivate}
              select={handleSelect}
              events={serverEvents as EventInput[]}
              eventClick={handleEventClick}
              eventChange={handleEventChange}
              datesSet={handleDatesSet}
              dayMaxEvents
            />
          )}
        </div>
      </Card>

      {pendingSelect && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setPendingSelect(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-interval-title"
            className="bg-card text-card-foreground w-full max-w-md rounded-lg border border-border p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="select-interval-title" className="text-lg font-semibold text-foreground">
              Marcar no disponible
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              El resto del calendario se entiende como disponible. Este intervalo se guardará como excepción (no
              disponible).
            </p>
            <p className="mt-2 rounded-md border border-border bg-background/50 px-3 py-2 text-sm font-medium text-foreground">
              {formatRangeLabel(pendingSelect.startStr, pendingSelect.endStr)}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingSelect(null)}
                disabled={createBusy.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={confirmMarkUnavailable}
                disabled={createBusy.isPending}
              >
                {createBusy.isPending ? "Guardando…" : "Guardar no disponible"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="presentation"
          onClick={() => setPendingDelete(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-event-title"
            className="bg-card text-card-foreground w-full max-w-md rounded-lg border border-border p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="delete-event-title" className="text-lg font-semibold text-foreground">
              Eliminar evento
            </h4>
            <p className="mt-2 text-sm text-muted-foreground">
              ¿Seguro que quieres eliminar{" "}
              <span className="font-medium text-foreground">«{pendingDelete.title}»</span>?
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
