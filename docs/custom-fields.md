# Custom fields

Custom fields have a portable core definition and separate React adapters. No global registration or source-code changes to Formcraft are required. Pass the same core registry to import/export, builder, renderer, and backend validation.

## Register a core field

```ts
import { createFieldRegistry, createCustomField } from '@formcraft/core';

const registry = createFieldRegistry([{
  type: 'acme.reference',
  version: 1,
  label: 'Reference code',
  defaultConfig: { prefix: 'FC' },
  validateConfig: config => config.prefix === 'FC'
    ? undefined : 'Prefix must be FC.',
  validate: value => typeof value === 'string' && /^FC-[0-9]{4}$/.test(value)
    ? undefined
    : { code: 'invalid_reference', message: 'Use FC followed by four digits, e.g. FC-1234.' },
}]);
const field = createCustomField('acme.reference', registry);
```

Names are namespaced lowercase identifiers. Duplicate registrations are rejected; built-in types cannot be overridden. Each registry supports one explicit version per type. Callbacks must be synchronous, deterministic, and return the documented result; exceptions indicate integration configuration errors.

Core handles common required checks before custom validation. Missing values, false, blank strings, and empty arrays are empty. Optional empty answers skip validation. Structured object completeness is the custom validator's responsibility. Values retain the existing `Submission` union: strings, booleans, string arrays, or objects of strings. Return a stable error code and a human-readable message.

`defaultConfig` is copied; retrieving a registry entry cannot mutate the registry's stored settings. `validateConfig` must reject unsupported properties and ranges. JSON configuration is public data: never put credentials or server-only settings in it.

## React adapters

Builder and renderer maps use the registered type name as their key. Their `version` must match the core definition and saved field version.

```tsx
import type { BuilderFieldAdapters } from '@formcraft/builder';
import type { RendererFieldAdapters } from '@formcraft/renderer';

const builderAdapters: BuilderFieldAdapters = {
  'acme.reference': {
    version: 1,
    Preview: () => <span>FC-0000</span>,
  },
};
const rendererAdapters: RendererFieldAdapters = {
  'acme.reference': {
    version: 1,
    Input: props => <input
      id={props.id} name={props.name} ref={props.inputRef}
      value={typeof props.value === 'string' ? props.value : ''}
      onChange={e => props.onChange(e.target.value)} onBlur={props.onBlur}
      disabled={props.disabled} aria-required={props.required}
      aria-invalid={props.invalid} aria-describedby={props.describedBy}
    />,
  },
};
```

Pass `registry` and `adapters` to the corresponding component. Registered fields with matching builder adapters appear in Custom Fields and support click or drag insertion. `editor.current.addCustomField(type)` provides host-controlled insertion.

Builder `Preview` must contain passive markup only: it sits inside the canvas selection button. Optional `Settings` receives `{ field, onChange(config) }`; valid config changes become undoable document transactions. Use local draft state if settings need incomplete intermediate input before applying.

Renderer `Input` receives `{ field, id, name, value, onChange, onBlur, inputRef, disabled, required, invalid, describedBy }`. Formcraft supplies the outer label, description, and error feedback. Attach the ID/ref and accessibility attributes to your actual focusable input. Complex widgets must implement their own keyboard behavior and accessible group semantics. Adapters must be safe when mounted multiple times.

A missing or mismatched adapter throws a configuration error on mount; host error boundaries can report it. JSON imports in the builder reject missing adapters before replacing the existing document. Core-only imports require only core registrations.

## Saved JSON and migration

```json
{
  "id": "reference",
  "type": "custom",
  "customType": "acme.reference",
  "customVersion": 1,
  "config": { "prefix": "FC" },
  "label": "Reference code",
  "description": "",
  "placeholder": "",
  "required": true,
  "options": []
}
```

Custom fields require schema version 2. `importForm(json, registry)` and `exportForm(form, registry)` preserve configuration and validate registration/version. Unknown types, mismatched versions, and non-JSON configuration are rejected. There is no automatic custom-version migration: deploy a matching validator/adapter or explicitly transform and revalidate the document in the host.

## Working example

The playground uses `demo.reference` with FC/REF prefixes:

- [Portable core definition](../apps/playground/src/custom-fields/reference.ts)
- [Builder and renderer adapters](../apps/playground/src/custom-fields/adapters.tsx)

The example is application-owned, not a built-in Formcraft field. The PHP fixture validator explicitly implements this type/version as a backend adapter example.
