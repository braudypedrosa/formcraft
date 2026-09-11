# Public API reference

Import through package roots. Internal files, including the editor store, are not supported entrypoints.

## Builder

```ts
interface FormBuilderProps {
  registry?: FieldRegistry;
  adapters?: BuilderFieldAdapters;
  value: FormDefinition;
  onChange: (value: FormDefinition) => void;
  onPreview?: () => void;
  theme?: React.CSSProperties;
  status?: string;
  style?: React.CSSProperties;
  className?: string;
  ref?: React.Ref<FormBuilderHandle>;
}
```

`value` is the complete document. Echo `onChange` back into it synchronously; debounce server persistence separately. Parent echoes preserve internal history. An externally replaced document resets history. Each editor owns its store; there is no shared singleton. History retains up to 100 transactions, with text edits grouped until blur. Duplication creates a fresh field ID.

`onPreview` delegates opening preview to the host. Without it, the preview button is omitted. `status` displays host-provided persistence status; it does not save anything. `style` and `className` size/style the root. `theme` applies root styles; custom CSS variables may require a `React.CSSProperties` assertion in TypeScript. Coverage is partial, not a complete design-token contract.

## Renderer

```ts
interface FormRendererProps {
  registry?: FieldRegistry;
  adapters?: RendererFieldAdapters;
  schema: FormDefinition;
  onSubmit: (values: Submission) => Promise<void> | void;
  ref?: React.Ref<FormRendererHandle>;
  initialValues?: Submission;
  successTitle?: string;
  successMessage?: React.ReactNode;
  resetLabel?: string;
  onSuccess?: (values: Submission) => void;
  onError?: (error: unknown) => void;
  onValidationError?: (errors: Record<string, string>) => void;
  className?: string;
  style?: React.CSSProperties;
}
type Submission = Record<
  string, string | boolean | string[] | Record<string, string>
>;
```

The renderer validates before calling `onSubmit`. Resolve to show success. Throw an `Error` to show its message, preserve answers, and allow retry. Returning `{ ok: false }` does not signal failure. Pending submissions disable navigation/submission and are guarded against duplicate in-flight calls.

Throw `SubmissionError` from `@formcraft/renderer` to attach server errors to field IDs. The first recognized field opens its page and receives focus. Unknown/content/hidden field IDs are ignored; the general message remains visible. Answers survive failures. `onError` observes submission failures, `onValidationError` observes client validation failures, and `onSuccess` runs after accepted submission. These observer callbacks should not throw.

`initialValues` initializes answers on mount; it is not a controlled-values prop. Keep the mounted schema stable during answering; remount with a form/revision key when replacing it. `successTitle` and `successMessage` customize success; `resetLabel` opts into a success-screen reset button. `style`/`className` apply to both form and success roots. Full theme/localization configuration remains planned.

## Core

| Export | Contract |
| --- | --- |
| `fieldTypes`, `FieldType` | Built-in type names and their TypeScript union |
| `names`, `fieldGroups` | Built-in toolbox labels/group metadata |
| `contentTypes` | Types omitted from submitted answers |
| `nameParts`, `addressParts` | Structured input keys, labels, autocomplete hints |
| `Field`, `FormDefinition`, `Submission` | Public TypeScript types |
| `formSchema` | Zod schema; `safeParse(unknown)` returns data or path-based issues |
| `createField(type)` | New built-in field with UUID and default settings |
| `emptyForm()` | New empty document with UUID |
| `contactForm()` | New sample document and field IDs on each call |
| `importForm(json, registry?)` | Parse and validate JSON; throws readable errors with property paths |
| `exportForm(form, registry?)` | Validate then return formatted JSON; throws on invalid definitions |
| `validateSubmission(form, values, registry?)` | Field-ID-to-message map; empty object means no field errors |
| `fieldsOnPage(form, pageId?)` | Filter by effective page; without pages returns all fields |
| `normalizeColumns(fields)` | Remove invalid column groups; does not validate the whole schema |
| `fieldColumnSpan(fields, field)` | 12, 6, or 4 for a valid full/half/third-width field |
| `placeField(fields, incoming, targetId?, position?)` | Immutable insertion/move; position is `before`, `after`, `left`, or `right` (default `after`) |

