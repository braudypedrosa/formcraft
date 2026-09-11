// @vitest-environment jsdom
import { it, expect, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormRenderer } from "../packages/renderer/src";
import { emptyForm, createField } from "../packages/core/src";
it("retains answers after a failed submission and succeeds on retry", async () => {
  const user = userEvent.setup();
  const field = { ...createField("email"), label: "Email", required: true };
  const submit = vi
    .fn()
    .mockRejectedValueOnce(new Error("Please retry"))
    .mockResolvedValueOnce(undefined);
  render(
    <FormRenderer
      schema={{ ...emptyForm(), fields: [field] }}
      onSubmit={submit}
    />,
  );
  await user.type(screen.getByLabelText(/Email/), "alex@example.com");
  await user.click(screen.getByRole("button", { name: /Send message/ }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "Please retry",
  );
  expect(screen.getByLabelText(/Email/)).toHaveProperty(
    "value",
    "alex@example.com",
  );
  await user.click(screen.getByRole("button", { name: /Send message/ }));
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    expect.stringContaining("Message received"),
  );
  expect(submit).toHaveBeenCalledTimes(2);
  cleanup();
});

it("submits radio and checkbox choices as their saved values, including a single checkbox option", async () => {
  const user = userEvent.setup();
  const radio = {
    ...createField("radio"),
    label: "Contact method",
    required: true,
  };
  const checkboxes = {
    ...createField("checkboxes"),
    label: "Topics",
    required: true,
    options: [{ label: "News", value: "news" }],
  };
  const select = {
    ...createField("multiselect"),
    label: "Services",
    required: true,
  };
  const submit = vi.fn().mockResolvedValue(undefined);
  render(
    <FormRenderer
      schema={{ ...emptyForm(), fields: [radio, checkboxes, select] }}
      onSubmit={submit}
    />,
  );
  await user.click(screen.getByRole("button", { name: /Send message/ }));
  expect(screen.getAllByRole("alert")).toHaveLength(3);
  await user.click(screen.getByRole("radio", { name: "First option" }));
  await user.click(screen.getByRole("checkbox", { name: "News" }));
  await user.selectOptions(screen.getByRole("listbox", { name: /Services/ }), [
    "first",
    "second",
  ]);
  await user.click(screen.getByRole("button", { name: /Send message/ }));
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    expect.stringContaining("Message received"),
  );
  expect(submit).toHaveBeenCalledWith({
    [radio.id]: "first",
    [checkboxes.id]: ["news"],
    [select.id]: ["first", "second"],
  });
  cleanup();
});

it("renders added fields and submits hidden data without content blocks", async () => {
  cleanup();
  const fields = ['name', 'address', 'password', 'hidden', 'heading', 'paragraph'].map(type => createField(type as Parameters<typeof createField>[0]));
  fields[3].defaultValue = 'contact-page';
  fields[4].required = true;
  const submit = vi.fn();
  render(<FormRenderer schema={{...emptyForm(), fields}} onSubmit={submit}/>);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Full Name'), 'Alex Morgan');
  await user.type(screen.getByLabelText('Address'), '123 Example Street');
  expect(screen.getByLabelText('Password')).toHaveProperty('type', 'password');
  expect(screen.getByRole('heading', {name:'Heading'})).toBeTruthy();
  await user.click(screen.getByRole('button', {name:/Send message/}));
  expect(submit).toHaveBeenCalledWith({[fields[0].id]:'Alex Morgan',[fields[1].id]:'123 Example Street',[fields[2].id]:'',[fields[3].id]:'contact-page'});
  cleanup();
});

it("preserves an accessible name when a saved label is blank", () => {
  cleanup();
  render(<FormRenderer schema={{...emptyForm(),fields:[{...createField('text'),label:''}]}} onSubmit={()=>{}}/>);
  expect(screen.getByLabelText('Single Line Text')).toBeTruthy();
  cleanup();
});

it('validates pages, preserves back navigation answers, and submits structured values', async () => {
  cleanup();
  const name={...createField('structured_name'),required:true,pageId:'contact'};
  const rating={...createField('rating'),required:true,pageId:'feedback'};
  const section={...createField('section'),pageId:'feedback'};
  const divider={...createField('divider'),pageId:'feedback'};
  const submit=vi.fn();
  const user=userEvent.setup();
  render(<FormRenderer schema={{...emptyForm(),pages:[{id:'contact',title:'Contact'},{id:'feedback',title:'Feedback'}],fields:[name,rating,section,divider]}} onSubmit={submit}/>);
  await user.click(screen.getByRole('button',{name:'Next'}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Enter first and last name.');
  await user.type(screen.getByLabelText('First name'),'Alex');
  await user.type(screen.getByLabelText('Last name'),'Morgan');
  await user.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByRole('heading',{name:'Feedback'})).toBeTruthy();
  await user.click(screen.getByRole('radio',{name:'4 out of 5'}));
  await user.click(screen.getByRole('button',{name:'Back'}));
  expect(screen.getByLabelText('First name')).toHaveProperty('value','Alex');
  await user.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByRole('radio',{name:'4 out of 5'})).toHaveProperty('checked',true);
  await user.click(screen.getByRole('button',{name:/Send message/}));
  expect(submit).toHaveBeenCalledWith({[name.id]:{first:'Alex',last:'Morgan'},[rating.id]:'4'});
  cleanup();
});

