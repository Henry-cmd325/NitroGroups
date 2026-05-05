import { useQuery } from "@tanstack/react-query";
import { groupMediaService } from "../services/groupMedia.service";
import type { ListGroupMediaRequest, GroupMediaListResponse } from "../types/groupMedia.types";

export const useGroupMedia = (params: ListGroupMediaRequest) => {
  const query = useQuery<GroupMediaListResponse, Error>({
    queryKey: ["groupMedia", params],
    queryFn: () => groupMediaService.listGroupMedia(params),
    staleTime: 1000 * 60 * 5,
  });

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};