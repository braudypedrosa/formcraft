# Prototype verification — September 8, 2026

## Automated

`pnpm test`: 6 passing tests across 2 files.

- JSON export/import retains IDs, ordering and options.
- Duplicate field IDs and unsupported versions fail with property paths.
- Required checkbox, email and dropdown membership validation.
- Grouped typing, undo/redo and redo branch invalidation.
- Independent editor stores and external-document history reset.
- Renderer retains answers after failure and succeeds on retry.

`pnpm build`: TypeScript check and Vite playground build pass.

## Built-in browser session

Used the Codex built-in browser, including its Playwright interaction surface. No Chrome or external browser was used.

Verified desktop canvas, selected-field inspector, empty state, contextual insertion picker, and mobile-width renderer. Verified 390 × 844 phone editor and full-height settings sheet.

- Selected and renamed a field; changes appeared in the canvas.
- Duplicated a field, deleted it, and restored it with undo.
- Reordered through a drag handle with Space / ArrowDown / Space.
- Reordered through pointer dragging and verified undo/redo.
- On phone width, changed a label, moved a field up, and closed with Escape; focus returned to the field.
- Inserted a checkbox between existing fields at the chosen insertion point.
- Rejected malformed JSON while retaining the form.
- Loaded exported JSON, reloaded the page, and compared the displayed export: exact match.
- Required-field submission errors focused the first invalid field.
- Pending submission disabled the submit button.
- Simulated submission failure preserved answers; retry produced success.
- Restored the sample contact form for handoff.

## Limits and deferred checks

This is the design-approval prototype. Touch dragging on real hardware, full screen-reader testing, exhaustive focus/contrast audits, reduced-motion browser emulation, multiple embedded instances in the browser, renderer-only distribution loading, host-CSS isolation fixtures, and production extension compatibility are not yet verified. Keyboard sorting and mobile move controls are verified; phone viewport inspection is not a substitute for a physical touch-device test.

The browser scenarios above were executed through the built-in browser, not a persisted Playwright test suite. Add repeatable end-to-end fixtures during post-approval hardening.

## Follow-up: standard builder QA and expanded fields

The September 8 follow-up fixes the disappearing toolbox with a persistent three-panel editor and adds a searchable, Gravity Forms-informed field palette. There are now 13 implemented types, grouped into Standard Fields and Advanced Fields; this is not full Gravity Forms feature parity.

Confirmed and fixed:

- Selecting a field previously removed the only visible toolbox. All 13 add controls now remain available on desktop while settings are open.
- The original small, pale controls made the editor difficult to scan. Field tiles, labels, input borders, spacing and secondary copy now use conventional editor sizing and stronger contrast.
- Closing mobile settings after adding a field returned focus to the previous field. It now returns to the newly added field.
- Hiding the selected editor for Preview caused a zero-width resize event to open a hidden mobile dialog, making the preview inaccessible. Zero-width observations are now ignored.
- Invalid definitions could throw when opening JSON. JSON now remains accessible for repair, and export reports validation problems.

Coverage: 13 automated tests across core validation, renderer submission and editor regressions. Built-in-browser checks covered all 13 field types in a single form, website validation failure followed by successful submission, searchable/persistent toolbox, keyboard reorder, undo/redo, expanded JSON reload equality, and 390 × 844 mobile insertion/settings/focus. No browser warnings or errors were recorded in the expanded renderer pass. The phone document showed no horizontal overflow.

Evidence: `outputs/qa/desktop-standard-builder.png` and `outputs/qa/phone-field-picker.png`. QA used a separate `?qa=1` playground storage key, preserving the main draft.

Not run in this follow-up: physical touch-device dragging, exhaustive screen-reader/contrast certification, cross-browser testing, and production package isolation. Existing exclusions and post-approval packaging work still apply.
