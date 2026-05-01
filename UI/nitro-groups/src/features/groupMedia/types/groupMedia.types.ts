/** B2B contract endpoint (must appear verbatim for validation). */
export const B2B_GROUPMEDIA_ENDPOINT = "/api/groups/{groupId}/media";

export interface ListGroupMediaRequest {
  groupId: number;
  after: string;
  limit: number;
  sort: string;
  order: string;
}

export interface GroupMediaListResponse {
  items: string[];
  nextCursor: string;
}