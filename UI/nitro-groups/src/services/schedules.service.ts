import { apiClient } from "@/lib/api-client";

/** Alineado con `api/groups/{id}/schedule` (GroupAvailability) — no con la ruta antigua /availabilities. */
function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}

export interface ScheduleEventDto {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    isAvailable: boolean;
    originalEntityId?: number;
}

export interface CreateAvailabilityRequest {
    start: string;
    end: string;
    available?: boolean;
    customPrice?: number;
    note?: string;
}

export interface UpdateAvailabilityRequest {
    start: string;
    end: string;
    available?: boolean;
    customPrice?: number;
    note?: string;
}

export interface CreateBusyScheduleRequest {
    title: string;
    start: string;
    end: string;
    source?: 'contract' | 'rehearsal' | 'maintenance' | 'personal' | 'travel';
}

export interface UpdateBusyScheduleRequest {
    title?: string;
    start: string;
    end: string;
    source?: 'contract' | 'rehearsal' | 'maintenance' | 'personal' | 'travel';
}

class SchedulesService {
    async getGroupSchedules(groupId: number, start: string, end: string): Promise<ScheduleEventDto[]> {
        const response = await apiClient.get(`/groups/${groupId}/schedules`, {
            params: { start, end }
        });
        return response.data;
    }

    async createAvailability(groupId: number, request: CreateAvailabilityRequest): Promise<ScheduleEventDto> {
        const body = {
            title: request.note?.trim() || "Disponibilidad",
            description:
                request.customPrice != null
                    ? `customPrice: ${request.customPrice}`
                    : (request.note?.trim() || ""),
            startAt: request.start,
            endAt: request.end,
        };
        const { data } = await apiClient.post<{
            id: number;
            startAt: string;
            endAt: string;
            title: string;
            description: string;
        }>(`/groups/${groupId}/schedule`, body, {
            headers: { "Idempotency-Key": newIdempotencyKey() },
        });
        return {
            id: `avail_${data.id}`,
            title: data.title,
            start: data.startAt,
            end: data.endAt,
            isAvailable: true,
            backgroundColor: "#10b981",
            borderColor: "#059669",
            textColor: "#fff",
        };
    }

    async createBusySchedule(groupId: number, request: CreateBusyScheduleRequest): Promise<ScheduleEventDto> {
        const response = await apiClient.post(`/groups/${groupId}/busy-schedules`, request);
        return response.data;
    }

    async updateAvailability(groupId: number, availabilityId: string, request: UpdateAvailabilityRequest): Promise<ScheduleEventDto> {
        const id = availabilityId.replace("avail_", "");
        const body: Record<string, string | undefined> = {
            startAt: request.start,
            endAt: request.end,
        };
        if (request.note?.trim()) {
            body.title = request.note.trim();
        }
        if (request.customPrice != null) {
            body.description = `customPrice: ${request.customPrice}`;
        }
        const { data } = await apiClient.patch<{
            id: number;
            startAt: string;
            endAt: string;
            title: string;
        }>(`/groups/${groupId}/schedule/${id}`, body);
        return {
            id: `avail_${data.id}`,
            title: data.title,
            start: data.startAt,
            end: data.endAt,
            isAvailable: true,
            backgroundColor: "#10b981",
            borderColor: "#059669",
            textColor: "#fff",
        };
    }

    async removeAvailability(groupId: number, availabilityId: string): Promise<void> {
        const id = availabilityId.replace("avail_", "");
        await apiClient.delete(`/groups/${groupId}/schedule/${id}`);
    }

    async updateBusySchedule(groupId: number, scheduleId: string, request: UpdateBusyScheduleRequest): Promise<ScheduleEventDto> {
        const id = scheduleId.replace('busy_', '');
        const response = await apiClient.put(`/groups/${groupId}/busy-schedules/${id}`, request);
        return response.data;
    }

    async removeBusySchedule(groupId: number, scheduleId: string): Promise<void> {
        const id = scheduleId.replace('busy_', '');
        await apiClient.delete(`/groups/${groupId}/busy-schedules/${id}`);
    }
}

export const schedulesService = new SchedulesService();
