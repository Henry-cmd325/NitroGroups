export type GroupMediaResponse = {
  id: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  fileSizeBytes?: number;
  durationSeconds?: number;
  uploadedAt?: string;
  displayOrder: number;
  isPrimary: boolean;
};
