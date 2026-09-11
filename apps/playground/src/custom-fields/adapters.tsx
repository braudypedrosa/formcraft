import type { BuilderFieldAdapters } from "@formcraft/builder";
import type { RendererFieldAdapters } from "@formcraft/renderer";
export const exampleBuilderAdapters: BuilderFieldAdapters = {
  "demo.reference": {
    version: 1,
    Preview: ({ field }) => (
      <span
        style={{
          display: "block",
          border: "1px solid #c9cdd3",
          borderRadius: 4,
          padding: "12px",
          marginTop: 10,
          color: "#64606a",
        }}
      >
        {field.placeholder || `${field.config?.prefix}-0000`}
      </span>
    ),
    Settings: ({ field, onChange }) => (
      <label>
        Reference prefix
        <select
          value={String(field.config?.prefix)}
          onChange={(e) => onChange({ prefix: e.target.value })}
        >
          <option value="FC">FC</option>
          <option value="REF">REF</option>
        </select>
      </label>
    ),
  },
};
export const exampleRendererAdapters: RendererFieldAdapters = {
  "demo.reference": {
    version: 1,
    Input: ({
      id,
      name,
      value,
      onChange,
      onBlur,
      inputRef,
      disabled,
      required,
      invalid,
      describedBy,
      field,
    }) => (
      <input
        id={id}
        name={name}
        ref={inputRef}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-required={required}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        placeholder={field.placeholder || `${field.config?.prefix}-0000`}
        autoComplete="off"
      />
    ),
  },
};
