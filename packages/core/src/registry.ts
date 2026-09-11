import type { Field, Submission } from "./index";
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type FieldConfig = Record<string, JsonValue>;
export interface ValidationIssue {
  code: string;
  message: string;
}
export interface CustomFieldDefinition {
  /** Namespaced identifier, for example acme.reference. */
  type: string;
  version: number;
  label: string;
  defaultConfig?: FieldConfig;
  /** Required for backend parity. Return a readable configuration error or undefined. */
  validateConfig(config: FieldConfig): string | undefined;
  /** Called after common required checks; optional empty values are skipped. */
  validate(
    value: Submission[string],
    field: Field,
  ): ValidationIssue | undefined;
}
export interface FieldRegistry {
  get(type: string): CustomFieldDefinition | undefined;
  list(): CustomFieldDefinition[];
}
export function assertJson(
  value: unknown,
  ancestors = new Set<object>(),
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  )
    return;
  if (
    !value ||
    typeof value !== "object" ||
    ancestors.has(value) ||
    (!Array.isArray(value) &&
      Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    throw new Error("Expected finite, acyclic, plain JSON values");
  ancestors.add(value);
  for (const child of Object.values(value)) assertJson(child, ancestors);
  ancestors.delete(value);
}
/** Registries are per-host values, never a global singleton. Built-ins cannot be overridden. */
export function createFieldRegistry(
  definitions: CustomFieldDefinition[] = [],
): FieldRegistry {
  const entries = new Map<string, CustomFieldDefinition>();
  for (const definition of definitions) {
    if (
      !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9.-]*$/.test(definition.type) ||
      !Number.isInteger(definition.version) ||
      definition.version < 1 ||
      !definition.label.trim() ||
      typeof definition.validate !== "function" ||
      typeof definition.validateConfig !== "function"
    )
      throw new Error("Invalid custom field registration");
    if (entries.has(definition.type))
      throw new Error(`Duplicate custom field: ${definition.type}`);
    assertJson(definition.defaultConfig ?? {});
    const config = structuredClone(definition.defaultConfig ?? {});
    const error = definition.validateConfig(config);
    if (error) throw new Error(`${definition.type}: ${error}`);
    entries.set(
      definition.type,
      Object.freeze({ ...definition, defaultConfig: config }),
    );
  }
  const copy = (entry: CustomFieldDefinition) => ({
    ...entry,
    defaultConfig: structuredClone(entry.defaultConfig),
  });
  return Object.freeze({
    get: (type: string) => {
      const entry = entries.get(type);
      return entry ? copy(entry) : undefined;
    },
    list: () => [...entries.values()].map(copy),
  });
}
export const emptyFieldRegistry = createFieldRegistry();
