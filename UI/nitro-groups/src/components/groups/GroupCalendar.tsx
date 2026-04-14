"use client";

import { useMemo, useState, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventChangeArg, EventInput, DatesSetArg, EventClickArg } from "@fullcalendar/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { schedulesService } from "@/services/schedules.service";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

export type GroupCalendarMode = "public" | "private";

interface GroupCalendarProps {
  groupId: number;
  mode?: GroupCalendarMode;
}

export default function GroupCalendar({ groupId, mode = "public" }: GroupCalendarProps) {
  const isPrivate = mode === "private";
  const queryClient = useQueryClient();
  const calendarRef = useRef<FullCalendar>(null);

  const [dateRange, setDateRange] = useState({ 
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(), 
    end: new Date(new Date().setMonth(new Date().getMonth() + 2)).toISOString() 
  });

  const { data: serverEvents = [], isLoading } = useQuery({
    queryKey: ["schedules", groupId, dateRange.start, dateRange.end],
    queryFn: () => schedulesService.getGroupSchedules(groupId, dateRange.start, dateRange.end),
    enabled: !!groupId
  });

  const createAvailability = useMutation({
    mutationFn: (req: any) => schedulesService.createAvailability(groupId, req),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules", groupId] })
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
    
    // Default to adding availability. Could open a modal to ask if it's Available or Busy.
    const isAvailable = window.confirm("¿Marcar este intervalo como DISPONIBLE?\n(Click en Cancelar para marcar como OCUPADO)");
    
    if (isAvailable) {
      createAvailability.mutate({
        start: selection.startStr,
        end: selection.endStr,
        available: true
      });
    } else {
      createBusy.mutate({
        title: "Bloqueo manual",
        start: selection.startStr,
        end: selection.endStr,
        source: "personal"
      });
    }
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
    
    if (window.confirm(`¿Eliminar el evento '${clickInfo.event.title}'?`)) {
      if (clickInfo.event.id.startsWith("avail_")) {
        deleteAvailability.mutate(clickInfo.event.id);
      } else if (clickInfo.event.id.startsWith("busy_")) {
        deleteBusy.mutate(clickInfo.event.id);
      }
    }
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setDateRange({ start: arg.startStr, end: arg.endStr });
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
  );
}
