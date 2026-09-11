# Roadmap

The first two milestones are implemented locally. Remaining items are planned, not release commitments.

1. **Implemented: clearer layout controls.** Field settings now include a relative target, row/column position, row preview, and Apply layout action. Changes use the same placement rules as drag/drop and are undoable.
2. **Implemented: public controllers.** `useFormRenderer` exposes submission, reset, values, focus, and status through a ref. Structured server field errors, initial values, custom success content, and lifecycle callbacks are available. `useFormBuilder` exposes selection, add, undo/redo, JSON import/export, and state snapshots. See [controller APIs](api.md).
3. **Implemented: custom field registry.** Instance-local core registrations and separate builder/renderer adapters support custom configuration, click/drag insertion, validation, and JSON round trips. The playground includes a reference-code example. See [custom fields](custom-fields.md).
4. **Implemented: versioned integration contract.** Version-1 documents migrate to schema version 2 with stable IDs. Contract-v1 requests require a published revision, validate their envelope, reject unknown answer IDs, and return structured codes. TypeScript and a separate PHP reference validator run 71 shared answer cases. This is a validation foundation, not an HTTP backend or universal parser-equivalence guarantee.
5. **Complete theme and localization APIs.** Replace hardcoded UI strings/colors with documented per-instance configuration and verify multiple hosts/instances.
6. **Separate notifications adapter.** Build server settings, templates, queues, delivery status, and `wp_mail()` integration in the future plugin/backend package.
7. **Conditional logic.** Define visibility, requiredness, and hidden-answer submission semantics in both client and server before adding the editor UI.

After these foundations: reusable field presets, choice-list import, calculations, save-and-resume, and uploads. Uploads need backend storage, limits, and validation; they should not be implemented as a browser-only field. Payments and signatures warrant separate integration designs.

Next milestone: full theme/localization configuration and an end-to-end reference backend. The notification adapter and conditional logic remain planned.
