import { z } from "zod";
import {
  emptyFieldRegistry,
  assertJson,
  type FieldRegistry,
  type FieldConfig,
} from "./registry";
export { createFieldRegistry, emptyFieldRegistry } from "./registry";
export type {
  FieldRegistry,
  CustomFieldDefinition,
  FieldConfig,
  JsonValue,
  ValidationIssue,
} from "./registry";
export const fieldTypes = [
  "text",
  "email",
  "phone",
  "textarea",
  "dropdown",
  "checkbox",
  "number",
  "radio",
  "checkboxes",
  "multiselect",
  "date",
  "time",
  "url",
  "name",
  "address",
  "password",
  "hidden",
  "heading",
  "paragraph",
  "section",
  "divider",
  "structured_name",
  "structured_address",
  "rating",
] as const;
export type FieldType = (typeof fieldTypes)[number];
const fieldSchema = z.object({
  id: z
    .string()
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Use letters, numbers, underscores or hyphens for field IDs",
    ).refine(id => !["__proto__", "constructor", "prototype"].includes(id), "Reserved field ID"),
  type: z.enum([...fieldTypes, "custom"]),
  customType: z.string().optional(),
  customVersion: z.number().int().positive().optional(),
  config: z.record(z.string(), z.json()).optional(),
  label: z.string(),
  description: z.string(),
  placeholder: z.string(),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  columnGroup: z.string().min(1).optional(),
  pageId: z.string().min(1).optional(),
  ratingMax: z.number().int().min(3).max(10).optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })),
});
const structuralFormSchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    id: z.string().min(1),
    title: z.string(),
    description: z.string(),
    submitLabel: z.string().min(1),
    fields: z.array(fieldSchema),
    pages: z
      .array(
        z.object({ id: z.string().min(1), title: z.string().trim().min(1) }),
      )
      .min(1)
      .optional(),
    nextLabel: z.string().trim().min(1).optional(),
    backLabel: z.string().trim().min(1).optional(),
  })
  .superRefine((form, ctx) => {
    const pageIds = new Set(form.pages?.map((p) => p.id));
    if (form.pages && pageIds.size !== form.pages.length)
      ctx.addIssue({
        code: "custom",
        path: ["pages"],
        message: "Page IDs must be unique",
      });
    const ids = new Set<string>();
    form.fields.forEach((f, i) => {
      if (ids.has(f.id))
        ctx.addIssue({
          code: "custom",
          path: ["fields", i, "id"],
          message: "Field IDs must be unique",
        });
      ids.add(f.id);
      if (f.pageId && !pageIds.has(f.pageId))
        ctx.addIssue({
          code: "custom",
          path: ["fields", i, "pageId"],
          message: "Unknown page",
        });
      if (f.columnGroup) {
        const indices = form.fields.flatMap((x, j) =>
          x.columnGroup === f.columnGroup ? [j] : [],
        );
        if (
          form.fields.some(
            (x) =>
              x.columnGroup === f.columnGroup &&
              (x.pageId ?? form.pages?.[0]?.id) !==
                (f.pageId ?? form.pages?.[0]?.id),
          ) ||
          indices.length < 2 ||
          indices.length > 3 ||
          indices.at(-1)! - indices[0] !== indices.length - 1
        )
          ctx.addIssue({
            code: "custom",
            path: ["fields", i, "columnGroup"],
            message:
              "A column row must contain two or three consecutive fields",
          });
      }
      if (["dropdown", "radio", "checkboxes", "multiselect"].includes(f.type)) {
        const seen = new Set<string>();
        if (!f.options.length)
          ctx.addIssue({
            code: "custom",
            path: ["fields", i, "options"],
            message: "Add at least one choice",
          });
        f.options.forEach((o, j) => {
          if (!o.value.trim() || seen.has(o.value))
            ctx.addIssue({
              code: "custom",
              path: ["fields", i, "options", j, "value"],
              message: "Choice values must be nonempty and unique",
            });
          seen.add(o.value);
        });
      }
    });
  });
