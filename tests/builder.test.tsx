// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, it, expect, vi } from "vitest";
import {
  render,
  screen,
  within,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { contactForm } from "../packages/core/src";
let width = 1400;
const resizeCallbacks = new Map<Element, (width: number) => void>();
vi.stubGlobal(
  "ResizeObserver",
  class {
    constructor(private callback: ResizeObserverCallback) {}
    observe(target: Element) {
      const notify = (width: number) =>
        this.callback(
          [{ target, contentRect: { width } }] as ResizeObserverEntry[],
          this as unknown as ResizeObserver,
        );
      resizeCallbacks.set(target, notify);
      notify(width);
    }
    disconnect() {}
    unobserve() {}
  },
);
const { FormBuilder } = await import("../packages/builder/src");
function Harness() {
  const [form, setForm] = useState(contactForm);
  return <FormBuilder value={form} onChange={setForm} />;
}
afterEach(() => {
  cleanup();
  width = 1400;
});
it("keeps all fields discoverable while editing and preserves undo after controlled value echoes", async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(
    screen.getByRole("button", { name: "Edit Email address", exact: true }),
  );
  const toolbox = within(
    screen.getByRole("complementary", { name: "Field toolbox" }),
  );
  expect(toolbox.getAllByRole("button")).toHaveLength(24);
  await user.click(toolbox.getByRole("button", { name: "Add Radio Buttons" }));
  expect(
    screen.getByRole("button", { name: "Edit Radio Buttons", exact: true }),
  ).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Undo", exact: true }));
  expect(
    screen.queryByRole("button", { name: "Edit Radio Buttons", exact: true }),
  ).toBeNull();
  await user.click(screen.getByRole("button", { name: "Redo", exact: true }));
  expect(
    screen.getByRole("button", { name: "Edit Radio Buttons", exact: true }),
  ).toBeTruthy();
});
it("restores focus to the newly added field when mobile settings close", async () => {
  width = 390;
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(
    screen.getByRole("button", { name: "Add fields", exact: true }),
  );
  await user.click(
    within(screen.getByRole("dialog", { name: "Add a field" })).getByRole(
      "button",
      { name: "Add Date", exact: true },
    ),
  );
  await user.click(
    within(screen.getByRole("dialog", { name: "Field settings" })).getByRole(
      "button",
      { name: "Close settings" },
    ),
  );
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Edit Date", exact: true }),
    ),
  );
});

it("does not open a mobile dialog when the editor is hidden for preview", async () => {
  const user = userEvent.setup();
  const view = render(<Harness />);
  await user.click(
    screen.getByRole("button", { name: "Edit Email address", exact: true }),
  );
  act(() => resizeCallbacks.get(view.container.firstElementChild!)!(0));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it('moves fields between pages and preserves them when a page is removed', async () => {
  width=1400;
  const user=userEvent.setup();
  render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'Add page',exact:true}));
  expect(screen.getByRole('heading',{name:'This page is empty'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'1. Page 1',exact:true}));
  await user.click(screen.getByRole('button',{name:'Edit Email address',exact:true}));
  const pageSelect=screen.getByRole('combobox',{name:'Page',exact:true});
  const options=within(pageSelect).getAllByRole('option');
  await user.selectOptions(pageSelect,options[1]);
  expect(screen.getByRole('button',{name:'Edit Email address',exact:true})).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Edit Your name',exact:true})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Remove page',exact:true}));
  expect(screen.getByRole('button',{name:'Edit Email address',exact:true})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Edit Your name',exact:true})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Undo',exact:true}));
  await user.click(screen.getByRole('button',{name:'2. Page 2',exact:true}));
  expect(screen.getByRole('button',{name:'Edit Email address',exact:true})).toBeTruthy();
});

it('previews and applies columns as one undo transaction', async () => {
  const user=userEvent.setup();
  render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'Edit Email address',exact:true}));
  const preview=screen.getByLabelText('Row preview');
  expect(preview.textContent).toContain('Your name');
  expect(preview.textContent).toContain('Email address');
  await user.click(screen.getByRole('button',{name:'Apply layout',exact:true}));
  expect(screen.getByRole('button',{name:'Move to own row'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Undo',exact:true}));
  expect(screen.queryByRole('button',{name:'Move to own row'})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Redo',exact:true}));
  expect(screen.getByRole('button',{name:'Move to own row'})).toBeTruthy();
});

it('exposes instance-local commands and rejects invalid imports without losing history', async () => {
  const {createRef}=await import('react');
  const ref=createRef<import('../packages/builder/src').FormBuilderHandle>();
  const other=createRef<import('../packages/builder/src').FormBuilderHandle>();
  const document=contactForm();
  render(<><FormBuilder ref={ref} value={document} onChange={()=>{}}/><FormBuilder ref={other} value={contactForm()} onChange={()=>{}}/></>);
  act(()=>ref.current?.addField('date'));
  expect(ref.current?.getState().document.fields).toHaveLength(5);
  expect(other.current?.getState().document.fields).toHaveLength(4);
  expect(()=>ref.current?.importJSON('{invalid')).toThrow();
  expect(ref.current?.getState().canUndo).toBe(true);
  act(()=>ref.current?.undo());
  expect(ref.current?.getState().document.fields).toHaveLength(4);
  const snapshot=ref.current!.getState();snapshot.document.fields=[];
  expect(ref.current!.getState().document.fields).toHaveLength(4);
});


it('keeps consecutive controller additions in the same host event', async () => {
  const {createRef}=await import('react');
  const ref=createRef<import('../packages/builder/src').FormBuilderHandle>();
  render(<FormBuilder ref={ref} value={contactForm()} onChange={()=>{}}/>);
  act(()=>{ref.current?.addField('date');ref.current?.addField('time');});
  expect(ref.current?.getState().document.fields).toHaveLength(6);
  act(()=>ref.current?.undo());
  expect(ref.current?.getState().document.fields.at(-1)?.type).toBe('date');
});

it('adds custom fields, edits registered settings, and exports their config', async()=>{
  const {createRef}=await import('react');
  const {exampleRegistry}=await import('../apps/playground/src/custom-fields/reference');
  const {exampleBuilderAdapters}=await import('../apps/playground/src/custom-fields/adapters');
  const ref=createRef<import('../packages/builder/src').FormBuilderHandle>();
  const user=userEvent.setup();
  render(<FormBuilder ref={ref} value={contactForm()} onChange={()=>{}} registry={exampleRegistry} adapters={exampleBuilderAdapters}/>);
  await user.click(screen.getByRole('button',{name:'Add Reference code',exact:true}));
  await user.selectOptions(screen.getByLabelText('Reference prefix'),'REF');
  const saved=JSON.parse(ref.current!.exportJSON());
  expect(saved.version).toBe(2);
  expect(saved.fields.at(-1)).toMatchObject({type:'custom',customType:'demo.reference',customVersion:1,config:{prefix:'REF'}});
  await user.click(screen.getByRole('button',{name:'Undo',exact:true}));
  expect(ref.current!.getState().document.fields.at(-1)?.config?.prefix).toBe('FC');
});
