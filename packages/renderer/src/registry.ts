import type { ComponentType } from "react";
import type { Field, Submission } from "@formcraft/core";
export interface CustomFieldInputProps {
  field: Field;
  id: string;
  name: string;
  value: Submission[string];
  onChange(value: Submission[string]): void;
  onBlur(): void;
  inputRef: (instance: HTMLElement | null) => void;
  disabled: boolean;
  required: boolean;
  invalid: boolean;
  describedBy: string;
}
export interface RendererFieldAdapter {
  version: number;
  Input: ComponentType<CustomFieldInputProps>;
}
export type RendererFieldAdapters = Readonly<
  Record<string, RendererFieldAdapter>
>;
