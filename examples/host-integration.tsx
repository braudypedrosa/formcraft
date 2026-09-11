import { useCallback, useRef, useState } from 'react';
import { contactForm, exportForm, importForm, type FormDefinition, type Submission } from '@formcraft/core';
import { FormBuilder } from '@formcraft/builder';
import { FormRenderer } from '@formcraft/renderer';
import '@formcraft/builder/style.css';
import '@formcraft/renderer/style.css';

/** Application-owned example; not a Formcraft package export.
 * Keep storageKey stable, or remount the host when changing documents.
 * Use in a client-rendered application. Store definitions, never answers.
 */
export function useFormcraftDraft(storageKey: string) {
  const [initial] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return { schema: saved ? importForm(saved) : contactForm(), error: '' };
    } catch {
      return { schema: contactForm(), error: 'Saved draft could not be loaded. Editing will replace it.' };
    }
  });
  const [schema, setSchema] = useState(initial.schema);
  const [status, setStatus] = useState(initial.error || 'Local draft');
  const onChange = useCallback((next: FormDefinition) => {
    setSchema(next);
    try {
      localStorage.setItem(storageKey, exportForm(next));
      setStatus('Saved in this browser');
    } catch {
      setStatus('Could not save. Export JSON to keep your changes.');
    }
  }, [storageKey]);
  return { schema, onChange, status };
}

/** endpoint/revision are supplied by the host. No endpoint is built into Formcraft. */
export function HostIntegration({ endpoint, revision }: { endpoint: string; revision: string }) {
  const { schema, onChange, status } = useFormcraftDraft('formcraft:example:draft');
  const [preview, setPreview] = useState(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null);

  async function submit(values: Submission) {
    const payload = JSON.stringify({ formId: schema.id, revision, values });
    if (attempt.current?.payload !== payload) {
      attempt.current = { payload, id: crypto.randomUUID() };
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: schema.id, revision, values, submissionId: attempt.current.id }),
    });
    // Add your host's authentication/CSRF headers as required by its endpoint.
    const result: unknown = await response.json().catch(() => null);
    if (!response.ok || !result || typeof result !== 'object' || !('ok' in result) || result.ok !== true) {
      throw new Error('Your submission could not be accepted. Please try again.');
    }
    attempt.current = null;
  }

  return <>
    <div hidden={preview}>
      <FormBuilder value={schema} onChange={onChange} status={status}
        onPreview={() => setPreview(true)} style={{ height: 720 }} />
    </div>
    {preview && <section aria-label="Form preview">
      <button onClick={() => setPreview(false)}>Return to editor</button>
      <FormRenderer schema={schema} onSubmit={submit} />
    </section>}
  </>;
}
