/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS harness loads TypeScript without a new runtime dependency. */
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const assert = require("node:assert/strict"),
  { test } = require("node:test"),
  ts = require("typescript");
const root = path.resolve(__dirname, "..");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) {
  return originalResolve.call(
    this,
    name.startsWith("@/")
      ? path.join(root, "src", name.slice(2) + ".ts")
      : name,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  signRecoveryGrant,
  validRecoveryGrant,
} = require("../src/lib/recovery-grant.ts");
const { contentSecurityPolicy } = require("../src/lib/security-headers.ts");
const {
  applicationPageNumber,
} = require("../src/lib/staff-application-page.ts");
const { csvCell } = require("../src/lib/csv.ts");

test("recovery authorization is signed, short lived, and bound to the verified account/session", () => {
  const secret = "test-secret-which-is-longer-than-32-characters";
  const grant = signRecoveryGrant("user-one", "session-one", secret, 1000);
  assert.equal(
    validRecoveryGrant(grant, "user-one", "session-one", secret, 1001),
    true,
  );
  for (const [user, session, key, now] of [
    ["user-two", "session-one", secret, 1001],
    ["user-one", "session-two", secret, 1001],
    ["user-one", "session-one", "other-secret", 1001],
    ["user-one", "session-one", secret, 901001],
  ])
    assert.equal(validRecoveryGrant(grant, user, session, key, now), false);
  assert.equal(
    validRecoveryGrant(
      grant.replace(/^./, "x"),
      "user-one",
      "session-one",
      secret,
      1001,
    ),
    false,
  );
  assert.equal(
    validRecoveryGrant(undefined, "user-one", "session-one", secret, 1001),
    false,
  );
});

test("production CSP requires script nonces, blocks framing, and permits only intended connections", () => {
  const policy = contentSecurityPolicy(
    "test-nonce",
    false,
    "https://example.supabase.co",
  );
  const script = policy
    .split("; ")
    .find((item) => item.startsWith("script-src"));
  assert.match(script, /'nonce-test-nonce'/);
  assert.match(script, /'strict-dynamic'/);
  assert.doesNotMatch(script, /unsafe-inline|unsafe-eval/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /wss:\/\/example.supabase.co/);
  assert.match(
    contentSecurityPolicy("nonce", true, "https://example.supabase.co"),
    /unsafe-eval/,
  );
});

test("page parameters are bounded and spreadsheet formulas cannot execute through CSV cells", () => {
  for (const value of [undefined, "0", "-1", "NaN", "1.5"])
    assert.equal(applicationPageNumber(value), 1);
  assert.equal(applicationPageNumber("999999999"), 100000);
  assert.equal(applicationPageNumber("2"), 2);
  for (const value of ["=SUM(A1)", " +cmd", "\t=cmd", "\r@cmd", "-1", "@cmd"])
    assert.ok(csvCell(value).startsWith("\"'"));
  assert.equal(csvCell('Normal "value"'), '"Normal ""value"""');
});

test("profile and recovery password actions enforce their proof and distinct return paths", async () => {
  const originalLoad = Module._load;
  const calls = [];
  let allowed = true;
  let passwordCorrect = true;
  let userPresent = true;
  const client = {
    auth: {
      getUser: async () => ({
        data: {
          user: userPresent
            ? { id: "user", email: "member@utdallas.edu" }
            : null,
        },
        error: null,
      }),
      getClaims: async () => ({ data: { claims: { session_id: "session" } } }),
      signInWithPassword: async (input) => {
        calls.push(["reauth", input.email]);
        return {
          data: { user: passwordCorrect ? { id: "user" } : null },
          error: passwordCorrect ? null : { message: "incorrect" },
        };
      },
      updateUser: async () => {
        calls.push(["update"]);
        return { error: null };
      },
      signOut: async (input) => {
        calls.push(["signOut", input.scope]);
        return { error: null };
      },
    },
  };
  Module._load = function (name, ...args) {
    if (name === "next/navigation")
      return {
        redirect(destination) {
          throw Object.assign(new Error("redirect"), { destination });
        },
      };
    if (name === "@/lib/supabase/server")
      return { createClient: async () => client };
    if (name === "@/lib/password-recovery")
      return {
        canRecoverPassword: async () => allowed,
        clearPasswordRecovery: async () => calls.push(["clear"]),
        clearLocalAuthCookies: async () => calls.push(["clearLocalAuth"]),
      };
    return originalLoad.call(this, name, ...args);
  };
  try {
    const {
      changePassword,
      recoverPassword,
    } = require("../src/app/dashboard/profile/password-actions.ts");
    const state = { status: "idle", message: "" };
    const form = new FormData();
    form.set("password", "ExampleNewPass123!");
    form.set("confirmPassword", "ExampleNewPass123!");
    assert.match(
      (await changePassword(state, form)).message,
      /current password/,
    );
    assert.equal(
      calls.some((item) => item[0] === "update"),
      false,
    );
    form.set("currentPassword", "ExampleOldPass123!");
    passwordCorrect = false;
    assert.match((await changePassword(state, form)).message, /incorrect/);
    assert.equal(
      calls.some((item) => item[0] === "update"),
      false,
    );
    passwordCorrect = true;
    await assert.rejects(
      changePassword(state, form),
      (error) =>
        error.destination === "/dashboard/profile?message=password-updated",
    );
    assert.ok(
      calls.some((item) => item[0] === "signOut" && item[1] === "others"),
    );
    calls.length = 0;
    allowed = false;
    assert.match(
      (await recoverPassword(state, form)).message,
      /invalid or has expired/,
    );
    assert.equal(
      calls.some((item) => item[0] === "update"),
      false,
    );
    allowed = true;
    await assert.rejects(
      recoverPassword(state, form),
      (error) => error.destination === "/login?password=updated",
    );
    assert.ok(
      calls.some((item) => item[0] === "signOut" && item[1] === "global"),
    );
    const originalSignOut = client.auth.signOut;
    client.auth.signOut = async (input) => {
      calls.push(["signOut", input.scope]);
      return { error: { message: "Simulated session revocation failure" } };
    };
    calls.length = 0;
    await assert.rejects(
      recoverPassword(state, form),
      (error) =>
        error.destination === "/login?password=updated-sessions-warning",
    );
    assert.ok(calls.some((item) => item[0] === "clearLocalAuth"));
    client.auth.signOut = originalSignOut;
    userPresent = false;
    calls.length = 0;
    assert.match((await recoverPassword(state, form)).message, /expired/);
    assert.equal(
      calls.some((item) => item[0] === "update"),
      false,
    );
  } finally {
    Module._load = originalLoad;
  }
});

test("delivery leases skip duplicates; explicit provider failures retry; ambiguous sends require review", async () => {
  const originalDeno = global.Deno,
    originalFetch = global.fetch;
  global.Deno = {
    env: {
      get: (key) =>
        ({
          SITE_URL: "https://gdgutd.com",
          BREVO_SENDER_EMAIL: "sender@example.com",
          BREVO_API_KEY: "test-key",
        })[key],
    },
  };
  const {
    deliverQueuedEmail,
  } = require("../supabase/functions/_shared/application-email.ts");
  const updates = [];
  let claim = true;
  const item = {
    id: 1,
    opening_id: 1,
    attempts: 1,
    recipient: "test@example.com",
    template_key: "confirmation",
    provider_idempotency_key: "11111111-1111-4111-8111-111111111111",
    payload: { first_name: "Test" },
    lease_token: "lease",
  };
  const client = {
    rpc: async () => ({ data: claim ? [item] : [], error: null }),
    from: (table) => {
      if (table === "application_openings")
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          single: async () => ({
            data: {
              email_templates: { confirmation: { brevo_template_id: 1 } },
            },
            error: null,
          }),
        };
      return {
        update(data) {
          updates.push(data);
          return this;
        },
        eq() {
          return this;
        },
        select() {
          return this;
        },
        maybeSingle: async () => ({ data: { id: 1 }, error: null }),
      };
    },
  };
  try {
    claim = false;
    assert.equal((await deliverQueuedEmail(client, 1)).skipped, true);
    assert.equal(updates.length, 0);
    claim = true;
    global.fetch = async (_url, options) => {
      assert.equal(
        JSON.parse(options.body).headers.idempotencyKey,
        item.provider_idempotency_key,
      );
      return new Response(JSON.stringify({ code: "rate_limit" }), {
        status: 429,
      });
    };
    assert.equal((await deliverQueuedEmail(client, 1)).retryScheduled, true);
    assert.equal(updates.at(-1).status, "failed");
    global.fetch = async () => {
      throw new Error("network failed");
    };
    assert.equal((await deliverQueuedEmail(client, 1)).uncertain, true);
    assert.equal(updates.at(-1).status, "uncertain");
    global.fetch = async () =>
      new Response(JSON.stringify({ messageId: "provider-id" }), {
        status: 201,
      });
    assert.equal((await deliverQueuedEmail(client, 1)).sent, true);
    assert.equal(updates.at(-1).status, "sent");
    global.fetch = async () =>
      new Response(JSON.stringify({ code: "duplicate_parameter" }), {
        status: 400,
      });
    assert.equal((await deliverQueuedEmail(client, 1)).alreadySent, true);
  } finally {
    global.Deno = originalDeno;
    global.fetch = originalFetch;
  }
});