export type Field = z.infer<typeof fieldSchema>;
export type FormDefinition = z.infer<typeof structuralFormSchema>;
export function createFormSchema(registry: FieldRegistry = emptyFieldRegistry) {
  return structuralFormSchema.superRefine((form, ctx) => {
    form.fields.forEach((field, index) => {
      if (field.type !== "custom") {
        if (
          field.customType !== undefined ||
          field.customVersion !== undefined ||
          field.config !== undefined
        )
          ctx.addIssue({
            code: "custom",
            path: ["fields", index, "type"],
            message: "Custom metadata requires a custom field",
          });
        return;
      }
      const definition = registry.get(field.customType ?? "");
      const issue =
        form.version !== 2
          ? "Custom fields require schema version 2"
          : !definition
            ? "Unregistered custom field type"
            : field.customVersion !== definition.version
              ? "Unsupported custom field version"
              : definition.validateConfig(field.config ?? {});
      if (issue)
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, !definition ? "customType" : "config"],
          message: issue,
        });
    });
  });
}
export const formSchema = createFormSchema();
export const CURRENT_SCHEMA_VERSION = 2 as const;
/** Validates the old schema before upgrading. Never invents IDs or changes answer keys. */
export function migrateForm(
  input: unknown,
  registry: FieldRegistry = emptyFieldRegistry,
): FormDefinition {
  const schema = createFormSchema(registry);
  const validated = schema.parse(input);
  return validated.version === 1
    ? schema.parse({ ...validated, version: 2 })
    : validated;
}
export function createCustomField(
  type: string,
  registry: FieldRegistry,
  config?: FieldConfig,
): Field {
  const definition = registry.get(type);
  if (!definition) throw new Error(`Unregistered custom field: ${type}`);
  const settings = structuredClone(config ?? definition.defaultConfig ?? {});
  assertJson(settings);
  const error = definition.validateConfig(settings);
  if (error) throw new Error(error);
  return {
    ...createField("text"),
    type: "custom",
    customType: type,
    customVersion: definition.version,
    label: definition.label,
    config: settings,
  };
}
export const names: Record<Field["type"], string> = {
  custom: "Custom field",
  section: "Section",
  divider: "Divider",
  structured_name: "Name",
  structured_address: "Address (structured)",
  rating: "Rating",
  text: "Single Line Text",
  email: "Email",
  phone: "Phone",
  textarea: "Paragraph Text",
  dropdown: "Drop Down",
  checkbox: "Consent",
  number: "Number",
  radio: "Radio Buttons",
  checkboxes: "Checkboxes",
  multiselect: "Multi Select",
  date: "Date",
  time: "Time",
  url: "Website",
  name: "Full Name",
  address: "Address",
  password: "Password",
  hidden: "Hidden",
  heading: "Heading",
  paragraph: "Paragraph",
};
export function createField(type: FieldType): Field {
  return {
    id: crypto.randomUUID(),
    type,
    label: type === "structured_address" ? "Address" : names[type],
    description: "",
    placeholder: "",
    required: false,
    options: ["dropdown", "radio", "checkboxes", "multiselect"].includes(type)
      ? [
          { label: "First option", value: "first" },
          { label: "Second option", value: "second" },
        ]
      : [],
  };
}
export function emptyForm(): FormDefinition {
  return {
    version: 2,
    id: crypto.randomUUID(),
    title: "Untitled form",
    description: "",
    submitLabel: "Send message",
    fields: [],
  };
}
export function contactForm(): FormDefinition {
  return {
    ...emptyForm(),
    title: "Let’s talk",
    description: "Have a project in mind? We’d love to hear about it.",
    fields: [
      {
        ...createField("text"),
        label: "Your name",
        placeholder: "Alex Morgan",
        required: true,
      },
      {
        ...createField("email"),
        label: "Email address",
        placeholder: "alex@company.com",
        required: true,
      },
      {
        ...createField("dropdown"),
        label: "What can we help with?",
        placeholder: "Select a topic",
        options: [
          { label: "A new project", value: "project" },
          { label: "A collaboration", value: "collaboration" },
          { label: "Something else", value: "other" },
        ],
      },
      {
        ...createField("textarea"),
        label: "Tell us a little more",
        placeholder: "A few details about your project…",
        description: "A little context helps us get the conversation started.",
        required: true,
      },
    ],
  };
}
export function importForm(
  json: string,
  registry: FieldRegistry = emptyFieldRegistry,
): FormDefinition {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("This is not valid JSON. Check the file and try again.");
  }
  const parsed = createFormSchema(registry).safeParse(raw);
  if (!parsed.success)
    throw new Error(
      parsed.error.issues
        .map((i) => `${i.path.join(".") || "form"}: ${i.message}`)
        .join("\n"),
    );
  return migrateForm(parsed.data, registry);
}
export function exportForm(
  form: FormDefinition,
  registry: FieldRegistry = emptyFieldRegistry,
) {
  // Optional properties may be undefined in editor objects; reject non-JSON config explicitly.
  for (const field of form.fields) if (field.config) assertJson(field.config);
  return JSON.stringify(migrateForm(form, registry), null, 2);
}
export const contentTypes: readonly Field["type"][] = [
  "heading",
  "paragraph",
  "section",
  "divider",
];
export const nameParts = [
  { key: "first", label: "First name", autoComplete: "given-name" },
  { key: "last", label: "Last name", autoComplete: "family-name" },
];
export const addressParts = [
  { key: "street", label: "Street address", autoComplete: "address-line1" },
  { key: "line2", label: "Address line 2", autoComplete: "address-line2" },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "region", label: "State / region", autoComplete: "address-level1" },
  { key: "postalCode", label: "Postal code", autoComplete: "postal-code" },
  { key: "country", label: "Country", autoComplete: "country-name" },
];
export function fieldsOnPage(form: FormDefinition, pageId?: string) {
  return form.pages
    ? form.fields.filter((f) => (f.pageId ?? form.pages![0].id) === pageId)
    : form.fields;
}
export type Submission = Record<
  string,
  string | boolean | string[] | Record<string, string>
