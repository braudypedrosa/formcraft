import { describe, it, expect } from "vitest";
import {
  contactForm,
  exportForm,
  importForm,
  createField,
  validateSubmission,
} from "../packages/core/src";
import { createEditorStore } from "../packages/builder/src/store";
describe("portable form definitions", () => {
  it("round trips field IDs, ordering and options without losing data", () => {
    const form = contactForm();
    expect(importForm(exportForm(form))).toEqual(form);
  });
  it("rejects duplicate IDs and unsupported versions with paths", () => {
    const form = contactForm();
    form.fields.push(form.fields[0]);
    expect(() => importForm(JSON.stringify(form))).toThrow("fields.4.id");
    expect(() =>
      importForm(JSON.stringify({ ...contactForm(), version: 999 })),
    ).toThrow("version");
  });
  it("validates consent, email and dropdown membership", () => {
    const form = contactForm();
    const consent = { ...createField("checkbox"), required: true };
    form.fields.push(consent);
    const values = Object.fromEntries(
      form.fields.map((f) => [
        f.id,
        f.type === "email"
          ? "bad"
          : f.type === "dropdown"
            ? "unlisted"
            : f.type === "checkbox"
              ? false
              : "Alex",
      ]),
    );
    expect(Object.keys(validateSubmission(form, values))).toHaveLength(3);
  });
});
describe("editor history", () => {
  it("groups typing, restores edits, and invalidates the redo branch", () => {
    const form = contactForm(),
      store = createEditorStore(form);
    store.getState().commit({ ...form, title: "A" }, "title");
    store.getState().commit({ ...form, title: "Alex" }, "title");
    expect(store.getState().past).toHaveLength(1);
    store.getState().undo();
    expect(store.getState().document.title).toBe(form.title);
    store.getState().redo();
    expect(store.getState().document.title).toBe("Alex");
    store.getState().undo();
    store.getState().commit({ ...form, title: "Different" });
    expect(store.getState().future).toHaveLength(0);
  });
  it("isolates instances and clears history on external replacement", () => {
    const form = contactForm(),
      a = createEditorStore(form),
      b = createEditorStore(form);
    a.getState().commit({ ...form, title: "Changed" });
    expect(b.getState().document.title).toBe(form.title);
    a.getState().replace(contactForm());
    expect(a.getState().past).toHaveLength(0);
  });
});

describe("expanded field collection", () => {
  it("round trips all 24 field types and keeps consent distinct from checkbox groups", async () => {
    const { fieldTypes } = await import("../packages/core/src");
    const form = { ...contactForm(), fields: fieldTypes.map(createField) };
    expect(form.fields).toHaveLength(24);
    expect(importForm(exportForm(form))).toEqual(form);
    expect(createField("checkbox").options).toEqual([]);
    expect(createField("checkboxes").options).toHaveLength(2);
  });
  it("validates numeric, date, time, website and choice answers", () => {
    const fields = [
      "number",
      "date",
      "time",
      "url",
      "radio",
      "checkboxes",
      "multiselect",
    ].map((type) => createField(type as Parameters<typeof createField>[0]));
    const form = { ...contactForm(), fields };
    const invalid = [
      "abc",
      "2026-02-30",
      "25:01",
      "javascript:alert(1)",
      "unknown",
      ["unknown"],
      ["first", "first"],
    ];
    expect(
      Object.keys(
        validateSubmission(
          form,
          Object.fromEntries(fields.map((f, i) => [f.id, invalid[i]])),
        ),
      ),
    ).toHaveLength(7);
    const valid = [
      "0",
      "2026-02-28",
      "23:59",
      "https://example.com",
      "first",
      ["first"],
      ["first", "second"],
    ];
    expect(
      validateSubmission(
        form,
        Object.fromEntries(fields.map((f, i) => [f.id, valid[i]])),
      ),
    ).toEqual({});
  });
  it("rejects duplicate choice values with a precise path", () => {
    const f = createField("radio");
    f.options[1].value = f.options[0].value;
    expect(() =>
      importForm(JSON.stringify({ ...contactForm(), fields: [f] })),
    ).toThrow("fields.0.options.1.value");
  });
});

it('creates columns, moves fields out, and round trips the layout', async () => {
  const {placeField, fieldColumnSpan} = await import('../packages/core/src');
  const a=createField('text'), b=createField('email'), c=createField('phone');
  const row=placeField([a,b,c], b, a.id, 'right');
  expect(row[0].columnGroup).toBe(row[1].columnGroup);
  expect(fieldColumnSpan(row,row[0])).toBe(6);
  expect(importForm(exportForm({...contactForm(),fields:row})).fields).toEqual(row);
  const triple=placeField(row,c,a.id,'left');
  expect(fieldColumnSpan(triple,triple[0])).toBe(4);
  const fourth=createField('number');
  expect(placeField(triple,fourth,a.id,'right')).toEqual(triple);
  const split=placeField(row,b,c.id,'after');
  expect(split.every(f=>!f.columnGroup)).toBe(true);
});

it('validates structured addresses and page references', async () => {
  const {validateSubmission}=await import('../packages/core/src');
  const address={...createField('structured_address'),required:true};
  const form={...contactForm(),fields:[address]};
  expect(validateSubmission(form,{[address.id]:{street:'Example Street',city:'City',postalCode:'123',country:'Country'}})).toEqual({});
  expect(validateSubmission(form,{[address.id]:{street:'Example Street'}})[address.id]).toBeTruthy();
  expect(()=>importForm(JSON.stringify({...form,fields:[{...address,pageId:'missing'}]}))).toThrow('Unknown page');
  expect(()=>importForm(JSON.stringify({...form,pages:[{id:'one',title:'One'},{id:'one',title:'Duplicate'}]}))).toThrow('Page IDs');
});
