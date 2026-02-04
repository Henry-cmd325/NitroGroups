"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventChangeArg, EventInput } from "@fullcalendar/core";

import Card from "@/components/controls/Card";
import Badge from "@/components/controls/Badge";

export type GroupCalendarMode = "public" | "private";

interface GroupCalendarProps {
  mode?: GroupCalendarMode;
}

const buildMockEvents = () => {
  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const offset = (days: number, hours: number) => {
    const date = new Date(base);
    date.setDate(base.getDate() + days);
    date.setHours(hours, 0, 0, 0);
    return date;
  };

  const events: EventInput[] = [
    {
      id: "busy-1",
      title: "Contrato confirmado",
      start: offset(1, 19).toISOString(),
      end: offset(1, 22).toISOString(),
      backgroundColor: "#f87171",
      borderColor: "#f87171",
      textColor: "#0f172a",
    },
    {
      id: "busy-2",
      title: "Ensayo",
      start: offset(3, 18).toISOString(),
      end: offset(3, 20).toISOString(),
      backgroundColor: "#fb7185",
      borderColor: "#fb7185",
      textColor: "#0f172a",
    },
    {
      id: "available-1",
      title: "Disponible",
      start: offset(2, 16).toISOString(),
      end: offset(2, 19).toISOString(),
      backgroundColor: "#34d399",
      borderColor: "#34d399",
      textColor: "#0f172a",
    },
    {
      id: "available-2",
      title: "Disponible",
      start: offset(4, 14).toISOString(),
      end: offset(4, 18).toISOString(),
      backgroundColor: "#22c55e",
      borderColor: "#22c55e",
      textColor: "#0f172a",
    },
  ];

  return events;
};

export default function GroupCalendar({ mode = "public" }: GroupCalendarProps) {
  const isPrivate = mode === "private";
  const [events, setEvents] = useState<EventInput[]>(() => buildMockEvents());

  const header = useMemo(
    () => (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Calendario del grupo</h3>
          <p className="text-sm text-muted-foreground">
            {isPrivate
              ? "Arrastra y redimensiona bloques para editar disponibilidad."
              : "Vista pública de disponibilidad del grupo."}
          </p>
        </div>
        <Badge variant={isPrivate ? "secondary" : "outline"}>
          {isPrivate ? "Modo privado" : "Modo público"}
        </Badge>
      </div>
    ),
    [isPrivate],
  );

  const handleSelect = (selection: DateSelectArg) => {
    if (!isPrivate) return;
    const newEvent: EventInput = {
      id: `available-${Date.now()}`,
      title: "Disponible",
      start: selection.startStr,
      end: selection.endStr,
      backgroundColor: "#34d399",
      borderColor: "#34d399",
      textColor: "#0f172a",
    };

    setEvents((prev) => [...prev, newEvent]);
  };

  const handleEventChange = (changeInfo: EventChangeArg) => {
    if (!isPrivate) return;
    const updatedEvent = changeInfo.event;
    setEvents((prev) =>
      prev.map((event) =>
        event.id === updatedEvent.id
          ? {
              ...event,
              start: updatedEvent.start?.toISOString(),
              end: updatedEvent.end?.toISOString(),
            }
          : event,
      ),
    );
  };

  return (
    <Card
      className="border-border bg-card/80 backdrop-blur"
      header={header}
      footer={
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Disponible
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            Ocupado
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            {isPrivate ? "Arrastra para editar" : "Solo lectura"}
          </span>
        </div>
      }
    >
      <div className="rounded-xl bg-background/40 p-2 md:p-4">
        <FullCalendar
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
          events={events}
          eventChange={handleEventChange}
          dayMaxEvents
        />
      </div>
    </Card>
  );
}
