/* eslint-disable @typescript-eslint/no-require-imports -- Isolated PostgreSQL integration harness. */
const fs = require("node:fs"),
  path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { pgcrypto } = require("@electric-sql/pglite/contrib/pgcrypto");
const root = path.resolve(__dirname, "..");
(async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create schema extensions; create extension pgcrypto with schema extensions; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb,deleted_at timestamptz); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to public;`,
  );
  const files = fs
    .readdirSync(root + "/supabase/migrations")
    .filter((x) => x.endsWith(".sql"))
    .sort();
  for (const file of files.filter((x) => x < "20261025004702")) {
    try {
      await db.exec(
        fs.readFileSync(root + "/supabase/migrations/" + file, "utf8"),
      );
    } catch (error) {
      console.log("BASE MIGRATION FAILED", file, error.message);
      throw error;
    }
  }
  const uid = "11111111-1111-4111-8111-111111111111";
  await db.exec(
    `insert into auth.users(id,email,raw_user_meta_data) values('${uid}','local-test@utdallas.edu','{"first_name":"Local","last_name":"Test"}'); select set_config('request.jwt.claim.sub','${uid}',false); insert into public.application_admins(user_id,role) values('${uid}','admin'); update public.profiles set degree='Bachelor of Science',major='Computer Science' where id='${uid}'; alter table public.applications disable trigger user;`,
  );
  await db.exec(`insert into public.applications(opening_id,applicant_id,applicant_email,applicant_first_name,applicant_last_name,form_version,responses,submission_state,submitted_at)
 select o.id,'${uid}','local-test@utdallas.edu','Local','Test',case when o.slug='industry-officer' then o.form_version-1 else o.form_version end,
 (select jsonb_object_agg(f->>'id',case when f->>'id'='degree' then to_jsonb('Bachelor of Science'::text) when f->>'id'='major' then to_jsonb('Computer Science'::text) when f->>'type'='checkbox' then 'true'::jsonb when f->>'type'='single_choice' then to_jsonb(f->'options'->0->>'value') when f->>'type'='multiple_choice' then jsonb_build_array(f->'options'->0->>'value') when f->>'type'='url' then to_jsonb('https://example.com'::text) else to_jsonb('Local test answer'::text) end) from jsonb_array_elements(o.form_schema->'sections') s cross join lateral jsonb_array_elements(s->'fields') f),
 case when o.slug='industry-officer' then 'draft' else 'submitted' end,case when o.slug='industry-officer' then null else now() end
 from public.application_openings o where o.slug in ('tech-officer','industry-officer'); alter table public.applications enable trigger user;`);
  // Only Supabase-managed infrastructure is stubbed. All application SQL, RLS, triggers and functions execute in PostgreSQL.
  await db.exec(
    `create schema vault;create table vault.secrets(id uuid default gen_random_uuid(),name text,decrypted_secret text);create view vault.decrypted_secrets as select * from vault.secrets;create function vault.create_secret(secret text,name text) returns uuid language sql as $$insert into vault.secrets(decrypted_secret,name) values(secret,name) returning id$$;`,
  );
  let migration = fs
    .readFileSync(
      root +
        "/supabase/migrations/20261025004702_harden_applications_and_delivery.sql",
      "utf8",
    )
    .replace("create extension if not exists pg_cron;", "")
    .replace(
      "create extension if not exists pg_net with schema extensions;",
      "",
    );
  await db.exec(migration);
  await db.exec(fs.readFileSync(root + "/supabase/migrations/" + files.find((file) => file.endsWith("_report_password_reset_limits.sql")), "utf8"));
  await db.exec(`select set_config('test.member_id','${uid}',false);`);
  await db.exec("begin");
  await db.exec(
    fs.readFileSync(root + "/tests/database-regressions.sql", "utf8"),
  );
  await db.exec("rollback");
  const beforeRoleUpdate = await db.query("select slug, form_schema, form_version, status, opens_at, closes_at, email_templates from public.application_openings order by slug");
  const applicationsBeforeRoleUpdate = await db.query("select * from public.applications order by id");
  await db.exec(fs.readFileSync(root + "/supabase/migrations/" + files.find((file) => file.endsWith("_update_f26_role_applications.sql")), "utf8"));
  const afterRoleUpdate = await db.query("select slug, form_schema, form_version, status, opens_at, closes_at, email_templates from public.application_openings order by slug");
  const assert = require("node:assert/strict");
  const updatedRoles = new Set(["sprint-mentee", "sprint-officer", "finance-officer", "tech-officer"]);
  for (const opening of afterRoleUpdate.rows) {
    const previous = beforeRoleUpdate.rows.find((row) => row.slug === opening.slug);
    if (!updatedRoles.has(opening.slug)) {
      assert.deepEqual(opening, previous);
      continue;
    }
    assert.equal(opening.form_version, previous.form_version + 1);
    for (const key of ["status", "opens_at", "closes_at", "email_templates"]) assert.deepEqual(opening[key], previous[key]);
    const sections = opening.form_schema.sections;
    const fields = sections.flatMap((section) => section.fields);
    assert.equal(new Set(fields.map((field) => field.id)).size, fields.length);
    assert.deepEqual(fields.filter((field) => ["degree", "major"].includes(field.id)), previous.form_schema.sections.flatMap((section) => section.fields).filter((field) => ["degree", "major"].includes(field.id)));
    const field = (id) => fields.find((item) => item.id === id);
    if (opening.slug === "sprint-mentee") {
      assert.equal(field("track").type, "single_choice");
      assert.deepEqual(field("track").options.map((option) => option.label), ["Backend", "Frontend", "AI/Machine Learning"]);
      assert.equal(field("meeting_preference").options.length, 3);
      assert.equal(field("time_restrictions").required, true);
      assert.equal(field("technical_skills").required, false);
      assert.equal(sections.find((section) => section.id === "agreements").fields.length, 2);
    } else {
      assert.equal(field("netid").required, true);
      assert.equal(field("portfolio_url").required, true);
      assert.equal(field("program_fit").required, false);
      assert.equal(field("other_roles").type, "multiple_choice");
      assert.equal(field("other_roles").required, false);
      assert.deepEqual(sections.find((section) => section.id === "agreements"), previous.form_schema.sections.find((section) => section.id === "agreements"));
      if (opening.slug === "sprint-officer") {
        assert.equal(field("meeting_availability").type, "multiple_choice");
        assert.equal(field("meeting_availability").required, true);
        assert.equal(field("track_interests").options.length, 4);
        assert.ok(field("project_idea"));
      } else {
        assert.equal(field("meeting_availability"), undefined);
        assert.equal(field("project_idea"), undefined);
      }
      if (opening.slug === "finance-officer") {
        const originalQuestions = previous.form_schema.sections.find((section) => section.id === "questionnaire").fields;
        assert.deepEqual(sections.find((section) => section.id === "questionnaire").fields.slice(0, originalQuestions.length), originalQuestions);
        assert.equal(field("technical_experience"), undefined);
      } else assert.ok(field("technical_experience"));
    }
  }
  assert.deepEqual((await db.query("select * from public.applications order by id")).rows, applicationsBeforeRoleUpdate.rows);
  console.log("PASS: F26 role questions, required fields, choice types, Finance question preservation, version increments and unchanged submitted applications.");
  console.log(
    "PASS: local PostgreSQL migration, program constraints, RSVP null guards, notification cycles, schema snapshots, retry leases/limits, pagination, reset quotas and privilege checks.",
  );
  await db.exec(
    `set role authenticated;select public.get_staff_application_page();reset role;`,
  );
  console.log("PASS: staff page executes with authenticated role and RLS.");
  await db.exec(`create schema cron; create schema net;
    create table cron.fixture_jobs(command text);
    create table net.fixture_requests(headers jsonb);
    create function cron.schedule(job_name text,schedule text,command text) returns bigint language sql as $$insert into cron.fixture_jobs values(command); select 1::bigint$$;
    create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$insert into net.fixture_requests values(headers); select 1::bigint$$;`);
  await db.exec(
    fs.readFileSync(
      root +
        "/supabase/migrations/20261025004741_schedule_application_email_retries.sql",
      "utf8",
    ),
  );
  const job = await db.query("select command from cron.fixture_jobs");
  await db.exec(job.rows[0].command);
  const authorized = await db.query(
    "select public.is_application_email_worker(headers->>'x-worker-token') as allowed from net.fixture_requests",
  );
  if (authorized.rows[0]?.allowed !== true)
    throw new Error("Worker schedule did not supply its private authorization");
  console.log(
    "PASS: schedule SQL supplies the private worker token to a stubbed local HTTP transport.",
  );
  await db.close();
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
