import type { Metadata } from "next";
import Image from "next/image";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { leadership, officerGroups, type Officer } from "@/data/officers";

export const metadata: Metadata = {
  title: "Officers",
  description: "Meet the student officers who organize GDG UTDallas.",
};

function OfficerCard({ officer, featured = false }: { officer: Officer; featured?: boolean }) {
  const isDirector = officer.role.includes("Director");
  const initials = officer.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  return (
    <article className={`team-member${featured ? " team-member-featured" : ""}${isDirector ? " team-member-director" : " team-member-officer"}`}>
      <div className="team-member-photo" aria-hidden={!officer.photo}>
        <div className="team-member-avatar">
          {officer.photo ? (
            <Image src={officer.photo} alt={`${officer.name}, ${officer.role}`} fill sizes={featured ? "(max-width: 720px) 70vw, 240px" : "(max-width: 720px) 35vw, 170px"} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
      </div>
      <div className="team-member-copy">
        <span className="team-member-rank">{featured ? "Chapter leadership" : isDirector ? "Director" : "Officer"}</span>
        <h3>{officer.name}</h3>
        <p>{officer.role}</p>
      </div>
    </article>
  );
}

export default function OfficersPage() {
  return (
    <div className="team-page">
      <SiteHeader />

      <main>
        <section className="team-hero shell">
          <div className="team-hero-copy">
            <p className="section-label">GDG UTDallas</p>
            <h1>Meet the officers.</h1>
            <p>The students who plan events, lead programs, and manage the chapter throughout the year.</p>
          </div>
          <div className="team-hero-art">
            <span className="team-art-grid" aria-hidden="true" />
            <Image
              src="/illustrations/productive-team.svg"
              alt="A hand-drawn illustration of teammates celebrating together"
              width={608}
              height={520}
              loading="eager"
            />
          </div>
        </section>

        <section className="team-leadership" id="leadership" aria-labelledby="leadership-title">
          <div className="shell">
            <div className="team-section-heading">
              <p className="section-label">Leadership</p>
              <h2 id="leadership-title">Chapter leads</h2>
            </div>
            <div className="team-leadership-grid">
              {leadership.map((officer) => <OfficerCard officer={officer} featured key={officer.name} />)}
            </div>
          </div>
        </section>

        <section className="team-departments shell" id="departments" aria-labelledby="departments-title">
          <div className="team-departments-intro">
            <p className="section-label">Officers</p>
            <h2 id="departments-title">Departments</h2>
          </div>

          <div className="team-group-list">
            {officerGroups.map((group, groupIndex) => (
              <section className={`team-group team-group-${group.accent}`} aria-labelledby={`officer-group-${groupIndex}`} key={group.name}>
                <header className="team-group-heading">
                  <span aria-hidden="true">{String(groupIndex + 1).padStart(2, "0")}</span>
                  <h2 id={`officer-group-${groupIndex}`}>{group.name}</h2>
                  <p>{group.members.length} {group.members.length === 1 ? "officer" : "officers"}</p>
                </header>
                <div className="team-member-grid">
                  {group.members.map((officer, officerIndex) => (
                    <OfficerCard officer={officer} key={`${officer.name}-${officer.role}-${officerIndex}`} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
