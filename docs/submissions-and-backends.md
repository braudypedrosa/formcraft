# Submission and backend contract

The library owns client interaction. The host owns persistence, access control, transport, authoritative validation, notifications, and retention. A PHP backend can implement this contract without running React or TypeScript.

## Submission contract v1

```json
{
  "contractVersion": 1,
  "formId": "contact",
  "revision": "published-7",
  "submissionId": "05dd95aa-c6d5-4ba1-9722-0e7a23ece584",
  "values": { "email": "visitor@example.com" }
}
```

`revision` and `submissionId` are host metadata, not FormDefinition properties. Keep the same submission ID when retrying the same request. A backend should atomically deduplicate accepted IDs; the renderer's in-flight guard does not protect against reloads or network retries. Define whether a changed answer set receives a new ID.

Suggested success: HTTP 201 with `{ "ok": true, "submissionId": "..." }`. Suggested validation failure: HTTP 422 with:

```json
{
  "ok": false,
  "message": "Please review your answers.",
  "fieldErrors": {
    "email": { "code": "invalid_email", "message": "Enter a valid email." }
  }
}
```

`validateSubmissionRequest` returns structured error codes. `validateSubmission` returns a field-ID-to-message map. The renderer accepts `SubmissionError` with field-ID keyed strings or `{ code, message }` objects. Validate the backend response in your host adapter, then throw this error to highlight fields and open the first affected page.

## Server processing order

1. Enforce request size, expected JSON envelope, endpoint policy, rate limits, and spam checks.
2. Load the authoritative published schema using the form ID. Do not trust a schema submitted by the browser. Check revision policy explicitly.
3. Validate answer types and rules for every page using the field reference. Reject or deliberately discard unknown answer IDs. Core's `validateSubmission` is not an envelope validator and does not reject unknown IDs.
4. Apply host business rules. Hidden values are client-controlled; derive prices, ownership, recipients, and permissions on the server.
5. Atomically deduplicate and save the accepted submission. Queue notifications using the saved record.
6. Return a safe response; keep internal exceptions and credentials out of it.

Port rules from [the field reference](fields-and-layouts.md), including boolean consent, option membership, unique multi-values, decimal strings, structured subkeys, date/time formats, and rating bounds. Validate all pages on final submission. The shared `fixtures/submission-contract-v1.json` contains 71 answer cases covering all built-in types and the example custom type. Run `pnpm test` and `php examples/php/run-fixtures.php`. The PHP reference lives outside library packages and validates answers only; it is not an endpoint or full schema/envelope parser. Passing this corpus proves agreement on those cases, not every edge of PHP and JavaScript URL/date parsing. Expand fixtures for your production acceptance policy.

## WordPress integration

Implement a separate plugin. Management endpoints require WordPress permissions; public submission endpoints need a deliberately defined public policy and abuse controls. A nonce is not a substitute for permissions or spam prevention. Follow the official [custom REST endpoint guide](https://developer.wordpress.org/rest-api/extending-the-rest-api/adding-custom-endpoints/) for registration and permission callbacks.

The plugin owns database storage, REST endpoints, shortcodes/blocks, asset enqueueing, and notifications. Enqueue renderer assets on public form pages and builder assets only where editing is needed. Neither library package contains WordPress globals or PHP runtime code. See [email setup](email-setup.md).


## Use the core validator on a TypeScript backend

```ts
import { validateSubmissionRequest } from '@formcraft/core';
const result = validateSubmissionRequest(
  { schema: authoritativeSchema, revision: publishedRevision },
  requestBody,
  registry,
);
// Save and notify only if result.ok; transport/status mapping belongs to the host.
```

The backend loads the schema and revision together from authoritative storage. A revision is a required opaque nonempty string, assigned by the host when publishing changes. `form_mismatch` and `revision_mismatch` prevent a request from being accepted against a different form or revision. `invalid_request` covers malformed envelopes/answer shapes; `invalid_values` contains field errors including `unknown_field`, `required`, `invalid_<type>`, or custom validator codes. Accepted results contain submissionId and values. Content-block answer IDs are rejected.

The validator does not save, deduplicate, authenticate, rate-limit, or deliver email. Invalid authoritative schema/registration configuration throws; handle this as an integration error, not a respondent validation error. `getValidationCapabilities(registry)` advertises supported versions and types; a PHP integration must maintain its own equivalent list and refuse unsupported custom type/version pairs.

Schema version and contract version are independent. Schema v1 loads through migration into v2; custom fields require v2 and an exact registered customVersion. Changing a custom validator's semantics requires a new custom version plus an explicit host migration. Do not silently reinterpret previously published forms.
