import { useQuery } from "@tanstack/react-query";
import { groupAvailabilityService } from "../services/groupAvailability.service";
import type { ScheduleEventDto } from "../services/groupAvailability.service";

export const useGroupAvailability = (params: { groupId: number; start: string; end: string }) => {
  const query = useQuery<ScheduleEventDto[], Error>({
    queryKey: ["groupAvailability", params],
    queryFn: () => groupAvailabilityService.listSchedule(params),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};