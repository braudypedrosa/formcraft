# Fields, columns, pages, and JSON

## Field reference

Answer keys are stable field IDs, never labels. Number-like answers remain strings.

| Type | Value / behavior |
| --- | --- |
| `text` | String, single line |
| `textarea` | String, multiline |
| `email` | String, email validation |
| `phone` | String, original formatting, no country mask |
| `dropdown` | One option value |
| `radio` | One option value |
| `checkboxes` | Unique option values as a string array |
| `multiselect` | Unique option values as a string array; native multiple select |
| `checkbox` | Boolean consent; required means checked |
| `number` | Finite decimal string; no exponent syntax or min/max settings |
| `date` | Valid `YYYY-MM-DD` string |
| `time` | `HH:mm`, 24-hour string |
| `url` | HTTP(S) URL string |
| `name` | One full-name string |
| `address` | One multiline address string |
| `structured_name` | Object with `first`, `last`; both required when the field is required |
| `structured_address` | Object with `street`, `line2`, `city`, `region`, `postalCode`, `country`; required fields need street, city, postal code, country |
| `rating` | Integer string from 1 through `ratingMax` (default 5; configurable 3–10) |
| `password` | Masked string input; does not implement account creation/authentication |
| `hidden` | String default value; still untrusted client input |
| `heading` | Content only |
| `paragraph` | Content only |
| `section` | Content separator, not a nested layout container |
| `divider` | Content separator |

Choice fields require at least one option and unique nonempty option values. No country-specific address validation or telephone validation is included. Empty optional strings are accepted; whitespace-only values can still fail type-specific validation such as email. Content fields do not contribute answers.

## Editing and layout

Click a toolbox field to add it, or drag it to an insertion location. Select a canvas field to edit settings. Use its move controls when dragging is inconvenient. Duplicate/delete and undo/redo operate on the document.

For an explicit layout change, select a field and use Layout in its settings: choose a relative field and position, review the row preview, then Apply layout. Undo restores the previous arrangement.

Dropping above/below a field reorders a whole row. Dropping at its narrow left/right edge creates a column; watch the active placement label before releasing. Rows contain two or three equal-width fields. Moving a field out of a two-column row restores the remaining field to full width. Resizing, nested grids, and arbitrary spans are not implemented. Narrow displays stack fields.

Use the page controls to add named pages; assign a selected field using its Page setting. Back/Next labels are configurable. Next validates the current page; final submit validates all pages and opens the first invalid page. Back preserves answers. Removing a page moves its fields to an adjacent page and clears their column grouping; undo restores the change.

## Saved definition

```json
{
  "version": 2,
  "id": "contact",
  "title": "Contact us",
  "description": "Tell us about your project.",
  "submitLabel": "Send message",
  "fields": [
    {
      "id": "email",
      "type": "email",
      "label": "Email address",
      "description": "",
      "placeholder": "you@example.com",
      "required": true,
      "options": []
    }
  ]
}
```

All displayed base field properties above are required. Optional field properties: `defaultValue` (string), `columnGroup` (nonempty string), `pageId` (nonempty string), `ratingMax` (integer 3–10). Optional form properties: `pages: { id, title }[]`, `nextLabel`, `backLabel`.

Field IDs use letters, digits, underscores, or hyphens and must be unique. The reserved IDs `__proto__`, `constructor`, and `prototype` are rejected. Page IDs must be unique; page references must exist. Fields without `pageId` belong to the first page when pages exist. A column group must contain two or three consecutive fields on the same effective page.

Schema versions 1 and 2 are accepted. `importForm` validates and upgrades version 1 to version 2 without changing IDs, order, options, or layout. New factories and exports produce version 2. Older library builds cannot read version-2 exports. Unknown versions and invalid layouts are rejected. `createFormSchema(registry)` validates registered custom fields; version 1 cannot contain them. Unknown properties are stripped, so custom settings belong in the explicit `config` object. Store host settings separately.

Validate imports before replacing state:

```ts
try {
  const next = importForm(text);
  setSchema(next);
} catch (error) {
  // Show the error and retain the existing document.
  setImportError(error instanceof Error ? error.message : 'Import failed.');
}
```

Saved JSON contains no React components, callbacks, transport settings, or credentials.
