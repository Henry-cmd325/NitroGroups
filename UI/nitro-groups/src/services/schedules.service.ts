import { apiClient } from "@/lib/api-client";

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
        const response = await apiClient.post(`/groups/${groupId}/availabilities`, request);
        return response.data;
    }

    async createBusySchedule(groupId: number, request: CreateBusyScheduleRequest): Promise<ScheduleEventDto> {
        const response = await apiClient.post(`/groups/${groupId}/busy-schedules`, request);
        return response.data;
    }

    async updateAvailability(groupId: number, availabilityId: string, request: UpdateAvailabilityRequest): Promise<ScheduleEventDto> {
        const id = availabilityId.replace('avail_', '');
        const response = await apiClient.put(`/groups/${groupId}/availabilities/${id}`, request);
        return response.data;
    }

    async removeAvailability(groupId: number, availabilityId: string): Promise<void> {
        const id = availabilityId.replace('avail_', '');
        await apiClient.delete(`/groups/${groupId}/availabilities/${id}`);
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
