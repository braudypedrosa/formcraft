import {
  createFieldRegistry,
  type CustomFieldDefinition,
} from "@formcraft/core";
/** Portable registration: no React, browser state, or backend credentials. */
export const referenceDefinition: CustomFieldDefinition = {
  type: "demo.reference",
  version: 1,
  label: "Reference code",
  defaultConfig: { prefix: "FC" },
  validateConfig: (config) =>
    Object.keys(config).some((key) => key !== "prefix") ||
    !["FC", "REF"].includes(String(config.prefix))
      ? "Choose FC or REF as the prefix."
      : undefined,
  validate: (value, field) =>
    typeof value === "string" &&
    new RegExp(`^${field.config?.prefix}-[0-9]{4}$`).test(value)
      ? undefined
      : {
          code: "invalid_reference",
          message: `Enter ${field.config?.prefix} followed by a hyphen and four digits.`,
        },
};
export const exampleRegistry = createFieldRegistry([referenceDefinition]);
