import type { MusicGroup } from "../../types/MusicGroup";
import type { GenreResponse } from "../../types/Genre";

export type GroupProfileProps = {
  mode?: "private" | "public";
  slug?: string;
  initialGroup?: MusicGroup;
};

export type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
};

export type FieldProps = {
  label: string;
  required?: boolean;
  children: React.ReactNode;
};
