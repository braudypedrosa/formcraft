# Formcraft

An embeddable form-builder library with a framework-independent TypeScript core, React visual editor, and separate React renderer. WordPress will be a host integration; it is not a library dependency.

## Start locally

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173/`. Packages are currently unpublished `0.0.0-prototype` builds. The playground demonstrates embedding and browser-local drafts; it is not a backend.

## Documentation

Browse the documentation website at `http://127.0.0.1:5173/docs/` after `pnpm dev`. Its source is `apps/docs`; Markdown files remain the content source. `pnpm build` includes both the playground and documentation website.

- [Complete documentation](docs/README.md)
- [Embedding and local package consumption](docs/getting-started.md)
- [Public APIs](docs/api.md)
- [Fields, columns, pages, and saved JSON](docs/fields-and-layouts.md)
- [Hooks and extensibility](docs/hooks-and-extensibility.md)
- [Submission/backend contract](docs/submissions-and-backends.md)
- [Email setup, including WordPress and SMTP](docs/email-setup.md)
- [Recommended next features](docs/roadmap.md)
- [Working host hook and transport example](examples/host-integration.tsx)

## Packages

| Directory | Purpose |
| --- | --- |
| `packages/core` | Schema, field factories, validation, layout helpers |
| `packages/builder` | Visual editing and instance-local undo/redo |
| `packages/renderer` | Accessible inputs, pages, validation, async submission |
| `apps/playground` | Standalone demonstration host |

TypeScript, React 19, dnd-kit, Radix Dialog, CSS Modules, Zustand, React Hook Form, Zod, and Vite library builds. React/React DOM are peers; styles have explicit exports. The renderer never depends on the builder.

24 built-in field types, equal-width columns, pages, JSON import/export, and undo/redo are available. Public builder/renderer controllers, structured server field errors, reset, and configurable success content are available. Custom registries, schema migration, and contract-v1 validation with shared PHP/TypeScript fixtures are available. Complete localization/theme configuration remains planned. Persistence and email transport belong to the host application.

## Verify

```sh
pnpm build
pnpm test
pnpm test:consumer
pnpm exec tsc -p examples/tsconfig.json
```

See [testing and troubleshooting](docs/testing-and-troubleshooting.md) for scope and browser checks. After library source edits, run `pnpm build:packages`; `pnpm dev` does not watch library sources automatically.
