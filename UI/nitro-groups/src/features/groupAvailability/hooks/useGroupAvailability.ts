import { useQuery } from "@tanstack/react-query";
import { groupAvailabilityService } from "../services/groupAvailability.service";
import type { ListScheduleRequest, ListScheduleResponse } from "../types/groupAvailability.types";

export const useGroupAvailability = (params: ListScheduleRequest) => {
  const query = useQuery<ListScheduleResponse, Error>({
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