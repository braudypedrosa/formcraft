# Formcraft documentation

Formcraft is an embeddable TypeScript library. The playground is a demonstration host; it is not a required application or backend.

1. [Getting started and embedding](getting-started.md)
2. [Public API reference](api.md)
3. [Fields, columns, pages, and saved JSON](fields-and-layouts.md)
4. [Hooks and extensibility](hooks-and-extensibility.md)
5. [Custom fields](custom-fields.md)
6. [Submission and backend contract](submissions-and-backends.md)
7. [Email notifications and WordPress setup](email-setup.md)
8. [Testing and troubleshooting](testing-and-troubleshooting.md)
9. [Recommended next features](roadmap.md)

## Current release boundary

The packages are local, unpublished `0.0.0-prototype` builds. This documentation describes the implemented exports, with proposed contracts explicitly marked.

| Available now | Host-owned today | Not implemented yet |
| --- | --- | --- |
| Separate React packages and custom field adapters | Schema persistence and transport | Complete theme configuration |
| 24 built-in types, custom registrations, pages, controllers | Submission storage and transport | Conditional logic |
| Undo/redo, JSON import/export, versioned validation fixtures | Email notifications, SMTP, queues | Notifications adapter |
| Async submit, server errors, v1-to-v2 migration | Authentication and spam protection | Full localization |

The core package has no React or WordPress dependency. The current UI packages require React 19. Other frameworks can consume the core directly or mount a React adapter; native Vue/Svelte UI components are not included.