it('maps server errors to earlier pages, preserves values, and exposes reset and lifecycle controls', async () => {
  cleanup();
  const { createRef } = await import('react');
  const { SubmissionError } = await import('../packages/renderer/src');
  const ref = createRef<import('../packages/renderer/src').FormRendererHandle>();
  const email = {...createField('email'), label:'Email', required:true, pageId:'one'};
  const note = {...createField('text'), label:'Note', pageId:'two'};
  const submit = vi.fn().mockRejectedValueOnce(new SubmissionError('Review the highlighted field.', {[email.id]:{code:'blocked',message:'Use your work email.'}})).mockResolvedValue(undefined);
  const onError=vi.fn(), onSuccess=vi.fn();
  const user=userEvent.setup();
  render(<FormRenderer ref={ref} schema={{...emptyForm(),pages:[{id:'one',title:'Details'},{id:'two',title:'Message'}],fields:[email,note]}} initialValues={{[email.id]:'alex@example.com'}} onSubmit={submit} onError={onError} onSuccess={onSuccess} successTitle="Saved" successMessage="We have your answer." resetLabel="Start again"/>);
  await user.click(screen.getByRole('button',{name:'Next'}));
  await user.type(screen.getByLabelText('Note'),'Keep this');
  await user.click(screen.getByRole('button',{name:/Send message/}));
  expect(await screen.findByText('Use your work email.')).toBeTruthy();
  expect(screen.getByLabelText(/Email/)).toHaveProperty('value','alex@example.com');
  expect(onError).toHaveBeenCalledTimes(1);
  await user.click(screen.getByRole('button',{name:'Next'}));
  expect(screen.getByLabelText('Note')).toHaveProperty('value','Keep this');
  await user.click(screen.getByRole('button',{name:/Send message/}));
  expect(await screen.findByRole('heading',{name:'Saved'})).toBeTruthy();
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(ref.current?.getStatus()).toBe('success');
  await user.click(screen.getByRole('button',{name:'Start again'}));
  expect(screen.getByLabelText(/Email/)).toHaveProperty('value','alex@example.com');
  expect(ref.current?.getStatus()).toBe('idle');
  cleanup();
});

it('guards pending submissions and reset, and isolates controller values', async () => {
  cleanup();
  const { createRef } = await import('react');
  const { act, waitFor } = await import('@testing-library/react');
  const ref=createRef<import('../packages/renderer/src').FormRendererHandle>();
  const field={...createField('text'),label:'Answer'};
  let finish!:()=>void;
  const submit=vi.fn(()=>new Promise<void>(resolve=>{finish=resolve;}));
  render(<FormRenderer ref={ref} schema={{...emptyForm(),fields:[field]}} onSubmit={submit}/>);
  act(()=>{ref.current?.setValue(field.id,'Original');});
  const snapshot=ref.current!.getValues();snapshot[field.id]='Mutation';
  expect(ref.current!.getValues()[field.id]).toBe('Original');
  act(()=>ref.current?.submit());
  await waitFor(()=>expect(submit).toHaveBeenCalledTimes(1));
  expect(ref.current?.reset()).toBe(false);
  expect(ref.current?.setValue(field.id,'While pending')).toBe(false);
  act(()=>ref.current?.submit());
  expect(submit).toHaveBeenCalledTimes(1);
  await act(async()=>finish());
  act(()=>{expect(ref.current?.reset({[field.id]:'New value'})).toBe(true);});
  expect(screen.getByLabelText('Answer')).toHaveProperty('value','New value');
  cleanup();
});

it('renders a registered adapter with shared validation and rejects missing adapters', async()=>{
  cleanup();
  const {createFieldRegistry,createCustomField}=await import('../packages/core/src');
  const {referenceDefinition}=await import('../apps/playground/src/custom-fields/reference');
  const {exampleRendererAdapters}=await import('../apps/playground/src/custom-fields/adapters');
  const registry=createFieldRegistry([referenceDefinition]);
  const field={...createCustomField('demo.reference',registry),required:true};
  const schema={...emptyForm(),fields:[field]};
  expect(()=>render(<FormRenderer schema={schema} registry={registry} onSubmit={()=>{}}/>)).toThrow('Missing or incompatible');
  cleanup();
  const submit=vi.fn(),user=userEvent.setup();
  render(<FormRenderer schema={schema} registry={registry} adapters={exampleRendererAdapters} onSubmit={submit}/>);
  await user.type(screen.getByLabelText(/Reference code/),'FC-12');
  await user.click(screen.getByRole('button',{name:/Send message/}));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent','Enter FC followed by a hyphen and four digits.');
  await user.type(screen.getByLabelText(/Reference code/),'34');
  await user.click(screen.getByRole('button',{name:/Send message/}));
  expect(submit).toHaveBeenCalledWith({[field.id]:'FC-1234'});
  cleanup();
});
