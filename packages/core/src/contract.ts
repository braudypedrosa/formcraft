import { z } from "zod";
import {
  migrateForm,
  validateSubmission,
  contentTypes,
  fieldTypes,
  type FormDefinition,
  type Submission,
} from "./index";
import {
  emptyFieldRegistry,
  type FieldRegistry,
  type ValidationIssue,
} from "./registry";
export const SUBMISSION_CONTRACT_VERSION = 1 as const;
const answerSchema = z.union([
  z.string(),
  z.boolean(),
  z.array(z.string()),
  z.record(z.string(), z.string()),
]);
export const submissionRequestSchema = z
  .object({
    contractVersion: z.literal(1),
    formId: z.string().min(1),
    revision: z.string().min(1),
    submissionId: z.string().uuid(),
    values: z.record(z.string(), answerSchema),
  })
  .strict();
export type SubmissionRequest = z.infer<typeof submissionRequestSchema>;
export interface PublishedForm {
  schema: FormDefinition;
  revision: string;
}
export type SubmissionValidationResult =
  | { ok: true; submissionId: string; values: Submission }
  | {
      ok: false;
      code:
        | "invalid_request"
        | "form_mismatch"
        | "revision_mismatch"
        | "invalid_values";
      message: string;
      fieldErrors?: Record<string, ValidationIssue>;
    };
/** Advertise this alongside a published form. Backends must reject unsupported type versions. */
export function getValidationCapabilities(
  registry: FieldRegistry = emptyFieldRegistry,
) {
  return {
    contractVersion: 1 as const,
    schemaVersions: [1, 2],
    builtInTypes: [...fieldTypes],
    customTypes: registry
      .list()
      .map(({ type, version }) => ({ type, version })),
  };
}
export function validateSubmissionRequest(
  published: PublishedForm,
  request: unknown,
  registry: FieldRegistry = emptyFieldRegistry,
): SubmissionValidationResult {
  if (!published.revision.trim())
    throw new Error("Published revision must not be empty");
  const schema = migrateForm(published.schema, registry);
  const parsed = submissionRequestSchema.safeParse(request);
  if (!parsed.success)
    return {
      ok: false,
      code: "invalid_request",
      message: "Invalid submission envelope",
    };
  const { values, formId, revision, submissionId } = parsed.data;
  if (formId !== schema.id)
    return {
      ok: false,
      code: "form_mismatch",
      message: "Form does not match the published definition",
    };
  if (revision !== published.revision)
    return {
      ok: false,
      code: "revision_mismatch",
      message: "This form has changed. Reload before submitting.",
    };
  const fieldErrors: Record<string, ValidationIssue> = Object.create(null);
  const answerFields = schema.fields.filter(
    (f) => !contentTypes.includes(f.type),
  );
  for (const id of Object.keys((request as SubmissionRequest).values))
    if (!answerFields.some((f) => f.id === id))
      fieldErrors[id] = {
        code: "unknown_field",
        message: "Unknown answer field",
      };
  const messages = validateSubmission(schema, values, registry);
  for (const field of answerFields) {
    const message = messages[field.id];
    if (!message) continue;
    const value = values[field.id];
    const missing =
      value === undefined ||
      value === false ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && !value.length);
    let code = [
      "Please complete this field.",
      "Please check this box to continue.",
    ].includes(message)
      ? "required"
      : `invalid_${field.type}`;
    if (field.type === "custom" && !missing)
      code =
        registry.get(field.customType!)!.validate(value, field)?.code ??
        "invalid_custom";
    fieldErrors[field.id] = { code, message };
  }
  if (Object.keys(fieldErrors).length)
    return {
      ok: false,
      code: "invalid_values",
      message: "Please review your answers.",
      fieldErrors,
    };
  return { ok: true, submissionId, values };
}
