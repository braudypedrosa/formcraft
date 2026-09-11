# Hooks and extensibility

## Supported callbacks

| Callback | Appropriate work |
| --- | --- |
| Builder `onChange(next)` | Update host state immediately; schedule schema persistence separately |
| Builder `onPreview()` | Open a host-owned preview using the current definition |
| Renderer `onSubmit(values)` | Await the backend; throw on failure; resolve after acceptance |

Do not send notifications from `onChange`: it fires while editing a form definition, not when a respondent submits an answer. React effects can run more than once in development; notifications belong in the backend submission transaction/queue.

## Application-owned React hook

[`examples/host-integration.tsx`](../examples/host-integration.tsx) includes `useFormcraftDraft` and a complete editor/preview host. Copy it into your application and adapt its persistence policy. It is an example hook, **not an export from a Formcraft package**.

The hook validates saved drafts, reports storage errors, retains invalid stored data until an explicit edit replaces it, and saves definitions only. The editor stays mounted during preview to retain history. The transport checks the HTTP response and converts backend failure into the renderer's supported thrown-error behavior.

To add analytics, wrap `onSubmit` and record events before/after awaiting transport. Avoid logging answer bodies. For autosave to an API, debounce writes, cancel obsolete requests where possible, and use server revision checks to prevent older responses overwriting newer edits. These policies are host responsibilities, not built-in guarantees.

## Custom field registration

Custom types are supported through `createFieldRegistry` and separate React adapter maps. Use [the custom field guide](custom-fields.md) for registration, settings, rendering, and backend requirements. Keep callbacks outside saved JSON. Mutating `fieldGroups` or deep-importing the editor store remains unsupported.

## Further extension APIs

A general plugin event bus, async field validators, and controlled respondent-value subscriptions are not included. See [the roadmap](roadmap.md) for remaining work.