>;
export function validateSubmission(
  form: FormDefinition,
  values: Submission,
  registry: FieldRegistry = emptyFieldRegistry,
) {
  const errors: Record<string, string> = {};
  for (const f of form.fields) {
    if (contentTypes.includes(f.type)) continue;
    if (f.type === "custom") {
      const definition = registry.get(f.customType ?? "");
      if (!definition || definition.version !== f.customVersion) {
        errors[f.id] = "Unsupported custom field";
        continue;
      }
      const configError = definition.validateConfig(f.config ?? {});
      if (configError) {
        errors[f.id] = configError;
        continue;
      }
      const value = values[f.id];
      const missing =
        value === undefined ||
        value === false ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && !value.length);
      if (missing) {
        if (f.required) errors[f.id] = "Please complete this field.";
        continue;
      }
      const issue = definition.validate(value, f);
      if (issue) errors[f.id] = issue.message;
      continue;
    }
    if (f.type === "structured_name" || f.type === "structured_address") {
      const value = values[f.id];
      const parts = f.type === "structured_name" ? nameParts : addressParts;
      const requiredKeys =
        f.type === "structured_name"
          ? ["first", "last"]
          : ["street", "city", "postalCode", "country"];
      if (value === undefined && !f.required) continue;
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.entries(value).some(
          ([k, v]) => !parts.some((p) => p.key === k) || typeof v !== "string",
        )
      )
        errors[f.id] = "Enter valid field details.";
      else if (f.required && requiredKeys.some((k) => !value[k]?.trim()))
        errors[f.id] =
          f.type === "structured_name"
            ? "Enter first and last name."
            : "Enter street address, city, postal code and country.";
      continue;
    }
    const v = values[f.id];
    const multi = f.type === "checkboxes" || f.type === "multiselect";
    const missing =
      f.type === "checkbox"
        ? v !== true
        : multi
          ? !Array.isArray(v) || !v.length
          : typeof v !== "string" || !v.trim();
    if (f.required && missing) {
      errors[f.id] =
        f.type === "checkbox"
          ? "Please check this box to continue."
          : "Please complete this field.";
      continue;
    }
    if (v === undefined || v === "" || (multi && Array.isArray(v) && !v.length))
      continue;
    if (f.type === "checkbox") {
      if (typeof v !== "boolean") errors[f.id] = "Choose checked or unchecked.";
      continue;
    }
    if (multi) {
      if (
        !Array.isArray(v) ||
        v.some((x) => !f.options.some((o) => o.value === x)) ||
        new Set(v).size !== v.length
      )
        errors[f.id] = "Choose available options.";
      continue;
    }
    if (typeof v !== "string") {
      errors[f.id] = "Enter a text value.";
      continue;
    }
    if (
      f.type === "rating" &&
      (!/^\d+$/.test(v) || Number(v) < 1 || Number(v) > (f.ratingMax ?? 5))
    )
      errors[f.id] = "Choose an available rating.";
    if (f.type === "email" && !z.email().safeParse(v).success)
      errors[f.id] = "Enter a valid email address.";
    if (
      (f.type === "dropdown" || f.type === "radio") &&
      !f.options.some((o) => o.value === v)
    )
      errors[f.id] = "Choose an available option.";
    if (
      f.type === "number" &&
      (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v) || !Number.isFinite(Number(v)))
    )
      errors[f.id] = "Enter a valid number.";
    if (f.type === "url") {
      try {
        const url = new URL(v);
        if (!["https:", "http:"].includes(url.protocol)) throw new Error();
      } catch {
        errors[f.id] = "Enter a website URL starting with https:// or http://.";
      }
    }
    if (
      f.type === "date" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(v) ||
        !Number.isFinite(Date.parse(v)) ||
        new Date(v).toISOString().slice(0, 10) !== v)
    )
      errors[f.id] = "Enter a valid date.";
    if (f.type === "time" && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v))
      errors[f.id] = "Enter a valid time.";
  }
  return errors;
}
export const fieldGroups: { label: string; types: FieldType[] }[] = [
  {
    label: "Standard Fields",
    types: [
      "text",
      "textarea",
      "dropdown",
      "number",
      "radio",
      "checkboxes",
      "multiselect",
    ],
  },
  {
    label: "Advanced Fields",
    types: [
      "structured_name",
      "structured_address",
      "rating",
      "name",
      "email",
      "phone",
      "address",
      "date",
      "time",
      "url",
      "password",
      "hidden",
      "checkbox",
    ],
  },
];

