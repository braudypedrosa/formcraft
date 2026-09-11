import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  Monitor,
  Smartphone,
  RotateCcw,
  Layers2,
} from "lucide-react";
import { FormBuilder } from "@formcraft/builder";
import { FormRenderer, SubmissionError, useFormRenderer } from "@formcraft/renderer";
import {
  contactForm,
  importForm,
  exportForm,
  type FormDefinition,
} from "@formcraft/core";
import "@formcraft/builder/style.css";
import "@formcraft/renderer/style.css";
import "./playground.css";
import { exampleRegistry } from './custom-fields/reference';
import { exampleBuilderAdapters, exampleRendererAdapters } from './custom-fields/adapters';
const storageKey = new URLSearchParams(location.search).has("qa")
  ? "formcraft-qa-draft"
  : "formcraft-draft";
function App() {
  const [schema, setSchema] = useState<FormDefinition>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? importForm(saved, exampleRegistry) : contactForm();
    } catch {
      return contactForm();
    }
  });
  const [preview, setPreview] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [simulateError, setSimulateError] = useState(false);
  const [simulateFieldError, setSimulateFieldError] = useState(false);
  const renderer = useFormRenderer();
  const [storageError, setStorageError] = useState(false);
  return (
    <>
      <div hidden={preview}>
        <FormBuilder
          registry={exampleRegistry}
          adapters={exampleBuilderAdapters}
          style={{ height: "100dvh", minHeight: 480 }}
          status={
            storageError
              ? "Local draft could not be saved"
              : "Changes kept in this browser"
          }
          value={schema}
          onChange={(next) => {
            setSchema(next);
            try {
              localStorage.setItem(storageKey, exportForm(next, exampleRegistry));
              setStorageError(false);
            } catch {
              setStorageError(true);
            }
          }}
          onPreview={() => {
            setAttempt((n) => n + 1);
            setPreview(true);
          }}
        />
      </div>
      {storageError && (
        <div role="alert" className="storage-warning">
          Local draft could not be saved. Export JSON to keep your changes.
        </div>
      )}
      {preview && (
        <div className="preview-shell">
          <header className="preview-bar">
            <button onClick={() => setPreview(false)}>
              <ArrowLeft size={16} />
              Back to builder
            </button>
            <div className="device-switch">
              <button
                aria-label="Desktop preview"
                aria-pressed={!mobile}
                onClick={() => setMobile(false)}
              >
                <Monitor size={17} />
              </button>
              <button
                aria-label="Mobile preview"
                aria-pressed={mobile}
                onClick={() => setMobile(true)}
              >
                <Smartphone size={17} />
              </button>
            </div>
            <span>PREVIEW</span>
          </header>
          <div className={`preview-paper ${mobile ? "mobile" : ""}`}>
            <FormRenderer
              registry={exampleRegistry}
              adapters={exampleRendererAdapters}
              key={attempt}
              ref={renderer}
              resetLabel="Fill out another form"
              schema={schema}
              onSubmit={async () => {
                await new Promise((r) => setTimeout(r, 900));
                if (simulateFieldError) {
                  const field = schema.fields.find(f => !['heading','paragraph','section','divider','hidden'].includes(f.type));
                  if (field) throw new SubmissionError('Please review your answer.', {[field.id]: {code:'demo_rejection', message:'This is a simulated server field error. Turn it off below and retry.'}});
                }
                if (simulateError)
                  throw new Error(
                    "Your message could not be sent. Please try again.",
                  );
              }}
            />
          </div>
          <div className="preview-tools">
            <label>
              <input
                type="checkbox"
                checked={simulateError}
                onChange={(e) => setSimulateError(e.target.checked)}
              />
              Simulate submission error
            </label>
            <label><input type="checkbox" checked={simulateFieldError} onChange={e=>setSimulateFieldError(e.target.checked)}/>Simulate server field error</label>
            <button onClick={() => renderer.current?.reset()}>
              <RotateCcw size={13} />
              Reset preview
            </button>
          </div>
          <p className="preview-note">
            <Layers2 size={12} />
            This is a local preview. No information is sent.
          </p>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
