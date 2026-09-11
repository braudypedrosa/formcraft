import { useRef } from "react";
import type { Submission } from "@formcraft/core";

export type SubmissionStatus = "idle" | "loading" | "success";
export type ServerFieldError = string | { code: string; message: string };
/** Throw from onSubmit to display server errors next to matching field IDs. */
export class SubmissionError extends Error {
  readonly fieldErrors: Record<string, ServerFieldError>;
  constructor(
    message: string,
    fieldErrors: Record<string, ServerFieldError> = {},
  ) {
    super(message);
    this.name = "SubmissionError";
    this.fieldErrors = fieldErrors;
  }
}
export interface FormRendererHandle {
  /** Submit the current page, or send the final page. Runs the same validation as the button. */
  submit(): void;
  /** Returns false while a submission is pending. Resets answers, page, errors, and success. */
  reset(values?: Submission): boolean;
  getValues(): Submission;
  setValue(fieldId: string, value: Submission[string]): boolean;
  focusField(fieldId: string): boolean;
  getStatus(): SubmissionStatus;
}
/** Pass this instance-local ref to FormRenderer's ref prop. Available after mount. */
export function useFormRenderer() {
  return useRef<FormRendererHandle>(null);
}
