import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { requireApplicationAdmin } from "@/lib/application-admin";
import { formatCentralDate } from "@/lib/applications";

export const metadata: Metadata = { title: "Application portal" };
export const dynamic = "force-dynamic";

type AdminApplicationsPageProps = {
  searchParams: Promise<{
    position?: string;
    decision?: string;
    q?: string;
    message?: string;
  }>;
};

export default async function AdminApplicationsPage({ searchParams }: AdminApplicationsPageProps) {
  const filters = await searchParams;
  const { supabase } = await requireApplicationAdmin();
  const [{ data: applications }, { data: openings }, { data: stagedEvents }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, applicant_first_name, applicant_last_name, applicant_email, opening_id, submitted_at, published_decision, application_openings(slug, title, accent)")
      .eq("submission_state", "submitted")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("application_openings")
      .select("id, slug, title")
      .neq("status", "draft")
      .order("id"),
    supabase
      .from("application_events")
      .select("application_id, details, created_at, id")
      .eq("event_type", "decision_staged")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  const stagedByApplication = new Map<number, string>();
  for (const event of stagedEvents ?? []) {
    if (stagedByApplication.has(event.application_id)) continue;
    const decision = event.details && typeof event.details === "object" && !Array.isArray(event.details)
      ? event.details.decision
      : null;
    if (decision === "accepted" || decision === "rejected") {
      stagedByApplication.set(event.application_id, decision);
    }
  }

  const query = filters.q?.trim().toLowerCase() ?? "";
  const filtered = (applications ?? []).filter((application) => {
    const opening = application.application_openings;
    const searchValue = `${application.applicant_first_name} ${application.applicant_last_name} ${application.applicant_email}`.toLowerCase();
    const matchesPosition = !filters.position || opening?.slug === filters.position;
    const matchesDecision = !filters.decision
      || (filters.decision === "staged" && application.published_decision === "undecided" && stagedByApplication.has(application.id))
      || application.published_decision === filters.decision;
    return matchesPosition && matchesDecision && (!query || searchValue.includes(query));
  });

  const total = applications?.length ?? 0;
  const accepted = applications?.filter((application) => application.published_decision === "accepted").length ?? 0;
  const notSelected = applications?.filter((application) => application.published_decision === "rejected").length ?? 0;
  const awaiting = total - accepted - notSelected;

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" aria-label="GDG UTDallas home">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} loading="eager" />
        </Link>
        <nav>
          <Link href="/dashboard">Member dashboard</Link>
          <Link href="/admin/applications" aria-current="page">Applications</Link>
        </nav>
      </header>

      <div className="admin-shell">
        <div className="admin-title-row">
          <div>
            <p className="section-label">Internal portal</p>
            <h1>Applications</h1>
            <p>Review submitted SPRINT applications and publish decisions.</p>
          </div>
          <Link className="admin-export" href="/admin/applications/export" prefetch={false}>Export CSV <span aria-hidden="true">↓</span></Link>
        </div>

        {filters.message === "reopened" && <p className="admin-notice">The application was reopened and returned to the applicant.</p>}

        <section className="admin-metrics" aria-label="Application summary">
          <div><strong>{total}</strong><span>Submitted</span></div>
          <div><strong>{awaiting}</strong><span>Awaiting decision</span></div>
          <div><strong>{accepted}</strong><span>Accepted</span></div>
          <div><strong>{notSelected}</strong><span>Not selected</span></div>
        </section>

        <form className="admin-filters" method="get">
          <label>
            <span>Search</span>
            <input name="q" defaultValue={filters.q} placeholder="Name or email" />
          </label>
          <label>
            <span>Position</span>
            <select name="position" defaultValue={filters.position ?? ""}>
              <option value="">All positions</option>
              {openings?.map((opening) => <option value={opening.slug} key={opening.id}>{opening.title}</option>)}
            </select>
          </label>
          <label>
            <span>Decision</span>
            <select name="decision" defaultValue={filters.decision ?? ""}>
              <option value="">All decisions</option>
              <option value="undecided">Undecided</option>
              <option value="staged">Staged</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Not selected</option>
            </select>
          </label>
          <button type="submit">Apply filters</button>
          {(filters.q || filters.position || filters.decision) && <Link href="/admin/applications">Clear</Link>}
        </form>

        <section className="admin-table-card">
          <div className="admin-table-heading">
            <h2>Submitted applications</h2>
            <span>{filtered.length} shown</span>
          </div>
          {filtered.length > 0 ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Applicant</th><th>Position</th><th>Submitted</th><th>Decision</th><th><span className="sr-only">Open</span></th></tr></thead>
                <tbody>
                  {filtered.map((application) => {
                    const staged = stagedByApplication.get(application.id);
                    const decision = application.published_decision !== "undecided"
                      ? application.published_decision
                      : staged ? `${staged} staged` : "Undecided";
                    return (
                      <tr key={application.id}>
                        <td><strong>{application.applicant_first_name} {application.applicant_last_name}</strong><span>{application.applicant_email}</span></td>
                        <td>{application.application_openings?.title ?? "—"}</td>
                        <td>{formatCentralDate(application.submitted_at)} CT</td>
                        <td><span className={`admin-decision admin-decision-${decision.split(" ")[0].toLowerCase()}`}>{decision === "rejected" ? "Not selected" : decision}</span></td>
                        <td><Link href={`/admin/applications/${application.id}`} aria-label={`Review ${application.applicant_first_name} ${application.applicant_last_name}`}>Review →</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : <div className="admin-table-empty">No applications match these filters.</div>}
        </section>
      </div>
    </main>
  );
}
