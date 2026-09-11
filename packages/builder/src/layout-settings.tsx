import { useState } from "react";
import { placeField, fieldColumnSpan, type Field } from "@formcraft/core";
import s from "./builder.module.css";

/** Preview-first layout changes share the same placement function as drag/drop. */
export function LayoutSettings({
  defaultPageId,
  field,
  fields,
  onApply,
}: {
  defaultPageId?: string;
  field: Field;
  fields: Field[];
  onApply: (fields: Field[]) => void;
}) {
  const [targetId, setTargetId] = useState("");
  const [position, setPosition] = useState<
    "before" | "after" | "left" | "right"
  >("right");
  const targets = fields.filter(
    (f) =>
      f.id !== field.id &&
      (f.pageId ?? defaultPageId) === (field.pageId ?? defaultPageId) &&
      f.type !== "hidden",
  );
  const target = targets.find((f) => f.id === targetId) ?? targets[0];
  const next = target ? placeField(fields, field, target.id, position) : fields;
  const preview = next.filter(
    (f) =>
      f.id === field.id ||
      (next.find((x) => x.id === field.id)?.columnGroup &&
        f.columnGroup === next.find((x) => x.id === field.id)?.columnGroup),
  );
  return (
    <section className={s.layoutSettings} aria-label="Field layout">
      <h3>Layout</h3>
      <p>Choose a position, review the row, then apply.</p>
      {targets.length > 0 && (
        <>
          <label>
            Relative to
            <select
              value={target?.id ?? ""}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {targets.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label || "Untitled field"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Position
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as typeof position)}
            >
              <option value="before">Own row above</option>
              <option value="after">Own row below</option>
              <option value="left">Column on the left</option>
              <option value="right">Column on the right</option>
            </select>
          </label>
          <div className={s.layoutPreview} aria-label="Row preview">
            {preview.map((f) => (
              <span
                key={f.id}
                data-selected={f.id === field.id}
                style={{ gridColumn: `span ${fieldColumnSpan(next, f)}` }}
              >
                {f.label || "Untitled field"}
              </span>
            ))}
          </div>
          {next === fields && (
            <p role="status">
              This row already has three columns. Choose another row or
              position.
            </p>
          )}
          <button
            type="button"
            disabled={next === fields}
            onClick={() => onApply(next)}
          >
            Apply layout
          </button>
        </>
      )}
      {field.columnGroup && (
        <button
          type="button"
          onClick={() =>
            onApply(
              placeField(
                fields,
                field,
                fields.find(
                  (f) =>
                    f.columnGroup === field.columnGroup && f.id !== field.id,
                )?.id,
                "after",
              ),
            )
          }
        >
          Move to own row
        </button>
      )}
      {!targets.length && <p>Add another field to create columns.</p>}
    </section>
  );
}
