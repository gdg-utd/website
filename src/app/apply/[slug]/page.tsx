import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  formatCentralDate,
  isOpeningAccepting,
  parseApplicationOpening,
  type ApplicationField,
  type ApplicationResponses,
} from "@/lib/applications";
import { createClient } from "@/lib/supabase/server";
import { saveApplication } from "./actions";
import { ApplicationSubmitControls } from "./submit-controls";

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

  return { title: data ? `Apply — ${data.title}` : "Application" };
}

export const dynamic = "force-dynamic";

export default async function ApplicationPage({ params, searchParams }: ApplicationPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getClaims();
  const userId = authData?.claims?.sub;

  if (!userId) redirect(`/login?next=${encodeURIComponent(`/apply/${slug}`)}`);

  const { data: openingData } = await supabase
    .from("application_openings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!openingData) notFound();
  const opening = parseApplicationOpening(openingData);

  const { data: application } = await supabase
    .from("applications")
    .select("id, responses, submission_state, submitted_at")
    .eq("opening_id", opening.id)
    .eq("applicant_id", userId)
    .maybeSingle();

  const responses = (application?.responses && typeof application.responses === "object" && !Array.isArray(application.responses)
    ? application.responses
    : {}) as ApplicationResponses;
  const notice = query.message ? notices[query.message] : undefined;
  const accepting = isOpeningAccepting(opening);
  const submitted = application?.submission_state === "submitted";

  return (
    <div className="application-form-page">
      <SiteHeader isSignedIn />
      <main>
        <section className="application-form-hero shell">
          <div>
            <Link href="/apply" className="application-back">← All applications</Link>
            <p className="section-label">{opening.eyebrow}</p>
            <h1>{opening.title}</h1>
            <p>{opening.description}</p>
          </div>
          <dl>
            <div><dt>Form version</dt><dd>{opening.form_version}</dd></div>
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
              <form className="application-form" action={saveApplication}>
                <input type="hidden" name="openingSlug" value={opening.slug} />
                {opening.form_schema.sections.map((section, sectionIndex) => (
                  <fieldset className="application-form-group" key={section.id}>
                    <legend>
                      <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                      <strong>{section.title}</strong>
                      {section.description && <small>{section.description}</small>}
                    </legend>
                    <div className="application-form-fields">
                      {section.fields.map((field) => (
                        <ApplicationInput field={field} value={responses[field.id]} key={field.id} />
                      ))}
                    </div>
                  </fieldset>
                ))}

                <div className="application-form-submit-row">
                  <p>Save a draft at any time. After submitting, contact the GDG UTDallas team if something needs to be corrected.</p>
                  <ApplicationSubmitControls />
                </div>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ApplicationInput({ field, value }: { field: ApplicationField; value: ApplicationResponses[string] | undefined }) {
  const id = `application-field-${field.id}`;
  const descriptionId = field.help ? `${id}-help` : undefined;
  const textValue = typeof value === "string" ? value : "";

  if (field.type === "checkbox") {
    return (
      <label className="application-checkbox" htmlFor={id}>
        <input id={id} name={`field:${field.id}`} type="checkbox" value="true" defaultChecked={value === true} required={field.required} />
        <span>{field.label}{field.required && <i aria-hidden="true"> *</i>}</span>
      </label>
    );
  }

  if (field.type === "single_choice" || field.type === "multiple_choice") {
    const selected = new Set(Array.isArray(value) ? value : [value]);
    return (
      <fieldset className="application-choice-field" aria-describedby={descriptionId}>
        <legend>{field.label}{field.required && <i aria-hidden="true"> *</i>}</legend>
        {field.help && <p id={descriptionId}>{field.help}</p>}
        <div className="application-options">
          {field.options?.map((option) => (
            <label key={option.value}>
              <input
                name={`field:${field.id}`}
                type={field.type === "single_choice" ? "radio" : "checkbox"}
                value={option.value}
                defaultChecked={selected.has(option.value)}
                required={field.required && field.type === "single_choice"}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <label className="application-text-field" htmlFor={id}>
      <span>{field.label}{field.required && <i aria-hidden="true"> *</i>}</span>
      {field.help && <small id={descriptionId}>{field.help}</small>}
      {field.type === "long_text" ? (
        <textarea
          id={id}
          name={`field:${field.id}`}
          defaultValue={textValue}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          aria-describedby={descriptionId}
          required={field.required}
          rows={7}
        />
      ) : (
        <input
          id={id}
          name={`field:${field.id}`}
          type={field.type === "url" ? "url" : "text"}
          defaultValue={textValue}
          placeholder={field.placeholder}
          maxLength={field.max_length}
          aria-describedby={descriptionId}
          required={field.required}
        />
      )}
    </label>
  );
}