test("CSV export streams every row across bounded batches and escapes formulas", async () => {
  const originalLoad = Module._load;
  const schema = {
    sections: [
      {
        id: "one",
        title: "One",
        fields: [
          { id: "answer", label: "Work", type: "short_text", required: true },
        ],
      },
    ],
  };
  const records = Array.from({ length: 451 }, (_, index) => ({
    id: index + 1,
    applicant_first_name: "Test",
    applicant_last_name: "Member",
    applicant_email: "member@example.com",
    submitted_at: "2026-01-01T00:00:00Z",
    submission_state: "submitted",
    published_decision: "undecided",
    form_schema_snapshot: schema,
    responses: { answer: index === 0 ? "=1+1" : `Answer ${index + 1}` },
    application_openings: {
      id: 1,
      title: "Tech officer",
      form_schema: schema,
      details: [],
      responsibilities: [],
    },
  }));
  const batchSizes = [];
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: "admin" } } }) },
    from: (table) => {
      if (table === "application_admins")
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({ data: { role: "admin" } }),
        };
      let after = 0,
        maximum = Infinity,
        size = Infinity;
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        gt(_column, value) {
          after = value;
          return this;
        },
        lte(column, value) {
          if (column === "id") maximum = value;
          return this;
        },
        order() {
          return this;
        },
        limit(value) {
          size = value;
          batchSizes.push(value);
          return this;
        },
        then(resolve) {
          return Promise.resolve(
            resolve({
              data: records
                .filter((item) => item.id > after && item.id <= maximum)
                .slice(0, size),
              error: null,
            }),
          );
        },
      };
    },
  };
  Module._load = function (name, ...args) {
    if (name === "@/lib/supabase/server")
      return { createClient: async () => client };
    return originalLoad.call(this, name, ...args);
  };
  try {
    const { GET } = require("../src/app/admin/applications/export/route.ts");
    const response = await GET();
    assert.equal(response.status, 200);
    const csv = await response.text();
    assert.equal(csv.trim().split("\r\n").length, 452);
    assert.match(csv, /'=1\+1/);
    assert.match(csv, /Answer 451/);
    assert.equal(batchSizes.length, 6);
    assert.ok(batchSizes.every((size) => size === 200));
  } finally {
    Module._load = originalLoad;
  }
});
