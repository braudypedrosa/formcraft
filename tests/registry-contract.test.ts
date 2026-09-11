import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { createFieldRegistry, createCustomField, createField, emptyForm, importForm, exportForm, migrateForm, validateSubmissionRequest, getValidationCapabilities, type FormDefinition, type Field } from '../packages/core/src';
import { referenceDefinition } from '../apps/playground/src/custom-fields/reference';
const registry=createFieldRegistry([referenceDefinition]);
const published=(fields:Field[])=>({schema:{...emptyForm(),id:'contact',fields},revision:'published-7'});
const request=(values:unknown)=>({contractVersion:1,formId:'contact',revision:'published-7',submissionId:'05dd95aa-c6d5-4ba1-9722-0e7a23ece584',values});
const fixtures=JSON.parse(readFileSync(new URL('../fixtures/submission-contract-v1.json',import.meta.url),'utf8')) as {cases:{name:string;field:Field;value?:unknown;expectedCode:string|null}[]};
for(const fixture of fixtures.cases) it(`shared contract: ${fixture.name}`,()=>{
  const result=validateSubmissionRequest(published([fixture.field]),request('value' in fixture?{answer:fixture.value}:{}),registry);
  expect(result.ok ? null : result.fieldErrors?.answer?.code ?? result.code).toBe(fixture.expectedCode);
});
it('migrates version one without changing stable IDs, content, pages or layout',()=>{
  const source={...emptyForm(),version:1 as const,fields:[createField('email')]};
  const copy=structuredClone(source);
  const migrated=migrateForm(source);
  expect(migrated).toEqual({...source,version:2});
  expect(source).toEqual(copy);
  expect(importForm(JSON.stringify(source))).toEqual(migrated);
  expect(migrateForm(migrated)).toEqual(migrated);
  expect(()=>migrateForm({...source,version:999})).toThrow();
});
it('round trips registered custom config and fails closed for unknown type/version',()=>{
  const field=createCustomField('demo.reference',registry,{prefix:'REF'});
  const form={...emptyForm(),fields:[field]};
  expect(importForm(exportForm(form,registry),registry)).toEqual(form);
  expect(()=>importForm(JSON.stringify(form))).toThrow('Unregistered');
  expect(()=>importForm(JSON.stringify({...form,version:1}),registry)).toThrow('version 2');
  expect(()=>importForm(JSON.stringify({...form,fields:[{...field,customVersion:2}]}),registry)).toThrow('Unsupported');
  expect(()=>exportForm({...form,fields:[{...field,config:{prefix:()=>{}} as unknown as Field['config']}]},registry)).toThrow('JSON');
});
it('registries do not leak mutable settings or registrations across instances',()=>{
  const a=createFieldRegistry([referenceDefinition]),b=createFieldRegistry();
  a.get('demo.reference')!.defaultConfig!.prefix='REF';
  expect(a.get('demo.reference')!.defaultConfig!.prefix).toBe('FC');
  expect(b.get('demo.reference')).toBeUndefined();
  expect(()=>createFieldRegistry([referenceDefinition,referenceDefinition])).toThrow('Duplicate');
  expect(getValidationCapabilities(a).customTypes).toEqual([{type:'demo.reference',version:1}]);
});
it('rejects envelope, stale revision, unknown fields, and content answers',()=>{
  const form=published([createField('heading')]);
  expect(validateSubmissionRequest(form,{...request({}),revision:'old'})).toMatchObject({ok:false,code:'revision_mismatch'});
  expect(validateSubmissionRequest(form,{...request({}),formId:'other'})).toMatchObject({ok:false,code:'form_mismatch'});
  expect(validateSubmissionRequest(form,request({wrong:42}))).toMatchObject({ok:false,code:'invalid_request'});
  expect(validateSubmissionRequest(form,request({[form.schema.fields[0].id]:'text'}))).toMatchObject({ok:false,code:'invalid_values'});
  const malicious=JSON.parse(JSON.stringify(request({})).replace('"values":{}','"values":{"__proto__":"x"}'));
  expect(validateSubmissionRequest(form,malicious)).toMatchObject({ok:false,code:'invalid_values'});
});
