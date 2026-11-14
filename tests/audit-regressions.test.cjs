/* eslint-disable @typescript-eslint/no-require-imports -- Execute server actions with isolated service failures. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(this, name.startsWith('@/') ? path.join(root, 'src', name.slice(2) + '.ts') : name, ...args);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const redirect = destination => { throw Object.assign(new Error('redirect'), { destination }); };

test('logout clears local session and recovery cookies even when remote revocation fails', async () => {
  const originalLoad = Module._load;
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://audit-project.supabase.co';
  let outcome;
  const removed = [];
  const cookies = ['sb-audit-project-auth-token.0', 'sb-audit-project-auth-token.1', 'gdg-password-recovery', 'unrelated-preference'];
  Module._load = function (name, ...args) {
    if (name === 'server-only') return {};
    if (name === 'next/navigation') return { redirect };
    if (name === 'next/headers') return { cookies: async () => ({ getAll: () => cookies.map(name => ({name})), delete: name => removed.push(name) }) };
    if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { signOut: async () => {
      if (outcome === 'throw') throw new Error('Network unavailable');
      return { error: outcome === 'error' ? { name: 'AuthRetryableFetchError' } : null };
    } } }) };
    return originalLoad.call(this, name, ...args);
  };
  try {
    const { logout } = require('../src/app/auth/actions.ts');
    for (outcome of ['success', 'error', 'throw']) {
      removed.length = 0;
      await assert.rejects(logout(), error => error.destination === '/');
      assert.deepEqual(removed, cookies.slice(0, 3));
    }
  } finally {
    Module._load = originalLoad;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  }
});

test('single publishing rejects a reopened/resubmitted application without sending an email or claiming success', async () => {
  const originalLoad = Module._load;
  const originalSubmission = '2026-11-01T00:00:00Z';
  let currentSubmission, available, deliveries = 0;
  const client = { from(table) {
    let updating = false;
    const filters = new Map();
    return {
      select() { return this; },
      update() { updating = true; return this; },
      eq(key, value) { filters.set(key, value); return this; },
      gte() { return this; }, order() { return this; }, limit() { return this; },
      async maybeSingle() {
        if (table === 'application_events') return { data: { details: { decision: 'accepted' } }, error: null };
        if (!updating) return { data: { submitted_at: originalSubmission }, error: null };
        // Model the row changing after the initial read, before the atomic UPDATE.
        const matches = available && filters.get('submitted_at') === currentSubmission;
        return { data: matches ? { id: 1, application_openings: { slug: 'tech-officer' } } : null, error: null };
      },
    };
  } };
  Module._load = function (name, ...args) {
    if (name === 'next/navigation') return { redirect };
    if (name === 'next/cache') return { revalidatePath() {} };
    if (name === '@/lib/application-admin') return { requireApplicationAdmin: async () => ({ supabase: client }) };
    if (name === '@/lib/application-email') return { deliverApplicationEmail: async () => { deliveries++; return true; } };
    return originalLoad.call(this, name, ...args);
  };
  try {
    const { publishApplicationDecision } = require('../src/app/admin/applications/actions.ts');
    const form = new FormData(); form.set('applicationId', '1');
    for (const scenario of [
      { submission: '2026-11-02T00:00:00Z', available: true, message: 'publish-failed' },
      { submission: originalSubmission, available: false, message: 'publish-failed' },
      { submission: originalSubmission, available: true, message: 'published' },
    ]) {
      currentSubmission = scenario.submission; available = scenario.available;
      await assert.rejects(publishApplicationDecision(form), error => new URL(error.destination, 'https://local.invalid').searchParams.get('message') === scenario.message);
      assert.equal(deliveries, scenario.message === 'published' ? 1 : 0);
    }
  } finally { Module._load = originalLoad; }
});
