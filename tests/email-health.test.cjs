/* eslint-disable @typescript-eslint/no-require-imports -- Test the deployed handler with isolated service doubles. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');

function harness({ role = 'admin', authenticated = true, configured = true, failedPath, failedQueue = false, dailyLimit } = {}) {
  let handler;
  const requests = [], reads = [];
  const env = { BREVO_DAILY_EMAIL_LIMIT: dailyLimit, SUPABASE_URL: 'https://service.invalid', BREVO_API_KEY: configured ? 'private-test-only' : undefined };
  const service = { from(table) {
    let status, head = false;
    const q = {
      select(_fields, options) { head = !!options?.head; reads.push(table); return q; },
      eq(key, value) { if (key === 'status') status = value; return q; },
      in() { return q; }, gte() { return q; }, order() { return q; }, limit() { return q; },
      maybeSingle: async () => ({ data: { role }, error: null }),
      then(resolve, reject) { return Promise.resolve({ data: head ? null : [], count: status === 'failed' ? 2 : 0, error: failedQueue && table === 'application_email_queue' ? { code: 'unavailable' } : null }).then(resolve, reject); },
    };
    return q;
  } };
  const user = { auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin-id' } : null }, error: null }) } };
  const source = ts.transpileModule(fs.readFileSync('supabase/functions/email-health/index.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { exports: {}, Request, Response, AbortSignal, Date, Map,
    require(name) {
      if (name === '@supabase/supabase-js') return { createClient: (_url, key) => key === 'public' ? user : service };
      if (name.endsWith('application-email.ts')) return { requiredEnv: name => env[name], supabaseKey: name => name.includes('PUBLISHABLE') ? 'public' : 'private' };
      throw Error(name);
    },
    Deno: { env: { get: name => env[name] }, serve: next => { handler = next; } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (failedPath && url.includes(failedPath)) return new Response('{}', { status: 429 });
      let body = { requests: 10, delivered: 8, hardBounces: 1, softBounces: 1 };
      if (url.endsWith('/account')) body = { companyName: 'GDG', relay: { enabled: true, data: { password: 'do-not-return' } }, marketingAutomation: { key: 'do-not-return' }, plan: [{ type: 'free', credits: 250, creditsType: 'sendLimit' }, { type: 'sms', credits: 20 }] };
      else if (url.includes('/reports?')) body = { reports: [] };
      else if (url.includes('/events?')) body = { events: [{ date: '2026-11-04', email: 'test@example.com', event: 'blocked', secret: 'do-not-return' }] };
      else if (url.includes('blockedContacts')) body = { count: 1, contacts: [{ email: 'test@example.com', reason: { message: 'Hard bounce' } }] };
      else if (url.endsWith('/senders')) body = { senders: [{ name: 'GDG', email: 'hello@example.com', active: true, secret: 'do-not-return' }] };
      return Response.json(body);
    },
  };
  vm.runInNewContext(source, context);
  return { requests, reads, request: (body = { days: 7 }, authorization = 'Bearer test') => handler(new Request('https://service.invalid/email-health', { method: 'POST', headers: authorization ? { authorization } : {}, body: JSON.stringify(body) })) };
}

test('email health rejects guests, invalid sessions and reviewers before reading private reporting', async () => {
  for (const [options, token, status] of [[{}, '', 401], [{ authenticated: false }, 'Bearer x', 401], [{ role: 'reviewer' }, 'Bearer x', 403]]) {
    const h = harness(options);
    assert.equal((await h.request({ days: 7 }, token)).status, status);
    assert.equal(h.requests.length, 0);
    assert.ok(!h.reads.includes('application_email_queue'));
  }
});
test('admin reporting is read-only, sanitized, explicitly ranged and cached after authentication', async () => {
  const h = harness(); const response = await h.request(); const data = await response.json();
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(data.totals.requests, 10); assert.equal(data.queue.counts.failed, 2);
  assert.equal(data.dailyLimit, null); assert.equal(data.account.plans.length, 1);
  assert.ok(!JSON.stringify(data).includes('do-not-return'));
  assert.equal(h.requests.length, 7);
  assert.ok(h.requests.every(r => !r.options.method || r.options.method === 'GET'));
  assert.ok(h.requests.some(r => r.url.includes('days=1')));
  assert.ok(h.requests.some(r => r.url.includes('days=7&limit=50')));
  await h.request(); assert.equal(h.requests.length, 7);
  assert.equal((await h.request({ days: 90 })).status, 400);
  assert.equal((await h.request(null)).status, 400);
});
test('provider failures and queue failures stay unavailable rather than showing false zeroes', async () => {
  const h = harness({ failedPath: 'aggregatedReport', failedQueue: true });
  const data = await (await h.request()).json();
  assert.equal(data.totals, null); assert.equal(data.today, null);
  assert.equal(data.queue.counts.pending, null); assert.equal(data.queue.recent, null);
  assert.ok(data.warnings.some(w => w.includes('rate limit')));
  assert.ok(data.warnings.some(w => w.includes('queue data')));
});
test('missing provider configuration preserves queue reporting without making external calls', async () => {
  const h = harness({ configured: false }); const data = await (await h.request()).json();
  assert.equal(h.requests.length, 0); assert.equal(data.totals, null);
  assert.equal(data.account, null); assert.equal(data.queue.counts.failed, 2);
  assert.ok(data.warnings.some(w => w.includes('not configured')));
});

test('daily allowance is displayed only when explicitly configured as a positive integer', async () => {
  for (const [configured, expected] of [['300',300],['-1',null],['1.5',null],['invalid',null]]) {
    const h = harness({dailyLimit:configured});
    const data = await (await h.request()).json();
    assert.equal(data.dailyLimit, expected);
  }
});

test('rates distinguish no activity and missing data from a real zero bounce rate', () => {
  const source = ts.transpileModule(fs.readFileSync('src/lib/email-health.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context = {exports:{}}; vm.runInNewContext(source,context);
  assert.equal(context.exports.bounceRate({requests:100,hardBounces:2,softBounces:1}),'3.0%');
  assert.equal(context.exports.bounceRate({requests:100,hardBounces:0,softBounces:0}),'0.0%');
  assert.equal(context.exports.bounceRate({requests:0,hardBounces:0,softBounces:0}),'—');
  assert.equal(context.exports.bounceRate({requests:100}),'—');
});

test('daily usage uses the remaining Free balance and never treats paid credits as a daily balance', () => {
  const source = ts.transpileModule(fs.readFileSync('src/lib/email-health.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const context = {exports:{}}; vm.runInNewContext(source,context);
  const quota = (plans, dailyLimit=null) => JSON.parse(JSON.stringify(context.exports.dailyEmailQuota({account:{plans},dailyLimit})));
  const free = credits => [{type:'free',creditsType:'sendLimit',credits}];
  assert.deepEqual(quota(free(247)),{limit:300,used:53,remaining:247});
  assert.deepEqual(quota(free(300)),{limit:300,used:0,remaining:300});
  assert.deepEqual(quota(free(0)),{limit:300,used:300,remaining:0});
  assert.deepEqual(quota([{type:'subscription',creditsType:'sendLimit',credits:5000}],300),{limit:300,used:null,remaining:null});
  assert.equal(quota([...free(247),{type:'payAsYouGo',creditsType:'sendLimit',credits:1000}]).used,null);
  assert.equal(quota(free(301)).remaining,null);
  assert.equal(quota(free(-1)).remaining,null);
  assert.equal(quota(free(NaN)).remaining,null);
  assert.deepEqual(quota([]),{limit:null,used:null,remaining:null});
});
