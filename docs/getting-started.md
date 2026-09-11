# Getting started

From the repository directory:

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173/`. Development builds the libraries before starting the playground. After editing a library source file, run `pnpm build:packages` in another terminal; library source watching is not configured. The current verification environment uses Node 26 and pnpm 11.

## Package boundaries

| Package | Purpose | Runtime dependencies |
| --- | --- | --- |
| `@formcraft/core` | JSON schema, factories, validation, layout helpers | Zod |
| `@formcraft/builder` | Visual editor and instance-local undo history | Core, React peers, dnd-kit, Radix Dialog, Zustand, icons |
| `@formcraft/renderer` | Working form inputs and submission states | Core, React peers, React Hook Form, icons |

React and React DOM are external peer dependencies. Packages export ESM and TypeScript declarations. Import each React package's CSS explicitly. Rendering a form does not require importing the builder.

## Embed in React

```tsx
import { useState } from 'react';
import { contactForm, type Submission } from '@formcraft/core';
import { FormBuilder } from '@formcraft/builder';
import { FormRenderer } from '@formcraft/renderer';
import '@formcraft/builder/style.css';
import '@formcraft/renderer/style.css';

export function FormEditor() {
  const [schema, setSchema] = useState(contactForm);
  const [preview, setPreview] = useState(false);

  async function submit(values: Submission) {
    // Replace this demonstration handler with your application's transport.
    console.info('Demo submission', Object.keys(values));
  }

  return preview ? (
    <>
      <button onClick={() => setPreview(false)}>Return to editor</button>
      <FormRenderer schema={schema} onSubmit={submit} />
    </>
  ) : (
    <FormBuilder value={schema} onChange={setSchema}
      onPreview={() => setPreview(true)} style={{ height: 720 }} />
  );
}
```

This minimal example unmounts the editor during preview, so its internal history and selection reset on return. To preserve those, keep the builder mounted in a hidden host container while previewing, as in [the complete host example](../examples/host-integration.tsx).

For a renderer-only page, import only core, renderer, and renderer CSS. Obtain the schema from your application and validate it with `importForm` before mounting.

## Consume locally

These packages are not published to npm. Inside a pnpm workspace, declare the desired packages using `workspace:*`. Outside the workspace, build and pack each required package, then install the local tarballs. The dependent core package must resolve to your local core tarball as well.

[The consumer verification script](../scripts/test-consumer.mjs) is an executable example of packing, configuring a local core override, installing outside the workspace, and building both renderer-only and full-editor consumers. Run it with `pnpm test:consumer`.

## Host sizing and styles

Give the editor a definite height with `style`; its default is 720px. Percentage heights require a parent with a definite height. CSS Modules scope component selectors; there is no host-wide reset. `theme` accepts CSS properties/custom variables on the builder root, but token coverage is incomplete. The renderer accepts style/className on its root but has no complete theme-token API. Do not assume full white-label styling or localization APIs yet.
