import { pointerIntersection } from "@dnd-kit/collision";
import { useId, useEffect, useRef, useState, type CSSProperties, type Ref, useImperativeHandle } from "react";
import { useStore } from "zustand";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Download,
  Eye,
  FileJson,
  GripVertical,
  Layers2,
  Mail,
  Plus,
  Redo2,
  Settings2,
  Trash2,
  Type,
  Undo2,
  X,
  AlignLeft,
  Phone,
  SquareCheck,
  Hash,
  CalendarDays,
  Clock3,
  Globe,
  CircleDot,
  ListChecks,
  ListFilter,
  Search,
  UserRound, MapPin, LockKeyhole, EyeOff, Heading, Pilcrow,
} from "lucide-react";
import {
  type Field,
  type FieldRegistry,
  emptyFieldRegistry,
  createCustomField,
  createFormSchema,
  type FieldType,
  type FormDefinition,
  createField,
  contactForm,
  emptyForm,
  fieldTypes,
  fieldGroups,
  names,
  importForm,
  exportForm,
  placeField, normalizeColumns, fieldColumnSpan, fieldsOnPage, nameParts, addressParts, contentTypes,
} from "@formcraft/core";
import { createEditorStore } from "./store";
import s from "./builder.module.css";
import type { FormBuilderHandle } from "./controller";
export { useFormBuilder } from "./controller";
export type { FormBuilderHandle } from "./controller";
import { LayoutSettings } from "./layout-settings";
export type { BuilderFieldAdapter, BuilderFieldAdapters } from "./registry";
import type { BuilderFieldAdapters } from "./registry";
const icons = {
  custom: Type,
  section: Layers2, divider: AlignLeft, structured_name: UserRound, structured_address: MapPin, rating: Hash,
  text: Type,
  email: Mail,
  phone: Phone,
  textarea: AlignLeft,
  dropdown: ChevronDown,
  checkbox: SquareCheck,
  number: Hash,
  radio: CircleDot,
  checkboxes: ListChecks,
  multiselect: ListFilter,
  date: CalendarDays,
  time: Clock3,
  url: Globe,
  name: UserRound, address: MapPin, password: LockKeyhole, hidden: EyeOff, heading: Heading, paragraph: Pilcrow,
};
export interface FormBuilderProps {
  ref?: Ref<FormBuilderHandle>;
  registry?: FieldRegistry;
  adapters?: BuilderFieldAdapters;
  value: FormDefinition;
  onChange: (value: FormDefinition) => void;
  onPreview?: () => void;
  theme?: CSSProperties;
  status?: string;
  /** Size and position the editor within its host container. */
  style?: CSSProperties;
  className?: string;
}
export function FormBuilder({
  ref,
  registry = emptyFieldRegistry,
  adapters = {},
  value,
  onChange,
  onPreview,
  theme,
  status,
  style,
  className,
}: FormBuilderProps) {
  const [store] = useState(() => createEditorStore(value));
  const state = useStore(store);
  const doc = state.document;
  // Fail closed before rendering/editing a field without matching adapters.
  for (const custom of doc.fields.filter(f => f.type === 'custom')) {
    const entry = registry.get(custom.customType ?? '');
    if (!entry || custom.customVersion !== entry.version || adapters[entry.type]?.version !== entry.version) throw new Error(`Missing or incompatible builder adapter: ${custom.customType}`);
  }
  const parseForEditor = (json:string) => {
    const next=importForm(json,registry);
    for(const field of next.fields.filter(f=>f.type==='custom')) if(adapters[field.customType!]?.version!==field.customVersion) throw new Error(`Missing or incompatible builder adapter: ${field.customType}`);
    return next;
  };
  const customTypes = registry.list().filter(entry => adapters[entry.type]?.version === entry.version);
  const [pageId, setPageId] = useState<string | undefined>();
  const activePage = doc.pages?.find(p=>p.id===pageId)?.id ?? doc.pages?.[0]?.id;
  const visibleFields = fieldsOnPage(doc, activePage);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const lastSelection = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!root.current) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      if (width > 0) setNarrow(width <= 1100);
    });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (
      value !== lastEmitted.current &&
      JSON.stringify(value) !== JSON.stringify(store.getState().document)
    ) {
      store.getState().replace(value);
      setSelected(null);
    }
  }, [value, store]);
  useEffect(() => {
    if (doc !== lastEmitted.current) {
      lastEmitted.current = doc;
      onChangeRef.current(doc);
    }
  }, [doc]);
  useEffect(() => {
    if (selected)
      lastSelection.current =
        root.current?.querySelector<HTMLButtonElement>(
          `[data-field-id="${selected}"]`,
        ) ?? lastSelection.current;
  }, [selected, doc.fields]);
  const field = doc.fields.find((f) => f.id === selected);
  const patch = (data: Partial<FormDefinition>, group?: string) =>
    state.commit({ ...doc, version:2, ...data, ...(data.fields ? {fields: normalizeColumns(data.fields)} : {}) }, group);
  const edit = (data: Partial<Field>, key?: string) =>
    field &&
    patch(
      {
        fields: doc.fields.map((f) =>
          f.id === field.id ? { ...f, ...data } : f,
        ),
      },
      key ? `${field.id}:${key}` : undefined,
    );
  const select = (id: string) => {
    state.end();
    setSelected(id);
    setSettings(false);
  };
  const add = (type: FieldType, position = insertAt ?? doc.fields.length) => {
    const f = {...createField(type), ...(activePage ? {pageId: activePage} : {})};
    const fields = [...doc.fields];
    fields.splice(position, 0, f);
    patch({ fields });
    setInsertAt(null);
    select(f.id);
    setAnnouncement(`${names[type]} added`);
  };
  const addCustom = (type: string) => {
    const current = store.getState().document;
    const incoming = {...createCustomField(type, registry), ...(activePage ? {pageId:activePage} : {})};
    if (adapters[type]?.version !== incoming.customVersion) throw new Error(`Missing builder adapter: ${type}`);
    const fields = [...current.fields]; fields.splice(insertAt ?? fields.length, 0, incoming);
    store.getState().commit({...current, version:2, fields:normalizeColumns(fields)});
    setInsertAt(null); select(incoming.id); setAnnouncement(`${incoming.label} added`);
  };
  const shift = (id: string, delta: number) => {
    const fields = [...doc.fields];
    const i = fields.findIndex((f) => f.id === id);
    if (i + delta < 0 || i + delta >= fields.length || (fields[i+delta].pageId ?? doc.pages?.[0]?.id) !== activePage) return;
    const [f] = fields.splice(i, 1);
    fields.splice(i + delta, 0, f);
    patch({ fields });
    setAnnouncement(`${f.label} moved to position ${i + delta + 1}`);
  };
  const remove = () => {
    if (!field) return;
    const i = doc.fields.indexOf(field);
    patch({ fields: doc.fields.filter((f) => f.id !== field.id) });
    setSelected(null);
    setAnnouncement(`${field.label} deleted. Undo is available.`);
    requestAnimationFrame(() =>
      root.current
        ?.querySelector<HTMLButtonElement>(
          `[data-select-index="${Math.max(0, i - 1)}"]`,
        )
        ?.focus(),
    );
  };
  const duplicate = () => {
    if (!field) return;
    const copy = {
      ...structuredClone(field),
      id: crypto.randomUUID(),
      label: `${field.label} (copy)`,
    };
    const fields = [...doc.fields];
    fields.splice(fields.indexOf(field) + 1, 0, copy);
    patch({ fields });
    select(copy.id);
  };
  const addPage = () => {
    const pages = doc.pages ?? [{id:crypto.randomUUID(),title:'Page 1'}];
    const next = {id:crypto.randomUUID(),title:`Page ${pages.length + 1}`};
    patch({pages:[...pages,next],fields:doc.fields.map(f=>({...f,pageId:f.pageId ?? pages[0].id}))});
    setPageId(next.id); setSelected(null); setSettings(false);
  };
  const removePage = () => {
    if (!doc.pages || doc.pages.length < 2) return;
    const remaining = doc.pages.filter(p=>p.id!==activePage);
    const destination = remaining[Math.max(0, doc.pages.findIndex(p=>p.id===activePage)-1)].id;
    patch({pages:remaining,fields:doc.fields.map(f=>(f.pageId ?? doc.pages![0].id)===activePage ? {...f,pageId:destination,columnGroup:undefined}:f)});
    setPageId(destination);setSelected(null);
  };
  const closeInspector = () => {
    setSelected(null);
    setSettings(false);
    requestAnimationFrame(() => lastSelection.current?.focus());
  };
  useImperativeHandle(ref, () => ({
    getState: () => ({ document: structuredClone(store.getState().document), selectedFieldId: field?.id ?? null, canUndo: store.getState().past.length > 0, canRedo: store.getState().future.length > 0 }),
    selectField: (id) => {
      if (id === null) { closeInspector(); return true; }
      const target = doc.fields.find(f => f.id === id);
      if (!target) return false;
      setPageId(target.pageId ?? doc.pages?.[0]?.id); select(id); return true;
    },
    addField: (type) => {
      if (!fieldTypes.includes(type)) throw new Error('Unknown field type');
      const current = store.getState().document;
      const page = current.pages?.find(p => p.id === activePage)?.id ?? current.pages?.[0]?.id;
      const incoming = {...createField(type), ...(page ? {pageId:page} : {})};
      store.getState().commit({...current, fields:[...current.fields, incoming]});
      select(incoming.id); setAnnouncement(`${names[type]} added`);
    },
    undo: () => store.getState().undo(),
    redo: () => store.getState().redo(),
    addCustomField: addCustom,
    exportJSON: () => exportForm(store.getState().document, registry),
    importJSON: (json) => { const next = parseForEditor(json); store.getState().replace(next); setSelected(null); setPageId(undefined); },
  }));
  const inspector = (
    <>
      <div className={s.inspectorTitle}>
        <span>{field ? "Field settings" : "Form settings"}</span>
        <button
          className={s.iconButton}
          aria-label="Close settings"
          onClick={closeInspector}
        >
          <X size={17} />
        </button>
      </div>
      {field ? (
        <>
          <div className={s.typeBadge}>
            {(() => {
              const Icon = icons[field.type];
              return <Icon size={17} />;
            })()}
            <span>{names[field.type]}</span>
            <span className={s.smallId}>
              FIELD {String(doc.fields.indexOf(field) + 1).padStart(2, "0")}
            </span>
          </div>
          <div className={s.properties}>
            <label>
              Label
              <input
                value={field.label}
                onChange={(e) => edit({ label: e.target.value }, "label")}
                onBlur={state.end}
              />
            </label>
            <label>
              Description
              <textarea
                rows={3}
                value={field.description}
                placeholder="Add a little context…"
                onChange={(e) =>
                  edit({ description: e.target.value }, "description")
                }
                onBlur={state.end}
              />
              <span>Shown below the field.</span>
            </label>
            {![
              "hidden", "heading", "paragraph", "section", "divider", "structured_name", "structured_address", "rating",
              "checkbox",
              "radio",
              "checkboxes",
              "date",
              "time",
              "multiselect",
            ].includes(field.type) && (
              <label>
                Placeholder
                <input
                  value={field.placeholder}
                  placeholder="An example answer…"
                  onChange={(e) =>
                    edit({ placeholder: e.target.value }, "placeholder")
                  }
                  onBlur={state.end}
                />
              </label>
            )}
            {field.type === 'custom' && (() => {
              const Settings = adapters[field.customType!]?.Settings;
              return Settings ? <Settings field={field} onChange={config => {
                const updated = {...doc,version:2 as const,fields:doc.fields.map(f => f.id === field.id ? {...f, config} : f)};
                const result = createFormSchema(registry).safeParse(updated);
                if (result.success) {patch({fields:result.data.fields});setAnnouncement('Custom field settings updated');}
                else setAnnouncement(result.error.issues.map(i=>i.message).join('. '));
              }}/> : null;
            })()}
            {field.type === "rating" && <label>Rating scale<select value={field.ratingMax ?? 5} onChange={e=>edit({ratingMax:Number(e.target.value)})}>{Array.from({length:8},(_,i)=>i+3).map(n=><option key={n} value={n}>{n} points</option>)}</select></label>}
            {doc.pages && <label>Page<select value={field.pageId ?? doc.pages[0].id} onChange={e=>{const next=e.target.value; edit({pageId:next,columnGroup:undefined});setPageId(next);}}>{doc.pages.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
            {field.type === "hidden" && <label>Default value<input value={field.defaultValue ?? ""} onChange={e => edit({defaultValue: e.target.value}, "defaultValue")} onBlur={state.end}/><span>Included in submissions. Not displayed to respondents.</span></label>}
            {![...contentTypes, "hidden"].includes(field.type) && <div className={s.requiredSetting}>
              <div>
                <b>Required field</b>
                <p>Must be completed to submit.</p>
              </div>
              <button
                role="switch"
                aria-checked={field.required}
                aria-label="Required field"
                className={s.toggle}
                data-on={field.required}
                onClick={() => edit({ required: !field.required })}
              >
                <span />
              </button>
            </div>}
            {["dropdown", "radio", "checkboxes", "multiselect"].includes(
              field.type,
            ) && (
              <div className={s.options}>
                <b>Options</b>
                {field.options.map((o, i) => (
                  <div key={i}>
                    <input
                      aria-label={`Option ${i + 1}`}
                      value={o.label}
                      onBlur={state.end}
                      onChange={(e) =>
                        edit(
                          {
                            options: field.options.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          },
                          `option-${i}`,
                        )
                      }
                    />
                    <button
                      disabled={field.options.length === 1}
                      aria-label={`Remove option ${i + 1}`}
                      className={s.iconButton}
                      onClick={() =>
                        edit({
                          options: field.options.filter((_, j) => i !== j),
                        })
                      }
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className={s.textButton}
                  onClick={() =>
                    edit({
                      options: [
                        ...field.options,
                        { label: "New option", value: crypto.randomUUID() },
                      ],
                    })
                  }
                >
                  <Plus size={14} />
                  Add option
                </button>
              </div>
            )}
          </div>
          <div className={s.arrange}>
            <span>ARRANGE</span>
            <div>
              <button
                disabled={visibleFields[0]?.id === field.id}
                onClick={() => shift(field.id, -1)}
              >
                <ArrowUp size={15} />
                Move up
              </button>
              <button
                disabled={visibleFields.at(-1)?.id === field.id}
                onClick={() => shift(field.id, 1)}
              >
                <ArrowDown size={15} />
                Move down
              </button>
            </div>
            <LayoutSettings key={field.id} defaultPageId={doc.pages?.[0]?.id} field={field} fields={doc.fields} onApply={fields => { patch({fields}); setAnnouncement('Field layout updated. Undo is available.'); }} />
            <button onClick={duplicate}>
              <Copy size={15} />
              Duplicate field
            </button>
            <button className={s.danger} onClick={remove}>
              <Trash2 size={15} />
              Delete field
            </button>
          </div>
        </>
      ) : (
        <div className={s.properties}>
          <label>
            Form title
            <input
              value={doc.title}
              onChange={(e) => patch({ title: e.target.value }, "title")}
              onBlur={state.end}
            />
          </label>
          <label>
            Description
            <textarea
              rows={3}
              value={doc.description}
              onChange={(e) =>
                patch({ description: e.target.value }, "description")
              }
              onBlur={state.end}
            />
          </label>
          {doc.pages && <><label>Next button<input value={doc.nextLabel ?? 'Next'} onChange={e=>patch({nextLabel:e.target.value}, 'nextLabel')} onBlur={state.end}/></label><label>Back button<input value={doc.backLabel ?? 'Back'} onChange={e=>patch({backLabel:e.target.value}, 'backLabel')} onBlur={state.end}/></label></>}
          <label>
            Submit button
            <input
              value={doc.submitLabel}
              onChange={(e) =>
                patch({ submitLabel: e.target.value }, "submitLabel")
              }
              onBlur={state.end}
            />
          </label>
        </div>
      )}
    </>
  );
  return (
    <DragDropProvider
      onDragStart={(event) => {setDragging(true); setDragId(String(event.operation.source?.id ?? ""));}}
      onDragEnd={(event) => {
        setDragging(false);
        setDragId(null);
        if (event.canceled) return;
        const source = event.operation.source;
        const target = event.operation.target;
        if (!source || !target) return;
        const type = source.data?.fieldType as FieldType | undefined;
        const incoming = source.data?.customType ? createCustomField(String(source.data.customType), registry) : type ? {...createField(type), ...(activePage ? {pageId:activePage} : {})} : doc.fields.find(f => f.id === source.id);
        if (!incoming) return;
        const [position, targetId] = String(target.id).split(':');
        const fields = placeField(doc.fields, {...incoming, pageId:activePage}, targetId || undefined, position as 'before'|'after'|'left'|'right');
        patch({fields});
        setAnnouncement(fields === doc.fields ? "This row already has three columns" : "Field placed");
      }}
    >
    <div
      data-drag-active={dragging}
      ref={root}
      className={[s.root, className].filter(Boolean).join(" ")}
      style={{ ...theme, ...style }}
      onKeyDown={(e) => {
        if (
          (e.metaKey || e.ctrlKey) &&
          e.key.toLowerCase() === "z" &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)
        ) {
          e.preventDefault();
          e.shiftKey ? state.redo() : state.undo();
        }
      }}
    >
      <div className={s.subbar} role="toolbar" aria-label="Form editing tools">
        <div>
          <button
            className={s.textButton}
            onClick={(e) => {
              lastSelection.current = e.currentTarget;
              setSelected(null);
              setSettings(true);
            }}
          >
            <Settings2 size={14} />
            Form settings
          </button>
        </div>
        <button
          className={`${s.secondary} ${s.mobileTools}`}
          onClick={() => setInsertAt(doc.fields.length)}
        >
          <Plus size={16} />
          Add fields
        </button>
        <div className={s.topActions}>
          <button
            className={s.iconButton}
            title="Undo (⌘Z)"
            aria-label="Undo"
            disabled={!state.past.length}
            onClick={state.undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            className={s.iconButton}
            title="Redo (⇧⌘Z)"
            aria-label="Redo"
            disabled={!state.future.length}
            onClick={state.redo}
          >
            <Redo2 size={18} />
          </button>
          <i />
          <button
            aria-label="JSON"
            className={s.secondary}
            onClick={() => {
              setJson(JSON.stringify(doc, null, 2));
              setError("");
              setJsonOpen(true);
            }}
          >
            <FileJson size={16} />
            <span>JSON</span>
          </button>
          {onPreview && <button className={s.primary} onClick={onPreview}>
            <Eye size={16} />
            Preview
          </button>}
        </div>
      </div>
      <div className={s.pageBar}>
        {doc.pages ? <><nav aria-label="Form pages">{doc.pages.map((p,i)=><button key={p.id} aria-current={p.id===activePage ? 'page':undefined} onClick={()=>{setPageId(p.id);setSelected(null);setSettings(false);}}>{i+1}. {p.title}</button>)}</nav><label>Page name<input aria-label="Page name" value={doc.pages.find(p=>p.id===activePage)?.title ?? ''} onChange={e=>patch({pages:doc.pages!.map(p=>p.id===activePage?{...p,title:e.target.value}:p)}, `page-${activePage}`)} onBlur={state.end}/></label><button onClick={removePage} disabled={doc.pages.length<2} title="Moves this page's fields to the previous page">Remove page</button></> : <span>Single-page form</span>}
        <button onClick={addPage}><Plus size={14}/> Add page</button>
      </div>
      <div className={s.workspace}>
        <aside className={s.toolbox} aria-label="Field toolbox">
          <FieldToolbox customTypes={customTypes} onAddCustom={addCustom} onAdd={(type) => add(type, doc.fields.length)} />
        </aside>
        <main className={s.canvas}>
          <div className={s.canvasMeta}>
            <span>FORM CANVAS</span>
            <span>
              {visibleFields.length} fields <span className={s.dot} /> {doc.pages ? `Page ${doc.pages.findIndex(p=>p.id===activePage)+1} of ${doc.pages.length}` : "Single page"}
            </span>
          </div>
          <div className={s.paper}>
            <DropTarget id="after:" position="empty"/>
            <button
              className={s.formHeading}
              onClick={(e) => {
                lastSelection.current = e.currentTarget;
                setSelected(null);
                setSettings(true);
              }}
              aria-label="Edit form title"
            >
              <h1>{doc.title || "Untitled form"}</h1>
              <p>{doc.description || "Add a description to your form"}</p>
            </button>
            {!visibleFields.length ? (
              <div className={s.empty}>
                <div className={s.emptyIcon}>
                  <Layers2 size={30} />
                  <Plus size={15} />
                </div>
                <h2>{doc.pages ? "This page is empty" : "Build your first form"}</h2>
                <p>{doc.pages ? "Add a field or move one here using its Page setting." : "Add a field or start with our contact form."}</p>
                <button className={s.primary} onClick={() => setInsertAt(0)}>
                  <Plus size={16} />
                  Add a field
                </button>
                {!doc.pages && <button
                  className={s.textButton}
                  onClick={() =>
                    patch({
                      fields: [...doc.fields, ...contactForm().fields.map(f=>({...f,pageId:activePage}))],
                      title: "Let’s talk",
                      description:
                        "Have a project in mind? We’d love to hear about it.",
                    })
                  }
                >
                  Use contact form <ArrowRight size={14} />
                </button>}
              </div>
            ) : (
                <div className={s.fields}>
                  {visibleFields.map((f, i) => (
                    <SortableField
                      key={f.id}
                      onInsert={() => setInsertAt(doc.fields.indexOf(f))}
                      field={f}
                      customPreview={f.type === "custom" ? adapters[f.customType!]?.Preview : undefined}
                      index={i}
                      span={fieldColumnSpan(doc.fields, f)}
                      columnAllowed={fieldColumnSpan(doc.fields, f) !== 4 || doc.fields.some(x=>x.id===dragId && !!x.columnGroup && x.columnGroup===f.columnGroup)}
                      selected={selected === f.id}
                      onSelect={(el) => {
                        lastSelection.current = el;
                        select(f.id);
                      }}
                    />
                  ))}
                </div>

            )}
            {visibleFields.length > 0 && (
              <>
                <button
                  className={s.addField}
                  onClick={() => setInsertAt(doc.fields.length)}
                >
                  <Plus size={16} />
                  Add a field
                </button>
                <div className={s.submitArea}>
                  <button
                    className={s.fakeSubmit}
                    onClick={() => {
                      setSelected(null);
                      setSettings(true);
                    }}
                  >
                    {doc.pages && activePage!==doc.pages.at(-1)?.id ? doc.nextLabel || "Next" : doc.submitLabel || "Submit"}
                    <ArrowRight size={16} />
                  </button>
                  {visibleFields.some(f=>f.required && !contentTypes.includes(f.type)) && <span>* Required fields</span>}
                </div>
              </>
            )}
          </div>
          <div className={s.canvasFooter}>
            <span>
              {status && (
                <>
                  <Check size={13} /> {status}
                </>
              )}
            </span>
            <button
              className={s.textButton}
              onClick={() => {
                state.commit(emptyForm());
                setSelected(null);
              }}
            >
              Start blank
            </button>
          </div>
        </main>
        <aside
          className={s.inspector}
          aria-label="Field settings panel"
          data-active={!narrow && (!!field || settings)}
        >
          {field || settings ? (
            inspector
          ) : (
            <>
              <div className={s.inspectorTitle}>
                Field settings
                <Settings2 size={17} />
              </div>
              <div className={s.idleInspector}>
                <h3>No field selected</h3>
                <p>Select a field on the canvas to edit its properties.</p>
                <button
                  className={s.secondary}
                  onClick={(e) => {
                    lastSelection.current = e.currentTarget;
                    setSettings(true);
                  }}
                >
                  <Settings2 size={15} />
                  Form settings
                </button>
              </div>
            </>
          )}
        </aside>
      </div>
      <Dialog.Root
        open={narrow && (!!field || settings)}
        onOpenChange={(open) => !open && closeInspector()}
      >
        <Dialog.Portal container={root.current}>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content
            className={`${s.inspector} ${s.mobileSheet}`}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              lastSelection.current?.focus();
            }}
          >
            <Dialog.Title className={s.srOnly}>
              {field ? "Field settings" : "Form settings"}
            </Dialog.Title>
            <Dialog.Description className={s.srOnly}>
              Edit the selected settings. Changes apply as you type.
            </Dialog.Description>
            {inspector}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <div className={s.srOnly} aria-live="polite">
        {announcement}
      </div>
      <Dialog.Root
        open={insertAt !== null}
        onOpenChange={(v) => !v && setInsertAt(null)}
      >
        <Dialog.Portal container={root.current}>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content className={s.dialog}>
            <div className={s.dialogHeading}>
              <Dialog.Title>Add a field</Dialog.Title>
              <Dialog.Close
                className={s.iconButton}
                aria-label="Close field picker"
              >
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={s.dialogDescription}>
              Choose what you’d like to ask.
            </Dialog.Description>
            <FieldToolbox customTypes={customTypes} onAddCustom={addCustom} onAdd={(type) => add(type)} compact />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={jsonOpen} onOpenChange={setJsonOpen}>
        <Dialog.Portal container={root.current}>
          <Dialog.Overlay className={s.overlay} />
          <Dialog.Content className={`${s.dialog} ${s.jsonDialog}`}>
            <div className={s.dialogHeading}>
              <Dialog.Title>Your form, anywhere.</Dialog.Title>
              <Dialog.Close className={s.iconButton} aria-label="Close JSON">
                <X size={18} />
              </Dialog.Close>
            </div>
            <Dialog.Description className={s.dialogDescription}>
              Export your definition, or paste JSON to load a form.
            </Dialog.Description>
            <textarea
              aria-label="Form JSON"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              spellCheck={false}
            />
            {error && (
              <p className={s.importError} role="alert">
                {error}
              </p>
            )}
            <div className={s.dialogActions}>
              <button
                className={s.secondary}
                onClick={() => {
                  let exported: string;
                  try {
                    exported = exportForm(doc, registry);
                  } catch {
                    setError(
                      "Complete the submit button text and ensure every choice has a unique value before exporting.",
                    );
                    return;
                  }
                  const blob = new Blob([exported], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "formcraft.json";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={15} />
                Download JSON
              </button>
              <button
                className={s.primary}
                onClick={() => {
                  try {
                    state.commit(parseForEditor(json));
                    setJsonOpen(false);
                    setSelected(null);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Load form
                <ArrowRight size={15} />
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <DragOverlay dropAnimation={null}>{source => <div className={s.dragPreview}><GripVertical size={16}/>{source.data?.fieldType ? names[source.data.fieldType as FieldType] : String(source.data?.label || "Field")}</div>}</DragOverlay>
    </div>
    </DragDropProvider>
  );
}
function SortableField({
  field: f,
  index,
  span,
  columnAllowed,
  selected,
  onSelect,
  onInsert,
  customPreview: CustomPreview,
}: {
  customPreview?: import("react").ComponentType<{field:Field}>;
  field: Field;
  index: number;
  span: number;
  columnAllowed: boolean;
  selected: boolean;
  onSelect: (el: HTMLButtonElement) => void;
  onInsert: () => void;
}) {
  const { ref, handleRef, isDragging } = useDraggable({ id: f.id, data: {label: f.label || names[f.type]} });
  return (
    <div ref={ref} className={s.fieldCell} style={{"--field-span": span} as CSSProperties}>
      {!isDragging && <><DropTarget id={`before:${f.id}`} position="before"/><DropTarget id={`after:${f.id}`} position="after"/>{columnAllowed && <><DropTarget id={`left:${f.id}`} position="left"/><DropTarget id={`right:${f.id}`} position="right"/></>}</>}
      <button
        className={s.insertLine}
        aria-label={`Insert field before ${f.label}`}
        onClick={onInsert}
      >
        <span />
        <Plus size={13} />
        <span />
      </button>
      <div
        className={s.field}
        data-selected={selected}
        data-dragging={isDragging}
      >
        <button
          ref={handleRef}
          className={s.dragHandle}
          aria-label={`Reorder ${f.label}`}
        >
          <GripVertical size={17} />
        </button>
        <button
          className={s.fieldSelect}
          data-select-index={index}
          data-field-id={f.id}
          onClick={(e) => onSelect(e.currentTarget)}
          aria-label={`Edit ${f.label}`}
          aria-pressed={selected}
        >
          <span className={s.fieldLabel} data-type={f.type}>
            {f.type === "checkbox" && <span className={s.checkbox} />}{" "}
            {f.label || "Untitled field"}
            {f.required && <span className={s.required}> *</span>}
          </span>
          {CustomPreview ? <CustomPreview field={f}/> : f.type === "structured_name" || f.type === "structured_address" ? <span className={s.compoundPreview}>{(f.type==='structured_name' ? nameParts : addressParts).map(p=><span key={p.key}>{p.label}<span className={s.inputPreview}/></span>)}</span> : f.type === 'rating' ? <span className={s.ratingPreview}>{Array.from({length:f.ratingMax ?? 5},(_,i)=><span key={i}>{i+1}</span>)}</span> : f.type === 'divider' ? <span className={s.dividerPreview}/> : f.type === "hidden" ? <span className={s.hiddenPreview}><EyeOff size={14}/> Hidden field · {f.defaultValue || "No default value"}</span> : contentTypes.includes(f.type) ? null : ["radio", "checkboxes"].includes(f.type) ? (
            <span className={s.choicePreview}>
              {f.options.map((o) => (
                <span key={o.value}>
                  <span
                    className={f.type === "radio" ? s.radioMark : s.checkbox}
                  />
                  {o.label}
                </span>
              ))}
            </span>
          ) : (
            f.type !== "checkbox" && (
              <span className={s.inputPreview} data-type={f.type}>
                {f.placeholder ||
                  (["dropdown", "multiselect"].includes(f.type)
                    ? "Select an option"
                    : f.type === "date"
                      ? "mm/dd/yyyy"
                      : f.type === "time"
                        ? "--:--"
                        : f.type === "password" ? "••••••••" : f.type === "url"
                          ? "https://example.com"
                          : "")}
                {f.type === "dropdown" && <ChevronDown size={15} />}
              </span>
            )
          )}
          {f.description && (
            <span className={s.fieldDescription}>{f.description}</span>
          )}
        </button>
        {selected && <span className={s.selectedTag}>{names[f.type]}</span>}
      </div>
    </div>
  );
}

function FieldToolbox({
  customTypes,
  onAddCustom,
  onAdd,
  compact = false,
}: {
  customTypes: {type:string;label:string}[];
  onAddCustom: (type:string) => void;
  onAdd: (type: FieldType) => void;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const customMatches = customTypes.filter(f=>f.label.toLowerCase().includes(query.toLowerCase()));
  const visible = fieldGroups.map((group) => ({
    ...group,
    types: group.types.filter((type) =>
      names[type].toLowerCase().includes(query.toLowerCase()),
    ),
  }));
  return (
    <div className={s.toolboxContent}>
      {!compact && (
        <div className={s.toolboxTitle}>
          <h2>Add Fields</h2>
          <span>{fieldTypes.length + customTypes.length}</span>
        </div>
      )}
      <label className={s.fieldSearch}>
        <Search size={16} />
        <input
          aria-label="Search fields"
          placeholder="Search fields…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button aria-label="Clear field search" onClick={() => setQuery("")}>
            <X size={15} />
          </button>
        )}
      </label>
      {visible.map(
        (group) =>
          group.types.length > 0 && (
            <section key={group.label} className={s.fieldGroup}>
              <h3>{group.label}</h3>
              <div>
                {group.types.map(type => <ToolboxItem key={type} type={type} onAdd={onAdd}/>)}
              </div>
            </section>
          ),
      )}
      {customMatches.length > 0 && <section className={s.fieldGroup}><h3>Custom Fields</h3><div>{customMatches.map(entry=><CustomToolboxItem key={entry.type} entry={entry} onAdd={onAddCustom}/>)}</div></section>}
      {!customMatches.length && visible.every((group) => !group.types.length) && (
        <p className={s.noFields}>No matching fields. Try a different name.</p>
      )}
      <p className={s.toolboxHint}>Click or drag a field onto the canvas.</p>
    </div>
  );
}

function ToolboxItem({type, onAdd}: {type: FieldType; onAdd: (type: FieldType) => void}) {
  const instanceId = useId();
  const {ref, isDragging} = useDraggable({id: `toolbox-${instanceId}-${type}`, data: {fieldType: type}});
  const Icon = icons[type];
  return <button ref={ref} data-dragging={isDragging} onClick={() => {if (!isDragging) onAdd(type)}} aria-label={`Add ${names[type]}`}><Icon size={19}/><span>{names[type]}</span></button>;
}
function DropTarget({id, position}: {id: string; position: string}) {
  const {ref, isDropTarget} = useDroppable({id, collisionDetector: pointerIntersection});
  return <div ref={ref} className={s.dropTarget} data-position={position} data-over={isDropTarget} aria-hidden="true"><span>{position === 'left' ? 'Add column on left' : position === 'right' ? 'Add column on right' : position === 'before' ? 'Insert above' : position === 'after' ? 'Insert below' : 'Add to form'}</span></div>;
}

function CustomToolboxItem({entry,onAdd}:{entry:{type:string;label:string};onAdd:(type:string)=>void}) {
  const instanceId = useId();
  const {ref,isDragging} = useDraggable({id:`custom-toolbox-${instanceId}`, data:{customType:entry.type,label:entry.label}});
  return <button ref={ref} onClick={()=>{if(!isDragging) onAdd(entry.type);}} aria-label={`Add ${entry.label}`}><Type size={19}/><span>{entry.label}</span></button>;
}