Call `fieldsOnPage` with a page ID for paginated forms. `placeField` retains IDs on moves, targets the whole row for before/after, and inherits the target's page. Left/right creates or extends a row up to three fields; a fourth is rejected by returning the original array. No target appends the field. Always validate the resulting complete document before persistence.

Factory helpers need `crypto.randomUUID()` in their runtime. Core exports the registry, migration, and submission contract APIs below. It has no transport or email service.


## Public controller hooks

The hooks return stable React refs. Pass the ref to the matching component. `current` is populated after mounting and cleared on unmount. Ref snapshots are imperative, not reactive subscriptions; use `onChange`/lifecycle callbacks to update host UI.

```tsx
const editor = useFormBuilder(); // @formcraft/builder
const renderer = useFormRenderer(); // @formcraft/renderer
// Inside your React component:
<FormBuilder ref={editor} value={schema} onChange={setSchema} />
<FormRenderer ref={renderer} schema={schema} onSubmit={submit} />
// Event handlers can call editor.current?.undo() or renderer.current?.reset().
```

| Builder handle method | Behavior |
| --- | --- |
| `getState()` | Detached document snapshot, selectedFieldId, canUndo, canRedo |
| `selectField(id)` or `selectField(null)` | Select/reveal field; null closes inspector; false for unknown ID |
| `addField(type)` | Add a built-in type to the active page |
| `addCustomField(type)` | Add a registered type with a matching builder adapter |
| `undo()`, `redo()` | Execute instance history commands |
| `exportJSON()` | Validate and export current document |
| `importJSON(json)` | Validate before replacing; throws without losing work on invalid input; valid import resets history |

| Renderer handle method | Behavior |
| --- | --- |
| `submit()` | Same current-page validation/advance/final submit as the button |
| `reset(values?)` | Restore initial answers with optional overrides; clear errors/success and return to page one; false while pending |
| `getValues()` | Detached answer snapshot |
| `setValue(id, value)` | Set a known answer; false while pending or for unknown/content/hidden fields |
| `focusField(id)` | Reveal the field's page and focus it; false for unknown/content/hidden fields |
| `getStatus()` | idle, loading, or success |

Submission input is locked while pending; the controller cannot cancel an in-flight transport. The host owns network cancellation, timeouts, and backend idempotency.

```ts
import { SubmissionError } from '@formcraft/renderer';
throw new SubmissionError('Review your answers.', {
  email_field_id: { code: 'invalid_email', message: 'Use a valid email address.' },
});
```

A field error can also be a plain string. Use actual saved field IDs, not display labels.


## Registry, migration, and contract exports

| Export | Behavior |
| --- | --- |
| `createFieldRegistry(definitions)` | Create an isolated registry with get(type) and list(); duplicates rejected |
| `emptyFieldRegistry` | Immutable registry with no custom types |
| `createCustomField(type, registry, config?)` | Fresh ID, registered version, validated JSON config |
| `createFormSchema(registry?)` | Zod schema with custom-registration validation; accepts schema v1/v2 |
| `CURRENT_SCHEMA_VERSION` | 2 |
| `migrateForm(unknown, registry?)` | Validate and upgrade schema v1 to v2; already-v2 is revalidated |
| `SUBMISSION_CONTRACT_VERSION` | 1; independent from schema version |
| `submissionRequestSchema` | Strict Zod request envelope with formId, revision, submissionId, values |
| `validateSubmissionRequest(published, unknown, registry?)` | Validate authoritative schema/revision/envelope and all answers; structured result |
| `getValidationCapabilities(registry?)` | Supported schema versions, built-ins, and custom type/version pairs |

Exported types include `CustomFieldDefinition`, `FieldRegistry`, `FieldConfig`, `JsonValue`, `ValidationIssue`, `SubmissionRequest`, `PublishedForm`, and `SubmissionValidationResult`. Both React packages export their adapter interfaces. See [custom fields](custom-fields.md) and [backend contract](submissions-and-backends.md).
