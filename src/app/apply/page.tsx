import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { applicantStatus, isOpeningAccepting, parseApplicationOpening } from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Apply",
  description: "View open SPRINT positions at GDG UTDallas.",
};

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const supabase = await createClient();
  const [{ data: openingRows }, { data: authData }] = await Promise.all([
    supabase.from("application_openings").select("*").eq("status", "open").order("id"),
    supabase.auth.getClaims(),
  ]);
  const userId = authData?.claims?.sub;
  const openings = (openingRows ?? []).map(parseApplicationOpening).filter(isOpeningAccepting);
  const { data: applications } = userId
    ? await supabase
      .from("applications")
      .select("opening_id, submission_state, published_decision")
      .eq("applicant_id", userId)
    : { data: null };
  const applicationsByOpening = new Map(applications?.map((application) => [application.opening_id, application]));

  return (
    <div className="apply-page">
      <SiteHeader />

      <main>
        <section className="apply-hero shell">
          <div className="apply-hero-copy">
            <p className="section-label">Applications</p>
            <h1>Find your place in SPRINT.</h1>
            <p>Review the roles currently accepting applications and choose the one that fits how you want to participate.</p>
            <Link className="secondary-link" href="/sprints">About the SPRINT program <span aria-hidden="true">→</span></Link>
          </div>
          <div className="apply-hero-art">
            <span aria-hidden="true" />
            <Image
              src="/illustrations/apply-workflow.svg"
              alt="An illustration of a person arranging a project workflow"
              width={784}
              height={725}
              loading="eager"
            />
          </div>
        </section>

        <section className="application-choices" aria-labelledby="application-choices-title">
          <div className="shell">
            <div className="apply-section-heading">
              <p className="section-label">Open positions</p>
              <h2 id="application-choices-title">Applications currently available.</h2>
            </div>

            <div className="application-position-grid">
              {openings.map((position, index) => {
                const application = applicationsByOpening.get(position.id);
                const status = application
                  ? applicantStatus(application.submission_state, application.published_decision)
                  : null;
                const href = application?.submission_state === "submitted"
                  ? "/dashboard"
                  : `/apply/${position.slug}`;

                return (
                <article
                  className={`application-position application-position-${position.accent}`}
                  id={position.slug}
                  key={position.slug}
                >
                  <header className="application-position-header">
                    <span className="application-position-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="application-position-status"><i aria-hidden="true" />{status ?? "Open"}</span>
                  </header>

                  <div className="application-position-copy">
                    <p>{position.eyebrow}</p>
                    <h3>{position.title}</h3>
                    <p>{position.description}</p>
                  </div>

                  <dl className="application-position-details">
                    {position.details.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="application-position-footer">
                    <ul>
                      {position.responsibilities.map((responsibility) => <li key={responsibility}>{responsibility}</li>)}
                    </ul>
                    <Link className="application-position-action" href={href}>
                      {application?.submission_state === "submitted" ? "View status" : application ? "Resume" : "Apply"}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
                );
              })}
            </div>
            {openings.length === 0 && (
              <div className="application-empty-state">
                <h3>No applications are open right now.</h3>
                <p>Check back for the next SPRINT application window.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