fieldGroups.push({
  label: "Content",
  types: ["section", "divider", "heading", "paragraph"],
});

/** Keep columns contiguous; a row contains at most three fields. */
export function normalizeColumns(fields: Field[]): Field[] {
  return fields.map((field, i) => {
    if (!field.columnGroup) return field;
    const indices = fields.flatMap((f, j) =>
      f.columnGroup === field.columnGroup ? [j] : [],
    );
    if (
      !fields.some(
        (f) => f.columnGroup === field.columnGroup && f.pageId !== field.pageId,
      ) &&
      indices.length >= 2 &&
      indices.length <= 3 &&
      indices.at(-1)! - indices[0] === indices.length - 1
    )
      return field;
    const { columnGroup, ...plain } = field;
    return plain;
  });
}
export function fieldColumnSpan(fields: Field[], field: Field): number {
  return field.columnGroup
    ? 12 / fields.filter((f) => f.columnGroup === field.columnGroup).length
    : 12;
}
/** A single drop is one document transaction. Above/below targets address the entire row. */
export function placeField(
  fields: Field[],
  incoming: Field,
  targetId?: string,
  position: "before" | "after" | "left" | "right" = "after",
): Field[] {
  if (incoming.id === targetId) return fields;
  const target = fields.find((f) => f.id === targetId);
  const rest = fields
    .filter((f) => f.id !== incoming.id)
    .map((f) => ({ ...f }));
  const { columnGroup: oldGroup, ...moving } = incoming;
  if (target) moving.pageId = target.pageId;
  if (!target) return normalizeColumns([...rest, moving]);
  const row = rest.filter((f) =>
    target.columnGroup
      ? f.columnGroup === target.columnGroup
      : f.id === target.id,
  );
  if (position === "left" || position === "right") {
    if (row.length >= 3) return fields;
    const group = target.columnGroup ?? crypto.randomUUID();
    row.forEach((f) => {
      f.columnGroup = group;
    });
    const index =
      rest.findIndex((f) => f.id === targetId) + (position === "right" ? 1 : 0);
    rest.splice(index, 0, { ...moving, columnGroup: group });
  } else {
    const index =
      position === "before"
        ? rest.findIndex((f) => f.id === row[0].id)
        : rest.findIndex((f) => f.id === row.at(-1)!.id) + 1;
    rest.splice(index, 0, moving);
  }
  return normalizeColumns(rest);
}

export {
  SUBMISSION_CONTRACT_VERSION,
  submissionRequestSchema,
  validateSubmissionRequest,
  getValidationCapabilities,
} from "./contract";
export type {
  SubmissionRequest,
  PublishedForm,
  SubmissionValidationResult,
} from "./contract";
