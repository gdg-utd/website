import Image from "next/image";
import Link from "next/link";
import {
  CHAPTER_URL,
  DISCORD_URL,
  INSTAGRAM_URL,
  LINKTREE_URL,
  getChapterData,
  type ChapterEvent,
} from "@/lib/gdg";

function eventDate(date: string) {
  const value = new Date(date);

  return {
    day: new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      timeZone: "America/Chicago",
    }).format(value),
    month: new Intl.DateTimeFormat("en-US", {
      month: "short",
      timeZone: "America/Chicago",
    })
      .format(value)
      .toUpperCase(),
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "America/Chicago",
    }).format(value),
  };
}

function EventRow({ event, index }: { event: ChapterEvent; index: number }) {
  const date = eventDate(event.startDate);

  return (
    <article className="event-row">
      <div className="event-date" aria-label={`${date.weekday}, ${date.month} ${date.day}`}>
        <span>{date.month}</span>
        <strong>{date.day}</strong>
        <small>{date.weekday}</small>
      </div>
      <div className="event-details">
        <p className="event-meta">{event.registrationType}</p>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
      </div>
      <a className="event-link" href={event.url} target="_blank" rel="noreferrer">
        View &amp; RSVP <span aria-hidden="true">↗</span>
        <span className="sr-only"> for {event.title}</span>
      </a>
      <span className="event-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
    </article>
  );
}

