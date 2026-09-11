import type { ComponentType } from "react";
import type { Field, FieldConfig } from "@formcraft/core";
export interface BuilderFieldAdapter {
  /** Must match the core registration version. */
  version: number;
  /** Passive markup only: previews sit inside a selectable canvas button. */
  Preview: ComponentType<{ field: Field }>;
  Settings?: ComponentType<{
    field: Field;
    onChange: (config: FieldConfig) => void;
  }>;
}
export type BuilderFieldAdapters = Readonly<
  Record<string, BuilderFieldAdapter>
>;
