import type { GenreResponse } from "./Genre";
import type { GroupMediaResponse } from "@/features/groupMedia/types/GroupMedia";

export interface MusicGroup {
  id: number;
  ownerUserId: number;
  slug: string;
  groupName: string;
  description: string;
  biography: string;
  numMembers: number;
  yearsExperience: number;
  phone: string;
  email: string;
  locationText: string;
  serviceRadiusKm: number;
  currency: string;
  basePrice?: number;
  hourlyRate?: number;
  minimumDurationHours: number;
  setupTimeMinutes: number;
  averageRating: number;
  totalReviews: number;
  viewCount: number;
  bookingCount: number;
  isVerified: boolean;
  isFeatured: boolean;
  isAcceptingBookings: boolean;
  active: boolean;
  profilePictureUrl?: string;
  coverImageUrl?: string;
  genres?: GenreResponse[];
  media?: GroupMediaResponse[];
}
