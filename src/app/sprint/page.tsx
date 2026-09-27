import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CHAPTER_URL, DISCORD_URL } from "@/lib/gdg";

export const metadata: Metadata = {
  title: "SPRINT Program",
  description:
    "Learn about the eight-week, mentor-led SPRINT project program from GDG UTDallas.",
};

const phases = [
  {
    weeks: "Week 1",
    title: "Meet the team",
    description: "Get matched with teammates and a mentor, then choose the problem your group wants to work on.",
    color: "blue",
  },
  {
    weeks: "Week 2",
    title: "Set the scope",
    description: "Turn the idea into a practical plan, agree on responsibilities, and set up the project repository.",
    color: "red",
  },
  {
    weeks: "Weeks 3–7",
    title: "Build and review",
    description: "Develop the project in weekly cycles, share progress with your mentor, and adjust the plan as needed.",
    color: "yellow",
  },
  {
    weeks: "Week 8",
    title: "Present the project",
    description: "Polish the demo, document the work, and present the final project at the SPRINT showcase.",
    color: "green",
  },
];

const projectSlots = [
  { number: "01", accent: "blue" },
  { number: "02", accent: "red" },
  { number: "03", accent: "green" },
];

export default function SprintPage() {
  return (
    <div className="sprint-page">
      <header className="sprint-header">
        <div className="shell sprint-header-inner">
          <Link href="/" aria-label="Return to the GDG UTDallas homepage">
            <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
          </Link>
          <nav aria-label="SPRINT page navigation">
            <a href="#program">Program</a>
            <a href="#projects">Projects</a>
            <a href="#sprint-gallery">Photos</a>
          </nav>
          <Link className="sprint-home-link" href="/">Back to home</Link>
        </div>
      </header>

      <main>
        <section className="sprint-hero shell" id="sprint-top">
          <div className="sprint-hero-copy">
            <p className="section-label">GDG UTDallas · SPRINT</p>
            <h1>An eight-week mentored project program.</h1>
            <p>
              SPRINT brings students into small project teams, with a mentor helping each group move from an idea to a finished demo.
            </p>
            <div className="sprint-hero-actions">
              <a className="primary-button" href="#program">See how it works <span aria-hidden="true">↓</span></a>
              <a className="secondary-link" href="#projects">Explore projects <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <div className="sprint-hero-art">
            <span className="sprint-art-grid" aria-hidden="true" />
            <Image
              src="/illustrations/sprint-sharing-knowledge.svg"
              alt="An illustration of a mentor sharing knowledge with a student"
              width={800}
              height={727}
              priority
            />
          </div>
        </section>

        <section className="sprint-facts" aria-label="SPRINT program summary">
          <div className="shell sprint-facts-inner">
            <div><strong>8</strong><span>weeks</span></div>
            <div><strong>Small</strong><span>project teams</span></div>
            <div><strong>Mentor</strong><span>for each team</span></div>
            <div><strong>Final</strong><span>project showcase</span></div>
          </div>
        </section>

        <section className="sprint-program shell" id="program" aria-labelledby="sprint-program-title">
          <div className="sprint-program-intro">
            <p className="section-label">The program</p>
            <h2 id="sprint-program-title">From the first meeting to the final demo.</h2>
          </div>
          <div className="sprint-program-copy">
            <p>
              SPRINT is structured around making steady progress with a team. Participants bring different experience levels and interests; the project gives everyone a practical place to contribute.
            </p>
            <p>
              Mentors help teams make decisions, work through technical blockers, and keep the scope realistic. Teams still own the project and the final result.
            </p>
          </div>
        </section>

        <section className="sprint-timeline shell" aria-label="Eight-week SPRINT timeline">
          {phases.map((phase) => (
            <article className={`sprint-phase sprint-phase-${phase.color}`} key={phase.weeks}>
              <p>{phase.weeks}</p>
              <h3>{phase.title}</h3>
              <span>{phase.description}</span>
            </article>
          ))}
        </section>

        <section className="sprint-mentorship">
          <div className="shell sprint-mentorship-layout">
            <div className="sprint-mentorship-art">
              <Image
                src="/illustrations/sprint-group-project.svg"
                alt="An illustration of students collaborating on a group project"
                width={965}
                height={624}
              />
            </div>
            <div className="sprint-mentorship-copy">
              <p className="section-label">Mentorship and teamwork</p>
              <h2>Build with a team. Learn from someone who has done it before.</h2>
              <p>
                Each group has a mentor who provides technical direction and regular feedback. Mentees divide the work, review one another&apos;s progress, and make the important project decisions together.
              </p>
              <dl className="sprint-roles">
                <div><dt>Mentees</dt><dd>Design, build, test, and document the project.</dd></div>
                <div><dt>Mentors</dt><dd>Guide the process, review progress, and help unblock the team.</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="sprint-projects shell" id="projects" aria-labelledby="sprint-projects-title">
          <div className="sprint-section-heading">
            <div>
              <p className="section-label">Project showcase</p>
              <h2 id="sprint-projects-title">Built during SPRINT.</h2>
            </div>
            <p>Each finished project will include a short case study, the team, technology used, and a link to its GitHub repository.</p>
          </div>
          <div className="sprint-project-grid">
            {projectSlots.map((project) => (
              <article className={`sprint-project-card sprint-project-${project.accent}`} key={project.number}>
                <div className="sprint-project-topline">
                  <span>Repository {project.number}</span>
                  <span aria-hidden="true">↗</span>
                </div>
                <div>
                  <p>SPRINT project</p>
                  <h3>Project details coming soon</h3>
                  <span>Team, project summary, technology, and GitHub repository</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="sprint-gallery" id="sprint-gallery" aria-labelledby="sprint-gallery-title">
          <div className="shell">
            <div className="sprint-section-heading">
              <div>
                <p className="section-label">Inside the program</p>
                <h2 id="sprint-gallery-title">SPRINT in progress.</h2>
              </div>
              <p>Project teams, working sessions, and presentations from the SPRINT program.</p>
            </div>
            <div className="sprint-photo-grid">
              <div className="sprint-photo-column">
                <figure className="sprint-photo sprint-photo-four-three">
                  <Image
                    src="/pictures/sprint-community.jpg"
                    alt="SPRINT participants gathered in a lecture hall"
                    fill
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                  <figcaption>SPRINT community</figcaption>
                </figure>
                <figure className="sprint-photo sprint-photo-sixteen-nine">
                  <Image
                    src="/pictures/sprint-project-team.jpg"
                    alt="A SPRINT project team standing together"
                    fill
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                  <figcaption>Project team</figcaption>
                </figure>
              </div>
              <div className="sprint-photo-column">
                <figure className="sprint-photo sprint-photo-sixteen-nine">
                  <Image
                    src="/pictures/sprint-project-presentation.jpg"
                    alt="A SPRINT team presenting its project"
                    fill
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                  <figcaption>Project presentation</figcaption>
                </figure>
                <figure className="sprint-photo sprint-photo-four-three">
                  <Image
                    src="/pictures/sprint-gdg-team.jpg"
                    alt="A SPRINT team standing beside a We love GDG sign"
                    fill
                    sizes="(max-width: 760px) 100vw, 50vw"
                  />
                  <figcaption>Team photo</figcaption>
                </figure>
              </div>
            </div>
          </div>
        </section>

        <section className="sprint-join shell">
          <div className="sprint-join-art">
            <Image
              src="/illustrations/sprint-team-assignment.svg"
              alt="An illustration of a team planning and completing an assignment"
              width={960}
              height={654}
            />
          </div>
          <div className="sprint-join-copy">
            <p className="section-label">Join a future cohort</p>
            <h2>Follow the chapter for the next SPRINT announcement.</h2>
            <p>Cohort dates and participation details will be posted with the chapter&apos;s events.</p>
            <div>
              <a className="primary-button" href={DISCORD_URL} target="_blank" rel="noreferrer">Join Discord <span aria-hidden="true">↗</span></a>
              <a className="secondary-link" href={CHAPTER_URL} target="_blank" rel="noreferrer">View the chapter page <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell sprint-footer">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} />
          <p>Independent community-run website. Not an official website of The University of Texas at Dallas.</p>
          <Link href="/">Back to homepage</Link>
        </div>
      </footer>
    </div>
  );
}
