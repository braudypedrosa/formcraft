# Library boundary verification

This pass establishes independently consumable packages; it does not declare the prototype production-ready.

- `pnpm build`: passed. Core, builder and renderer emit ESM and TypeScript declarations. React package CSS has explicit exports and declaration stubs for strict TypeScript consumers.
- `pnpm test`: 13 tests passed.
- `pnpm test:consumer`: passed after the final layout change. Packs local tarballs and installs them outside the workspace; renderer-only and combined consumers both type-check and build without source aliases. Renderer consumer installs no builder and its distribution imports no editor dependencies.
- Built-in browser: combined consumer renders an editor inside a 540px-high host section, followed by an independent renderer. Add Number updates both views; label editing and Undo synchronize correctly. Settings dialog closes successfully.
- Host heading retains its browser-default 32px size; no page reset was introduced. This is a smoke check, not exhaustive protection against arbitrary host CSS.
- At a 320px viewport, a padded host leaves only 239px for the editor. Toolbar controls wrap inside the section, editor height stays 540px, and the document has no horizontal overflow. Viewport override restored after inspection.

The host owns branding, storage, preview navigation and submission transport. Preview is omitted without an `onPreview` callback. Editor dimensions are configurable through `style`/`className`.

Remaining prototype work includes custom registries, configurable labels, migrations, structured submission errors and broader integration coverage. The earlier blank-label accessibility finding in QA-AUDIT.md was addressed on September 9: rendered fields fall back to their field-type label. Non-React UI embedding still needs a mounting adapter. Nothing was published or deployed.

## September 9 field and design QA

- 15 automated tests pass, including new field rendering, hidden submission values, content exclusion and blank-label accessibility. All 19 types pass JSON round trips.
- Full build and packed renderer-only/combined consumer checks pass.
- Built-in browser inspected desktop at 1280px, mobile settings at 390px, and the compact two-row toolbar at 320px. Field toolbox/canvas/inspector remain in their original desktop positions. No branded header, title header or decorative dashboard panels remain.
- Mobile search exposes Hidden, its default value is editable, Escape closes settings, Undo restores the previous value, and preview omits the hidden input visually while showing the new multiline address input.
- Device checks used browser viewport emulation, not physical phones. This was focused design and new-field QA, not a fresh exhaustive regression run of every pointer/touch scenario.

## Dragging and columns verification

Built-in-browser pointer dragging added toolbox Number beside Your name. Dragging the existing Email address grip beside Number extended the row; Undo restored the previous two-column layout. Reload preserved columns. Renderer geometry confirmed two fields at y=292 with widths 228px; mobile preview stacked them vertically. Core tests cover JSON round trips, two/three-column sizing, a fourth-column limit, and moving fields out of rows. All 16 tests, full build and packed consumer checks passed. Toolbox drag IDs are instance-specific. Non-drag layout controls are available. Physical touch-device behavior remains unverified; pages are not implemented.

## Pages and remaining recommended fields

Added Section, Divider, structured Name, structured Address and Rating (24 toolbox items total). Pages have names, configurable Next/Back labels, field assignment, and removal that preserves fields. Renderer validates the current page before Next and every page before final submission; Back retains values and focus moves to the page title or invalid field.

Verification: 19 automated tests passed; full build and separate packed consumers passed. Built-in browser exercised required structured-name validation, advancement, rating selection, Back/Next answer retention, loading and success. Mobile 390px inspection showed stacked compound inputs, usable page controls and no horizontal overflow. Single-input Name/Address definitions remain supported. Required-field note is shortened to '* Required fields', 12px, with no forced narrow wrapping. These checks do not constitute a physical touch-device test or a production-readiness claim.

## Column-drag clarity refinement

Column targets now occupy only the left/right 32px edge strips and use pointer-only collision detection. Interior drops insert above/below instead of triggering columns through dragged-element overlap. Only the active placement line and a directional label are visible; dragging uses a compact field-name preview. Full three-column rows disable extra-column targets except for fields already in that row.

Built-in browser verified an interior drop creates a full-width Number field (593px), a deliberate right-edge drop creates two equal columns (283.5px), Escape cancels keyboard dragging, and Undo restores full width. All 19 tests and the build pass.

## Roadmap milestone: layout and public controllers

Implemented preview-first Layout settings with relative target and row/column position, one-step undo, public `useFormBuilder` and `useFormRenderer` ref handles, structured `SubmissionError`, initial values, configurable success content/reset, and submission lifecycle callbacks. Playground includes a local server-field-error simulation.

Validation: 24 Vitest/Testing Library tests passed, including consecutive controller commands, independent instances, invalid imports retaining history, server errors opening earlier pages, preserved answers on retry, and pending/reset guards. Build and packed external consumers passed. Built-in-browser inspection confirmed desktop/mobile layout application, undo, and field-error focus. The mechanical design detector reported no findings on the changed targets. Existing drag behavior was retained; this pass verifies the new explicit layout alternative rather than claiming a new full touch-drag certification.

Scope: roadmap items 1–2 and the small public editor controller milestone. Custom field registration, migrations/backend fixtures, full theme/localization, notifications adapter, and conditional logic remain planned.

## Registry and versioned contract milestone — 2026-09-10

Added per-host core registries, separate React builder/renderer adapters, a public custom-field factory, registered JSON configuration, and a playground Reference code example. Built-in types remain 24. Custom imports fail before replacement when builder adapters are missing. Schema v1 migrates to v2 without changing IDs; unsupported custom versions fail closed.

Contract v1 validates the request envelope, authoritative form ID and published revision, unknown answer IDs, and per-field rules. PHP code is a separate answer-validation reference in examples/php, outside the library packages; it is not an HTTP backend or WordPress plugin.

Validation: 101 TypeScript/React tests passed; PHP passed the same 71 answer fixtures. Full build and packed external consumer checks passed, including a renderer-only custom adapter. Browser inspection verified custom insertion, prefix editing, required rules, invalid-value feedback, corrected submission, saved configuration after reload, and the mobile settings sheet. The design detector reported no findings. The shared corpus proves those cases, not full cross-language parser equivalence.
