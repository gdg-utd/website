import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Apply",
  description: "View open SPRINT positions at GDG UTDallas.",
};

const openPositions = [
  {
    id: "sprint-officer",
    eyebrow: "Program team",
    title: "SPRINT officer",
    description:
      "Help plan the eight-week program, coordinate with mentors, and support project teams from kickoff through showcase day.",
    details: [
      ["Commitment", "Weekly during SPRINT"],
      ["Good fit for", "Organizers and team leads"],
    ],
    responsibilities: [
      "Keep weekly program logistics on track",
      "Support mentors and mentee teams",
      "Help run kickoff and showcase events",
    ],
    accent: "blue",
  },
  {
    id: "sprint-mentee",
    eyebrow: "Project participant",
    title: "SPRINT mentee",
    description:
      "Join a small team, work with a mentor, and build a project to present at the end of the program.",
    details: [
      ["Program length", "Eight weeks"],
      ["Experience", "No prior experience required"],
    ],
    responsibilities: [
      "Meet with your team each week",
      "Learn and contribute as the project develops",
      "Present the finished project at the showcase",
    ],
    accent: "green",
  },
] as const;

export default function ApplyPage() {
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
              priority
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
              {openPositions.map((position, index) => (
                <article
                  className={`application-position application-position-${position.accent}`}
                  id={position.id}
                  key={position.id}
                >
                  <header className="application-position-header">
                    <span className="application-position-number">{String(index + 1).padStart(2, "0")}</span>
                    <span className="application-position-status"><i aria-hidden="true" />Open</span>
                  </header>

                  <div className="application-position-copy">
                    <p>{position.eyebrow}</p>
                    <h3>{position.title}</h3>
                    <p>{position.description}</p>
                  </div>

                  <dl className="application-position-details">
                    {position.details.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="application-position-footer">
                    <ul>
                      {position.responsibilities.map((responsibility) => <li key={responsibility}>{responsibility}</li>)}
                    </ul>
                    {/* Connect this button to the position's form route when that page is built. */}
                    <button type="button">Apply <span aria-hidden="true">→</span></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
