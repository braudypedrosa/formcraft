# Formcraft documentation

Formcraft is a TypeScript form-building library with a visual React editor, a separate form renderer, and a framework-independent core. Embed the components in your application and connect them to your own persistence and submission services.

## Build with Formcraft

1. [Install and embed the components](getting-started.md)
2. [Explore the public API](api.md)
3. [Configure fields, columns, and pages](fields-and-layouts.md)
4. [Control the editor and renderer with hooks](hooks-and-extensibility.md)
5. [Register custom fields](custom-fields.md)
6. [Validate and process submissions](submissions-and-backends.md)
7. [Configure email notifications](email-setup.md)
8. [Test and troubleshoot integrations](testing-and-troubleshooting.md)

## Library architecture

| Package | Responsibility |
| --- | --- |
| `@formcraft/core` | Form definitions, field registration, schema migration, and submission validation |
| `@formcraft/builder` | Visual editing, fields and layout, JSON import/export, and undo/redo |
| `@formcraft/renderer` | Accessible form inputs, validation feedback, pages, and submission states |

The builder and renderer ship separately. Applications that display forms can load the renderer without loading the editor. Form definitions are versioned JSON with stable field IDs; components, callbacks, and credentials stay outside saved definitions.

## Application integration

Your application supplies storage, authentication, submission transport, spam protection, and notifications. Validate submissions against the authoritative saved schema on the server, even when client validation succeeds.

The core has no React or WordPress dependency. The UI packages use React 19. Other frameworks can consume the core directly or mount the React components through an adapter. Native Vue and Svelte components are not included.

See the [roadmap](roadmap.md) for planned additions.
