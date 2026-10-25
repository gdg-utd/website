/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness loads TypeScript without a new runtime dependency. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2) + '.ts') : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const { safeNextPath, normalizeQuery } = require('../src/lib/navigation.ts');
const { editFormError } = require('../src/lib/edit-form-state.ts');
const { buildResponses, validateResponses } = require('../src/lib/applications.ts');
const { getPasswordStrength } = require('../src/lib/password.ts');
const { getChapterData } = require('../src/lib/gdg.ts');

test('redirect destinations reject external, control-character and normalized authority paths', () => {
  for (const input of ['//example.com', '/\n/example.com', '/\t/example.com', '/\\example.com', 'https://example.com', '/a/..//example.com', '/\u0000/example.com']) {
    assert.equal(safeNextPath(input), '/', JSON.stringify(input));
  }
  assert.equal(safeNextPath('/dashboard/profile?recovery=1'), '/dashboard/profile?recovery=1');
  assert.equal(safeNextPath(['/dashboard', '/about']), '/dashboard');
  assert.deepEqual(normalizeQuery({q:['one','two'], next:undefined}), {q:'one', next:undefined});
});

test('failed saves preserve text and multiple selections, excluding action metadata and passwords', () => {
  const data = new FormData();
  data.set('firstName', '  Unsaved name  ');
  data.append('field:areas', 'web'); data.append('field:areas', 'mobile');
  data.set('password', 'secret'); data.set('$ACTION_ID', 'internal');
  const state = editFormError({revision:0,error:''}, data, 'Try again');
  assert.equal(state.revision, 1);
  assert.equal(state.values.firstName, '  Unsaved name  ');
  assert.deepEqual(state.values['field:areas'], ['web','mobile']);
  assert.equal(state.values.password, undefined);
  assert.equal(state.values.$ACTION_ID, undefined);
});

const schema = {sections:[{id:'one',title:'One',fields:[{id:'areas',type:'multiple_choice',label:'Areas',required:true,options:[{value:'web',label:'Web'}]},{id:'agree',type:'checkbox',label:'Agreement',required:true}]}]};
test('required multiple choice and agreements validate correctly after failed-save reconstruction', () => {
  const data = new FormData(); data.append('field:areas','web'); data.set('field:agree','true');
  assert.deepEqual(validateResponses(schema,buildResponses(schema,data)), []);
  assert.deepEqual(validateResponses(schema,buildResponses(schema,new FormData())), ['Areas','Agreement']);
});

test('password rules accept both length boundaries and reject overlong input', () => {
  assert.equal(getPasswordStrength('Aa1!abcd').isValid,true);
  assert.equal(getPasswordStrength('Aa1!'+'x'.repeat(124)).isValid,true);
  assert.equal(getPasswordStrength('Aa1!'+'x'.repeat(125)).isValid,false);
});

test('unavailable event feed never advertises expired fallback events', async () => {
  const original = global.fetch;
  global.fetch = async () => ({ok:false,status:503});
  try {
    const chapter = await getChapterData();
    assert.deepEqual(chapter.events, []);
    assert.equal(chapter.eventsUnavailable,true);
  } finally { global.fetch = original; }
});

test('unconfirmed login redirects to OTP; incorrect credentials remain a login error', async () => {
  const originalLoad = Module._load;
  let authError = {code:'email_not_confirmed',message:'Email not confirmed'};
  Module._load = function(name, ...args) {
    if (name === 'next/navigation') return {redirect(destination) { throw Object.assign(new Error('redirect'), {destination}); }};
    if (name === '@/lib/supabase/server') return {createClient:async () => ({auth:{signInWithPassword:async () => ({data:null,error:authError})}})};
    return originalLoad.call(this,name,...args);
  };
  try {
    const {login} = require('../src/app/auth/actions.ts');
    const form = new FormData();
    form.set('email','TEST@utdallas.edu'); form.set('password','Example123!'); form.set('next','/apply/tech-officer');
    await assert.rejects(login({status:'idle',message:''},form), error => {
      const destination = new URL(error.destination,'https://local.invalid');
      assert.equal(destination.pathname,'/auth/confirm');
      assert.equal(destination.searchParams.get('email'),'test@utdallas.edu');
      assert.equal(destination.searchParams.get('next'),'/apply/tech-officer');
      return true;
    });
    form.set('next','/');
    await assert.rejects(login({status:'idle',message:''},form), error => new URL(error.destination,'https://local.invalid').searchParams.get('next') === '/dashboard');
    authError = {code:'invalid_credentials',message:'Invalid login credentials'};
    assert.deepEqual(await login({status:'idle',message:''},form), {status:'error',message:'The email or password is incorrect.'});
  } finally { Module._load = originalLoad; }
});