export default async function Home() {
  const chapter = await getChapterData();

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="GDG on Campus UTD home">
            <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
            <span>The University of Texas at Dallas</span>
          </a>
          <nav className="nav" aria-label="Primary navigation">
            <a href="#about">About</a>
            <a href="#events">Events</a>
            <a href="#gallery">Gallery</a>
            <Link href="/team">Team</Link>
          </nav>
          <a className="chapter-link" href={CHAPTER_URL} target="_blank" rel="noreferrer">Join chapter ↗</a>
          <div className="auth-links">
            <Link className="login-link" href="/login">Log in</Link>
            <Link className="header-action" href="/signup">Sign up</Link>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="hero-graphics" aria-hidden="true">
            <span className="hero-grid" />
            <span className="accent-line accent-blue" />
            <span className="accent-line accent-red" />
            <span className="accent-line accent-yellow" />
            <span className="accent-line accent-green" />
            <span className="accent-ring ring-blue" />
            <span className="accent-ring ring-red" />
          </div>
          <div className="hero-copy">
            <p className="overline">Google Developer Groups</p>
            <h1 id="hero-title">GDG on Campus<br /><span>UT Dallas.</span></h1>
            <p className="hero-intro">
              GDG on Campus UTD organizes workshops, project programs, and meetups for students interested in software and technology.
            </p>
            <div className="hero-actions">
              <a className="primary-button" href={CHAPTER_URL} target="_blank" rel="noreferrer">
                Join the chapter <span aria-hidden="true">↗</span>
              </a>
              <a className="secondary-link" href={DISCORD_URL} target="_blank" rel="noreferrer">
                Join Discord <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
          <div className="hero-illustration">
            <Image
              src="/illustrations/engineering-team.svg"
              alt="An unDraw illustration of an engineering team collaborating around technology"
              width={867}
              height={443}
              priority
            />
          </div>
        </section>

        {chapter.events[0] && (
          <a className="next-event-bar" href={chapter.events[0].url} target="_blank" rel="noreferrer">
            <span className="live-dot" />
            <strong>Next event</strong>
            <span>{chapter.events[0].title}</span>
            <span className="next-event-date">
              {eventDate(chapter.events[0].startDate).month} {eventDate(chapter.events[0].startDate).day}
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        )}

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="shell about-layout">
            <div className="about-illustration">
              <Image
                src="/illustrations/education.svg"
                alt="An unDraw illustration about learning and education"
                width={800}
                height={618}
              />
            </div>
            <div className="about-copy">
              <p className="section-label">About</p>
              <h2 id="about-title">A student developer community at UT Dallas.</h2>
              <p className="large-copy">
                We organize workshops, technical sessions, and collaborative projects throughout the semester. Events are open to students at any experience level.
              </p>
              <div className="about-programs">
                <p>
                  <strong>On the calendar:</strong> guided builds on Workshop Wednesdays,
                  focused Technical Thursday sessions, and casual Sprint Socials.
                </p>
                <a href="#events">See upcoming events <span aria-hidden="true">↓</span></a>
              </div>
            </div>
          </div>
        </section>

        <section className="events-section shell" id="events" aria-labelledby="events-title">
          <div className="section-intro">
            <div>
              <p className="section-label">Events</p>
              <h2 id="events-title">Upcoming events</h2>
            </div>
            <div className="sync-note">
              <span className="sync-mark" />
              <p>View upcoming events and RSVP through the official GDG event page.</p>
            </div>
          </div>

          <div className="event-list">
            {chapter.events.length ? (
              chapter.events.map((event, index) => (
                <EventRow event={event} index={index} key={`${event.startDate}-${event.title}`} />
              ))
            ) : (
              <div className="no-events">
                <p>No upcoming events are currently listed.</p>
                <a href={CHAPTER_URL} target="_blank" rel="noreferrer">Check the official chapter page ↗</a>
              </div>
            )}
          </div>

          <div className="events-footer">
            <Image src="/brand/gdg-event-default.webp" alt="Official Google Developer Groups event artwork" width={500} height={500} />
            <div>
              <p className="section-label">Event archive</p>
              <h3>View complete event details and past sessions on the chapter page.</h3>
              <a href={CHAPTER_URL} target="_blank" rel="noreferrer">Open the chapter calendar <span aria-hidden="true">↗</span></a>
            </div>
          </div>
        </section>

        <section className="gallery-section" id="gallery" aria-labelledby="gallery-title">
          <div className="shell">
            <div className="gallery-heading">
              <div>
                <p className="section-label">Event gallery</p>
                <h2 id="gallery-title">Photos from GDG UTD.</h2>
              </div>
              <p>Photos from workshops and meetups will be added here.</p>
            </div>
            <div className="gallery-grid">
              <div className="photo-slot photo-slot-large"><span>Event photo</span><small>01</small></div>
              <div className="photo-slot photo-slot-blue"><span>Workshop photo</span><small>02</small></div>
              <div className="photo-slot photo-slot-yellow"><span>Community photo</span><small>03</small></div>
            </div>
          </div>
        </section>

        <section className="sprint-home-section" aria-labelledby="sprint-home-title">
          <div className="shell sprint-home-layout">
            <div className="sprint-home-art">
              <span className="sprint-home-shape" aria-hidden="true" />
              <Image
                src="/illustrations/sprint-team-assignment.svg"
                alt="An illustration of a mentor and students working on a team assignment"
                width={960}
                height={654}
              />
            </div>
            <div className="sprint-home-copy">
              <p className="section-label">SPRINT program</p>
              <h2 id="sprint-home-title">An eight-week mentored project program.</h2>
              <p>
                Participants work in small teams, meet regularly with a mentor, and build a project to present at the end of the program.
              </p>
              <div className="sprint-home-flow" aria-label="SPRINT program flow">
                <span>Form a team</span><i aria-hidden="true">→</i>
                <span>Build together</span><i aria-hidden="true">→</i>
                <span>Present the project</span>
              </div>
              <Link className="primary-button" href="/sprint#sprint-top">Learn about SPRINT <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        <section className="team-teaser shell" aria-labelledby="team-title">
          <div className="team-teaser-art">
            <Image src="/illustrations/teamwork.svg" alt="An unDraw illustration representing teamwork" width={960} height={636} />
          </div>
          <div className="team-teaser-copy">
            <p className="section-label">Organizers</p>
            <h2 id="team-title">Meet the team.</h2>
            <p>Meet the students who organize events and run GDG UTD.</p>
            <Link className="primary-button" href="/team">Meet the team <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-main">
          <div className="footer-brand">
            <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} />
            <p>On Campus · The University of Texas at Dallas</p>
          </div>
          <div className="footer-groups">
            <div className="footer-nav">
              <strong>Explore</strong>
              <a href="#about">About</a><a href="#events">Events</a><Link href="/sprint">SPRINT</Link><Link href="/team">Team</Link>
            </div>
            <div className="footer-nav">
              <strong>Connect</strong>
              <a href={DISCORD_URL} target="_blank" rel="noreferrer">Discord ↗</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">Instagram ↗</a>
              <a href={LINKTREE_URL} target="_blank" rel="noreferrer">Linktree ↗</a>
            </div>
            <div className="footer-nav">
              <strong>Account</strong>
              <Link href="/login">Log in</Link><Link href="/signup">Sign up</Link>
              <a href={CHAPTER_URL} target="_blank" rel="noreferrer">Official GDG page ↗</a>
            </div>
          </div>
        </div>
        <div className="shell footer-legal">
          <p>Independent community-run website. Not an official website of The University of Texas at Dallas.</p>
          <p>GDG and Google Developer Groups are trademarks of Google LLC.</p>
        </div>
      </footer>
    </div>
  );
}
