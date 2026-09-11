import { useRef } from "react";
import type { FieldType, FormDefinition } from "@formcraft/core";
export interface FormBuilderHandle {
  getState(): {
    document: FormDefinition;
    selectedFieldId: string | null;
    canUndo: boolean;
    canRedo: boolean;
  };
  selectField(id: string | null): boolean;
  addField(type: FieldType): void;
  addCustomField(type: string): void;
  undo(): void;
  redo(): void;
  exportJSON(): string;
  /** Validates before replacing the document; resets history. Throws on invalid input. */
  importJSON(json: string): void;
}
/** Instance-local editor ref. Pass to FormBuilder's ref prop. */
export function useFormBuilder() {
  return useRef<FormBuilderHandle>(null);
}
