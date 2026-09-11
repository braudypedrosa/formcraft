# Roadmap

This page describes planned extensions to Formcraft. Use the [API reference](api.md) for the current supported interface; roadmap items are not available APIs or delivery commitments.

## Theme and localization configuration

Expand per-instance theme tokens and configurable interface labels across the builder and renderer, with verification in multiple host applications.

## Notification adapters

Provide a separate server integration for notification settings, templates, queues, delivery status, and WordPress `wp_mail()` support. Email credentials and transport remain server-side.

## Conditional logic

Add shared rules for field visibility, requiredness, and hidden-answer handling across client and server validation before introducing editing controls.

## Additional integrations

Planned areas include reusable field presets, choice-list import, calculations, save-and-resume, and uploads. Upload integrations require backend storage, limits, and validation. Payments and signatures require separate integration designs.

## Available capabilities

Formcraft supports field and layout editing, pages, undo/redo, public controller hooks, custom field adapters, versioned JSON, schema migrations, and structured submission validation. See [fields and layouts](fields-and-layouts.md), [custom fields](custom-fields.md), and [the submission contract](submissions-and-backends.md).
