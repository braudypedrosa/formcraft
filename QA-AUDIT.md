# Formcraft QA — September 8, 2026

**Verdict: Fail — two confirmed medium-severity defects.** Continue local design review, but fix these before mobile/accessibility sign-off. No implementation changes were made during this audit.

## Scope and coverage

Tested the builder and renderer in the Codex built-in browser at `http://127.0.0.1:5173/?qa=1`. This isolated draft uses separate storage from the main form. QA data was reset to the sample contact form afterward.

- Builder widths: 1440, 1024, 768, 390 and 320 CSS pixels, height 900.
- Renderer widths: 1440, 1024, 768, 390 and 320 CSS pixels, height 900; representative contact-form content.
- Mobile settings and field picker: 390 × 844.
- 14 reviewed screenshots in `outputs/qa/audit/`.
- Automated: **13 tests pass** across three suites; TypeScript and Vite build pass.
- Totals: 0 Critical, 0 High, **2 Medium**, 0 Low, **1 Concern**.

| Surface / journey | Result | Evidence |
| --- | --- | --- |
| Builder reflow at 390–1440 | Pass for sampled states | `builder-390.png`, `builder-768.png`, `builder-1024.png`, `builder-1440.png`; no document overflow |
| Builder reflow at 320 | Fail | QA-001 |
| Renderer reflow at 320–1440 | Pass for sampled states | `renderer-*.png`, `blank-label-preview.png`; no document overflow |
| Field label validation | Fail | QA-002 |
| Required and invalid-email validation | Pass | First invalid field focused; inline errors; `invalid-email.png` |
| Loading, simulated failure, retry | Pass | Disabled pending button; retained answers visible in `submission-error.png`; success in `submission-success.png` |
| Duplicate, delete, undo, redo | Pass | Restored duplicated field after deletion; redo removed it |
| Keyboard sorting | Pass | Space → ArrowDown → Space moved the first field below Email |
| Invalid JSON and reload | Pass | Invalid JSON rejected; displayed export exactly matched after reload |
| Mobile picker and focus | Pass | 13 add controls; Escape returned focus to newly added Date; `mobile-settings.png` |
| Console / network | Partial, with concern | Two development root-creation warnings; full network failure/offline testing not run |

## QA-001 — Toolbar overflows at 320px

- **Severity:** Medium.
- **URL/state:** QA builder, viewport 320 × 900.
- **Reproduce:** Open the builder and resize to 320px.
- **Expected:** Toolbar actions remain within the viewport without horizontal scrolling.
- **Actual:** Document client width is 305px with the scrollbar, but scroll width reaches 334px. Preview's right edge is approximately 333.8px; its label and right side are clipped.
- **Impact:** Small-screen users and users at equivalent zoom/reflow widths cannot see the whole primary action. Reproduced in the narrow-screen pass; wider tested widths did not overflow.
- **Evidence:** [Narrow-screen toolbar](outputs/qa/audit/builder-320.png).
- **Suggested fix:** Allow toolbar wrapping or collapse secondary actions at narrow widths; retest 320px and adjacent breakpoints.

## QA-002 — Empty labels can be saved and rendered

- **Severity:** Medium.
- **URL/state:** QA builder and renderer, desktop; schema-level issue applies at every width.
- **Reproduce:** Select Your name. Clear Label and Placeholder with Select All / Backspace, and turn off Required. Open JSON, then Load form and Preview.
- **Expected:** Reject an unusable empty label before accepting the definition, or provide a deliberate accessible labeling alternative.
- **Actual:** JSON accepts `label: ""` and `placeholder: ""`. Preview displays an unexplained input; the accessibility snapshot reports a textbox with no name. The builder's “Untitled field” fallback is not carried into the renderer.
- **Impact:** Visitors cannot determine what to enter, including screen-reader users. The accepted definition survives serialization/import.
- **Evidence:** [Unlabeled input](outputs/qa/audit/blank-label-preview.png); inspected JSON and accessibility snapshot. Core currently validates labels as unrestricted strings.
- **Suggested fix:** Require non-whitespace labels for answer fields at the valid-definition boundary, while allowing temporary unfinished editing states. Apply equivalent checks to choice labels, and add renderer/accessibility regressions.

## Concern — development hot-reload warnings

Two console errors reported `ReactDOMClient.createRoot()` being called again on an existing root container. They appeared during the development reload/artifact-capture portion of the session and did not correspond to a reproduced end-user failure. Keep this separate from the two confirmed defects; investigate entrypoint hot-reload behavior in an isolated run.

## Limits

This was focused product QA, not a full website release certification. Physical touch dragging, real screen-reader output, exhaustive contrast/zoom checks, all 13 types manually submitted again, cross-browser testing, offline/network failure injection, performance, SEO, security, and production package isolation were not run. Expanded field validation and submission cases were covered by the passing automated suite; prior browser results are not presented as newly rerun coverage. The renderer submits only to the playground's local simulator; no email, CRM or external delivery was attempted.
