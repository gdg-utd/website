import { DataUnavailable } from "@/components/data-unavailable";
import { normalizeQuery } from "@/lib/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  formatCentralDate,
  isOpeningAccepting,
  parseApplicationOpening,
  type ApplicationResponses,
} from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";
import { ApplicationForm } from "./application-form";

type ApplicationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ message?: string }>;
};

const notices: Record<string, { tone: string; text: string }> = {
  saved: { tone: "success", text: "Draft saved." },
  incomplete: { tone: "error", text: "Complete every required field before submitting." },
  closed: { tone: "error", text: "This application is not currently accepting responses." },
  locked: { tone: "error", text: "This application has already been submitted." },
  "too-large": { tone: "error", text: "Your responses are too long. Shorten them and try again." },
  failed: { tone: "error", text: "We could not save your application. Please try again." },
};

export async function generateMetadata({ params }: ApplicationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_openings")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();

  return {
    title: data ? `Apply — ${data.title}` : "Application",
    robots: { index: false, follow: false, nocache: true },
  };
}

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params, searchParams }: ApplicationPageProps) {
  const [{ slug }, rawQuery] = await Promise.all([params, searchParams]);
  const query = normalizeQuery(rawQuery);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) redirect(`/login?next=${encodeURIComponent(`/apply/${slug}`)}`);

  const [{ data: openingData, error: openingError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from("application_openings")
      .select("*")
      .eq("slug", slug)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (openingError || profileError) {
    console.error("Unable to load application form", openingError?.code ?? profileError?.code);
    return <><SiteHeader isSignedIn /><main id="main-content" tabIndex={-1}><DataUnavailable href={`/apply/${encodeURIComponent(slug)}`} label="this application" /></main></>;
  }
  if (profile && !profile.onboarding_completed_at) {
    redirect(`/onboarding?next=${encodeURIComponent(`/apply/${slug}`)}`);
  }

  if (!openingData) notFound();
  const opening = parseApplicationOpening(openingData);

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select("id, responses, submission_state, submitted_at, form_version")
    .eq("opening_id", opening.id)
    .eq("applicant_id", userId)
    .maybeSingle();

  if (applicationError) {
    console.error("Unable to load saved application", applicationError.code);
    return <><SiteHeader isSignedIn /><main id="main-content" tabIndex={-1}><DataUnavailable href={`/apply/${encodeURIComponent(slug)}`} label="your saved responses" /></main></>;
  }
  const responses = (application?.responses && typeof application.responses === "object" && !Array.isArray(application.responses)
    ? application.responses
    : {}) as ApplicationResponses;
  const notice = query.message ? notices[query.message] : undefined;
  const accepting = isOpeningAccepting(opening);
  const submitted = application?.submission_state === "submitted";

  return (
    <div className="application-form-page">
      <SiteHeader isSignedIn />
      <main id="main-content" tabIndex={-1}>
        <section className="application-form-hero shell">
          <div>
            <Link href="/apply" className="application-back">← All applications</Link>
            <p className="section-label">{opening.eyebrow}</p>
            <h1>{opening.title}</h1>
            <p>{opening.description}</p>
          </div>
          <dl>
            <div><dt>Form version</dt><dd>{(submitted ? application.form_version : opening.form_version).toFixed(1)}</dd></div>
            <div><dt>Status</dt><dd>{submitted ? "Submitted" : accepting ? "Open" : "Closed"}</dd></div>
            {opening.closes_at && <div><dt>Closes</dt><dd>{formatCentralDate(opening.closes_at)} CT</dd></div>}
          </dl>
        </section>

        <section className="application-form-section">
          <div className="application-form-shell">
            {notice && <p className={`application-form-notice application-form-notice-${notice.tone}`} role="status">{notice.text}</p>}

            {submitted ? (
              <div className="application-locked-panel">
                <p className="section-label">Application received</p>
                <h2>Your application is submitted.</h2>
                <p>Submitted {formatCentralDate(application.submitted_at)} CT. Submitted applications cannot be edited.</p>
                <Link className="primary-link" href="/dashboard">View dashboard <span aria-hidden="true">→</span></Link>
              </div>
            ) : !accepting ? (
              <div className="application-locked-panel">
                <p className="section-label">Applications closed</p>
                <h2>This form is not accepting responses.</h2>
                <Link className="secondary-link" href="/apply">View available positions</Link>
              </div>
            ) : (
              <ApplicationForm opening={opening} initialResponses={responses} />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
