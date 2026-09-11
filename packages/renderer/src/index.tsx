import {
  useId,
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  type Ref,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  SubmissionError,
  type FormRendererHandle,
  type SubmissionStatus,
} from "./controller";
export { SubmissionError, useFormRenderer } from "./controller";
export type {
  FormRendererHandle,
  SubmissionStatus,
  ServerFieldError,
} from "./controller";
import { useForm, Controller } from "react-hook-form";
import { Check, ArrowRight } from "lucide-react";
import {
  type FormDefinition,
  type FieldRegistry,
  emptyFieldRegistry,
  type Submission,
  validateSubmission,
  names,
  fieldColumnSpan,
  contentTypes,
  nameParts,
  addressParts,
  fieldsOnPage,
} from "@formcraft/core";
import s from "./renderer.module.css";
import type { RendererFieldAdapters } from './registry';
export type { RendererFieldAdapters, RendererFieldAdapter, CustomFieldInputProps } from './registry';
export interface FormRendererProps {
  registry?: FieldRegistry;
  adapters?: RendererFieldAdapters;
  schema: FormDefinition;
  onSubmit: (values: Submission) => Promise<void> | void;
  ref?: Ref<FormRendererHandle>;
  initialValues?: Submission;
  successTitle?: string;
  successMessage?: ReactNode;
  resetLabel?: string;
  onSuccess?: (values: Submission) => void;
  onError?: (error: unknown) => void;
  onValidationError?: (errors: Record<string, string>) => void;
  className?: string;
  style?: CSSProperties;
}
export function FormRenderer({
  registry = emptyFieldRegistry,
  adapters = {},
  schema,
  onSubmit,
  ref,
  initialValues,
  successTitle = "Message received.",
  successMessage = "Thanks for reaching out. We’ll be in touch soon.",
  resetLabel,
  onSuccess,
  onError,
  onValidationError,
  className,
  style,
}: FormRendererProps) {
  const instanceId = useId();
  for (const field of schema.fields.filter(f=>f.type==='custom')) {
    const entry=registry.get(field.customType ?? '');
    if(!entry || entry.version!==field.customVersion || adapters[entry.type]?.version!==entry.version) throw new Error(`Missing or incompatible renderer adapter: ${field.customType}`);
  }
  const formRef = useRef<HTMLFormElement>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const currentIndex = Math.min(pageIndex, (schema.pages?.length ?? 1) - 1);
  const page = schema.pages?.[currentIndex];
  const lastPage = currentIndex === (schema.pages?.length ?? 1) - 1;
  const visibleFields = fieldsOnPage(schema, page?.id);
  const focusField = (id: string) =>
    requestAnimationFrame(() =>
      formRef.current
        ?.querySelector<HTMLElement>(
          `[data-answer="${id}"] input, [data-answer="${id}"] textarea, [data-answer="${id}"] select`,
        )
        ?.focus(),
    );
  const focusPage = () => requestAnimationFrame(() => {
    // Do not steal focus if the respondent already started answering the new page.
    if (formRef.current?.contains(document.activeElement) && document.activeElement?.matches('input, textarea, select')) return;
    (formRef.current?.querySelector<HTMLElement>('[data-page-title]') ?? formRef.current?.querySelector<HTMLElement>('h1'))?.focus();
  });
  const {
    register,
    control,
    reset: resetAnswers,
    getValues,
    setValue,
    clearErrors,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Submission>({
    defaultValues: {
      ...Object.fromEntries(
        schema.fields
          .filter((f) => !contentTypes.includes(f.type))
          .map((f) => [
            f.id,
            f.type === "structured_name" || f.type === "structured_address"
              ? Object.fromEntries(
                  (f.type === "structured_name" ? nameParts : addressParts).map(
                    (p) => [p.key, ""],
                  ),
                )
              : ["checkboxes", "multiselect"].includes(f.type)
                ? []
                : f.type === "checkbox"
                  ? false
                  : (f.defaultValue ?? ""),
          ]),
      ),
      ...initialValues,
    },
  });
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [failure, setFailure] = useState("");
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const initial = useRef(structuredClone(getValues()));
  const reset = (values?: Submission) => {
    if (busy.current) return false;
    resetAnswers({ ...structuredClone(initial.current), ...values });
    setPageIndex(0);
    setFailure("");
    setStatus("idle");
    return true;
  };
  const revealField = (id: string) => {
    if (status === "success") return false;
    const field = schema.fields.find(
      (f) =>
        f.id === id && !contentTypes.includes(f.type) && f.type !== "hidden",
    );
    if (!field) return false;
    if (schema.pages)
      setPageIndex(
        Math.max(
          0,
          schema.pages.findIndex(
            (p) => p.id === (field.pageId ?? schema.pages![0].id),
          ),
        ),
      );
    focusField(id);
    return true;
  };
  useImperativeHandle(ref, () => ({
    submit: () => {
      if (!busy.current) formRef.current?.requestSubmit();
    },
    reset,
    getValues: () => structuredClone(getValues()),
    setValue: (id, value) => {
      if (
        busy.current ||
        !schema.fields.some(
          (f) =>
            f.id === id &&
            !contentTypes.includes(f.type) &&
            f.type !== "hidden",
        )
      )
        return false;
      setValue(id, value, { shouldDirty: true });
      clearErrors(id);
      return true;
    },
    focusField: revealField,
    getStatus: () => status,
  }));
  if (status === "success")
    return (
      <div
        className={[s.success, className].filter(Boolean).join(" ")}
        style={style}
        role="status"
      >
        <span>
          <Check size={26} />
        </span>
        <h2>{successTitle}</h2>
        <div>{successMessage}</div>
        {resetLabel && (
          <button
            type="button"
            className={s.back}
            onClick={() => {
              reset();
              focusPage();
            }}
          >
            {resetLabel}
          </button>
        )}
      </div>
    );
  return (
    <form
      ref={formRef}
      className={[s.form, className].filter(Boolean).join(" ")}
      style={style}
      aria-busy={status === "loading"}
      noValidate
      onSubmitCapture={() => {
        if (!busy.current) clearErrors();
      }}
      onSubmit={handleSubmit(async (values) => {
        if (busy.current) return;
        setFailure("");
        clearErrors();
        const issues = validateSubmission(
          lastPage ? schema : { ...schema, fields: visibleFields },
          values,
          registry,
        );
        if (Object.keys(issues).length) {
          onValidationError?.(issues);
          const first = Object.keys(issues)[0];
          const firstField = schema.fields.find((f) => f.id === first)!;
          if (schema.pages)
            setPageIndex(
              Math.max(
                0,
                schema.pages.findIndex(
                  (p) => p.id === (firstField.pageId ?? schema.pages![0].id),
                ),
              ),
            );
          focusField(first);
          Object.entries(issues).forEach(([id, message], index) =>
            setError(id, { message }, { shouldFocus: index === 0 }),
          );
          return;
        }
        if (!lastPage) {
          setPageIndex(currentIndex + 1);
          focusPage();
          return;
        }
        busy.current = true;
        setStatus("loading");
        try {
          await onSubmit(values);
          if (!mounted.current) return;
          setStatus("success");
        } catch (e) {
          if (!mounted.current) return;
          setFailure(
            e instanceof Error
              ? e.message
              : "Something went wrong. Please try again.",
          );
          if (e instanceof SubmissionError) {
            const entries = Object.entries(e.fieldErrors).filter(([id]) =>
              schema.fields.some(
                (f) =>
                  f.id === id &&
                  !contentTypes.includes(f.type) &&
                  f.type !== "hidden",
              ),
            );
            for (const [id, issue] of entries)
              setError(id, {
                type: typeof issue === "string" ? "server" : issue.code,
                message: typeof issue === "string" ? issue : issue.message,
              });
            if (entries.length) revealField(entries[0][0]);
          }
          setStatus("idle");
          onError?.(e);
          return;
        } finally {
          busy.current = false;
        }
        if (mounted.current) onSuccess?.(values);
      })}
    >
      <header>
        <h1 tabIndex={-1}>{schema.title}</h1>
        <p>{schema.description}</p>
      </header>
      {page && (
        <div className={s.pageHeading}>
          <p>
            Step {currentIndex + 1} of {schema.pages!.length}
          </p>
          <h2 tabIndex={-1} data-page-title>
            {page.title}
          </h2>
        </div>
      )}
      {visibleFields.map((f) => {
        const layout = {
          "--field-span": fieldColumnSpan(schema.fields, f),
        } as import("react").CSSProperties;
        const label = f.label.trim() || names[f.type];
        if (f.type === "divider")
          return <hr key={f.id} className={s.divider} style={layout} />;
        if (f.type === "heading" || f.type === "section")
          return (
            <section key={f.id} className={s.content} style={layout}>
              <h2>{label}</h2>
              {f.description && <p>{f.description}</p>}
            </section>
          );
        if (f.type === "paragraph")
          return (
            <section key={f.id} className={s.content} style={layout}>
              <p>{label}</p>
              {f.description && <p>{f.description}</p>}
            </section>
          );
        if (f.type === "hidden")
          return (
            <input
              key={f.id}
              type="hidden"
              {...register(f.id)}
              value={f.defaultValue ?? ""}
            />
          );
        const id = `${instanceId}-input-${f.id}`,
          help = `${instanceId}-help-${f.id}`;
        const group = f.type === "radio" || f.type === "checkboxes";
        const common = {
          disabled: status === "loading",
          "aria-required": f.required,
          "aria-invalid": !!errors[f.id],
          "aria-describedby": help,
        };
        const feedback = (
          <div id={help}>
            {f.description && <p>{f.description}</p>}
            {errors[f.id] && (
              <p className={s.error} role="alert">
                {String(errors[f.id]?.message ?? "")}
              </p>
            )}
          </div>
        );
        if (f.type === 'custom') {
          const Input = adapters[f.customType!]!.Input;
          return <div key={f.id} data-answer={f.id} className={s.field} style={layout}>
            <label htmlFor={id}>{label}{f.required && <span className={s.required}> *</span>}</label>
            <Controller name={f.id} control={control} render={({field: answer})=><Input field={f} id={id} name={answer.name} value={answer.value ?? ''} onChange={answer.onChange} onBlur={answer.onBlur} inputRef={answer.ref} disabled={status === 'loading'} required={f.required} invalid={!!errors[f.id]} describedBy={help}/>}/>
            {feedback}
          </div>;
        }
        if (f.type === "structured_name" || f.type === "structured_address") {
          const parts = f.type === "structured_name" ? nameParts : addressParts;
          return (
            <fieldset
              key={f.id}
              data-answer={f.id}
              className={s.field}
              style={layout}
              aria-describedby={help}
            >
              <legend>
                {label}
                {f.required && <span className={s.required}> *</span>}
              </legend>
              <div className={s.compound}>
                {parts.map((part) => (
                  <label key={part.key} htmlFor={`${id}-${part.key}`}>
                    {part.label}
                    <input
                      id={`${id}-${part.key}`}
                      disabled={status === "loading"}
                      autoComplete={part.autoComplete}
                      {...register(`${f.id}.${part.key}`)}
                      aria-describedby={help}
                      aria-invalid={!!errors[f.id]}
                      aria-required={
                        f.required && !["line2", "region"].includes(part.key)
                      }
                    />
                  </label>
                ))}
              </div>
              {feedback}
            </fieldset>
          );
        }
        if (f.type === "rating")
          return (
            <fieldset
              key={f.id}
              data-answer={f.id}
              className={s.field}
              style={layout}
              aria-describedby={help}
            >
              <legend>
                {label}
                {f.required && <span className={s.required}> *</span>}
              </legend>
              <div className={s.rating}>
                {Array.from({ length: f.ratingMax ?? 5 }, (_, i) => (
                  <label key={i}>
                    <input
                      disabled={status === "loading"}
                      type="radio"
                      value={String(i + 1)}
                      {...register(f.id)}
                      aria-label={`${i + 1} out of ${f.ratingMax ?? 5}`}
                      aria-describedby={help}
                    />
                    <span>{i + 1}</span>
                  </label>
                ))}
              </div>
              {feedback}
            </fieldset>
          );
        if (group)
          return (
            <fieldset
              data-answer={f.id}
              className={s.field}
              style={layout}
              key={f.id}
              aria-describedby={help}
              aria-invalid={!!errors[f.id]}
            >
              <legend>
                {label}
                {f.required && <span className={s.required}> *</span>}
              </legend>
              <div className={s.choices}>
                {f.options.map((o, i) => (
                  <label key={o.value} htmlFor={`${id}-${i}`}>
                    <input
                      id={`${id}-${i}`}
                      disabled={status === "loading"}
                      type={f.type === "radio" ? "radio" : "checkbox"}
                      value={o.value}
                      {...register(f.id)}
                      aria-describedby={help}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              {feedback}
            </fieldset>
          );
        return (
          <div data-answer={f.id} className={s.field} style={layout} key={f.id}>
            <label htmlFor={id}>
              {f.type === "checkbox" && (
                <input
                  id={id}
                  type="checkbox"
                  {...common}
                  {...register(f.id)}
                />
              )}{" "}
              {label}
              {f.required && <span className={s.required}> *</span>}
            </label>
            {f.type !== "checkbox" &&
              (["textarea", "address"].includes(f.type) ? (
                <textarea
                  id={id}
                  rows={f.type === "address" ? 3 : 4}
                  autoComplete={
                    f.type === "address" ? "street-address" : undefined
                  }
                  placeholder={f.placeholder}
                  {...register(f.id)}
                  {...common}
                />
              ) : f.type === "dropdown" || f.type === "multiselect" ? (
                <>
                  <select
                    id={id}
                    multiple={f.type === "multiselect"}
                    {...register(f.id)}
                    {...common}
                  >
                    {f.type === "dropdown" && (
                      <option value="">
                        {f.placeholder || "Select an option"}
                      </option>
                    )}
                    {f.options.map((o) => (
                      <option value={o.value} key={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {f.type === "multiselect" && (
                    <p>
                      Choose one or more. On a keyboard, hold Ctrl or Command to
                      select multiple options.
                    </p>
                  )}
                </>
              ) : (
                <input
                  id={id}
                  type={
                    f.type === "phone"
                      ? "tel"
                      : f.type === "name"
                        ? "text"
                        : f.type
                  }
                  autoComplete={
                    f.type === "name"
                      ? "name"
                      : f.type === "password"
                        ? "new-password"
                        : undefined
                  }
                  step={f.type === "number" ? "any" : undefined}
                  placeholder={f.placeholder}
                  {...register(f.id)}
                  {...common}
                />
              ))}
            {feedback}
          </div>
        );
      })}
      {failure && (
        <p role="alert" className={s.error}>
          {failure}
        </p>
      )}
      <div className={s.navigation}>
        {schema.pages && currentIndex > 0 && (
          <button
            type="button"
            className={s.back}
            disabled={status === "loading"}
            onClick={() => {
              setPageIndex(currentIndex - 1);
              clearErrors();
              focusPage();
            }}
          >
            {schema.backLabel || "Back"}
          </button>
        )}
        <button disabled={status === "loading"} className={s.submit}>
          {status === "loading"
            ? "Sending…"
            : lastPage
              ? schema.submitLabel
              : schema.nextLabel || "Next"}
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
