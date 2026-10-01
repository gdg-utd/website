import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { advisors } from "@/data/advisors";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about GDG UTDallas, its programs, and the people who support the chapter.",
};

const programs = [
  {
    number: "01",
    title: "Technical events",
    description: "Workshops and technical sessions cover practical tools, current technologies, and guided project builds.",
    accent: "blue",
  },
  {
    number: "02",
    title: "SPRINT",
    description: "An eight-week program where mentees build a project in small teams with support from a mentor.",
    accent: "green",
  },
  {
    number: "03",
    title: "Community",
    description: "Meetups and social events give students a straightforward way to meet other people interested in technology.",
    accent: "yellow",
  },
];

export default function AboutPage() {
  return (
    <div className="about-page">
      <SiteHeader />

      <main>
        <section className="about-page-hero shell">
          <div className="about-page-copy">
            <p className="section-label">About GDG UTDallas</p>
            <h1>A student developer community at UT Dallas.</h1>
            <p>
              GDG on Campus UTD brings students together through technical events, collaborative projects, and opportunities to learn from one another.
            </p>
          </div>
          <div className="about-page-art">
            <span aria-hidden="true" />
            <Image
              src="/illustrations/about-community.svg"
              alt="An illustration of a student studying at a desk"
              width={849}
              height={842}
              loading="eager"
            />
          </div>
        </section>

        <section className="about-mission">
          <div className="shell about-mission-layout">
            <div>
              <p className="section-label">What we do</p>
              <h2>Learn, build, and meet other developers.</h2>
            </div>
            <div className="about-mission-copy">
              <p>
                Our events are designed for students at different experience levels. Some sessions introduce a tool or topic; others give participants time to build, ask questions, and work alongside a team.
              </p>
              <p>
                The chapter is run by student officers. Programs and events change throughout the year based on what students want to learn and build.
              </p>
            </div>
          </div>
        </section>

        <section className="about-programs-page shell" aria-labelledby="about-programs-title">
          <div className="about-page-heading">
            <p className="section-label">Programs and events</p>
            <h2 id="about-programs-title">What you can take part in.</h2>
          </div>
          <div className="about-program-grid">
            {programs.map((program) => (
              <article className={`about-program-card about-program-${program.accent}`} key={program.number}>
                <span>{program.number}</span>
                <h3>{program.title}</h3>
                <p>{program.description}</p>
              </article>
            ))}
          </div>
          <div className="about-program-links">
            <Link href="/sprints">Learn about SPRINT <span aria-hidden="true">→</span></Link>
            <Link href="/#events">View upcoming events <span aria-hidden="true">→</span></Link>
          </div>
        </section>

        <section className="advisor-section" aria-labelledby="advisor-title">
          <div className="shell">
            <div className="advisor-heading">
              <div>
                <p className="section-label">Chapter advisors</p>
                <h2 id="advisor-title">Our advisors</h2>
              </div>
              <p>Advisor names, roles, and photographs can be added here when they are ready.</p>
            </div>
            <div className="advisor-grid">
              {advisors.map((advisor, index) => (
                <article className="advisor-card" key={`${advisor.name || "advisor"}-${index}`}>
                  <div className="advisor-photo">
                    {advisor.photo ? (
                      <Image src={advisor.photo} alt={advisor.name || "GDG UTDallas advisor"} fill sizes="(max-width: 720px) 100vw, 50vw" />
                    ) : (
                      <span>Advisor photo</span>
                    )}
                  </div>
                  <div>
                    <h3>{advisor.name || "Advisor profile"}</h3>
                    <p>{advisor.role || "Name and role coming soon"}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-note shell">
          <p className="section-label">About this website</p>
          <p>This is an independent, community-run website for GDG UTDallas. It is not an official website of The University of Texas at Dallas.</p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
