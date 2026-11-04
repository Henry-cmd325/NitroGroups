import type { MusicGroup } from "../../types/MusicGroup";

export type GroupProfileProps = {
  mode?: "private" | "public";
  slug?: string;
  initialGroup?: MusicGroup;
};

export type FieldProps = {
  label: string;
  /** id del control que etiqueta. */
  htmlFor: string;
  required?: boolean;
  /** Límite o aclaración junto al campo, ligado con aria-describedby desde el control. */
  hint?: string;
  children: React.ReactNode;
};
