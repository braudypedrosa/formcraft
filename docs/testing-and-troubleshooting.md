# Testing and troubleshooting

```sh
pnpm build
pnpm test
pnpm test:consumer
```

Build produces library JS, declarations, CSS, and the playground. Vitest/Testing Library cover core and React behavior. The consumer check packs and installs packages outside the workspace, including a renderer-only build. Playwright is installed, but do not confuse dependency availability with a complete automated browser suite.

For interaction releases, use the built-in browser to verify toolbox insertion, pointer sorting, deliberate column drops, keyboard focus and move controls, undo/redo, page navigation, mobile editing, schema save/reload, and submit failure/retry. Test multiple embedded instances and host styles.

| Symptom | Check |
| --- | --- |
| Library edit not visible | Rebuild with `pnpm build:packages`; dev does not watch library sources |
| Unstyled component | Import that package's `style.css` export |
| Invalid hook call | Ensure the host supplies one compatible React/React DOM installation |
| Import removes custom properties | Unknown schema properties are stripped; store host metadata separately |
| Undo history disappears | Avoid replacing the document or unmounting the builder during preview |
| API failure shows success | Throw from `onSubmit`; returning an error object is treated as resolution |
| Old answers after schema replacement | Intentionally remount the renderer using a form/revision key |
| Empty page output | Pass a real page ID to `fieldsOnPage` for paginated documents |
| Column created unexpectedly | Use top/bottom interior targets for reorder; side edges create columns |
| Mail accepted but no message | Inspect transport logs and recipient inbox; acceptance is not delivery |

Documentation examples are typechecked with `pnpm exec tsc -p examples/tsconfig.json`. The host example expects an application-defined endpoint; it does not start a backend.

## Custom fields and backend fixtures

The playground includes one host-registered Reference code field under Custom Fields; the library still has 24 built-ins. Run `php examples/php/run-fixtures.php` for the separate PHP answer validator. `pnpm test` runs the same 71 JSON cases through the core submission contract. Add fixtures whenever you change validation semantics.

A missing adapter, unknown custom type, or custom-version mismatch is an integration configuration problem. Register the matching core definition and React adapter before mounting or importing the form. Version-1 saved forms migrate to version 2; version-2 exports require the updated library. A stale published revision produces `revision_mismatch` and requires a host-defined reload/recovery flow.
