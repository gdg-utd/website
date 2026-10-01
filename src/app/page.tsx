import Image from "next/image";
import Link from "next/link";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { SiteHeader } from "@/components/site-header";
import {
  CHAPTER_URL,
  DISCORD_URL,
  INSTAGRAM_URL,
  LINKTREE_URL,
  getChapterData,
  type ChapterEvent,
} from "@/lib/gdg";
import { createClient } from "@/lib/supabase/server";

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

const faqs = [
  {
    question: "Who can attend GDG UTDallas events?",
    answer: "UT Dallas students interested in technology are welcome. Event pages list any capacity limits or specific requirements.",
  },
  {
    question: "Do I need coding experience?",
    answer: "No. Many workshops and the SPRINT program are designed to be approachable for beginners. If a session expects prior knowledge, it will be listed in the event description.",
  },
  {
    question: "How do I RSVP for an event?",
    answer: "Open an event from this website and complete the RSVP on the official Google Developer Groups event page.",
  },
  {
    question: "How can I keep up with new events?",
    answer: "Join the chapter and follow the Discord and Instagram links in the footer for announcements and program updates.",
  },
] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  const supabase = await createClient();
  const [chapter, { data: authData }, query] = await Promise.all([
    getChapterData(),
    supabase.auth.getClaims(),
    searchParams,
  ]);
  const isSignedIn = Boolean(authData?.claims?.sub);
  const authStatus = typeof query.auth === "string" ? query.auth : "";
  const authNotice = authStatus === "check-email" && !isSignedIn
    ? "Check your UT Dallas email to confirm your account."
    : authStatus === "confirmed" && isSignedIn
      ? "Your email is confirmed and you are signed in."
      : authStatus === "welcome" && isSignedIn
        ? "Your account is ready."
        : "";

  return (
    <div className="page">
      <SiteHeader isSignedIn={isSignedIn} />

      {authNotice && (
        <div className="auth-notice" role="status">
          <span aria-hidden="true">✓</span>
          <p>{authNotice}</p>
          <Link href="/">Dismiss</Link>
        </div>
      )}

      <main id="top">
        <section className="hero shell" aria-labelledby="hero-title">
          <HeroBackdrop />
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
            <ul className="hero-programs" aria-label="Chapter activities">
              <li><span aria-hidden="true" />Workshops</li>
              <li><span aria-hidden="true" />SPRINT projects</li>
              <li><span aria-hidden="true" />Community events</li>
            </ul>
          </div>
          <div className="hero-illustration">
            <Image
              src="/illustrations/hero-student-community.svg"
              alt="A colorful illustration of three students celebrating together"
              width={500}
              height={500}
              loading="eager"
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

        <section className="hackathon-feature shell" aria-labelledby="hackathon-title">
          <Image
            className="hackathon-feature-art"
            src="/pictures/hackathon-dino-game.png"
            alt=""
            fill
            sizes="(max-width: 720px) calc(100vw - 32px), 1180px"
            unoptimized
          />
          <div className="hackathon-feature-shade" aria-hidden="true" />
          <div className="hackathon-feature-copy">
            <p className="hackathon-feature-label">New chapter event</p>
            <h2 id="hackathon-title"><span>GDG UTDallas</span>Hackathon.</h2>
            <p>A student hackathon is on the way. Applications and full event details will be announced soon.</p>
            <div className="hackathon-feature-actions">
              <button type="button" disabled>Coming soon!</button>
              <div className="hackathon-pixels" aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="shell about-layout">
            <div className="about-illustration">
              <Image
                src="/illustrations/about-hand-drawn.svg"
                alt="A hand-drawn illustration of a person pointing toward the chapter information"
                width={328}
                height={370}
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
                <Link href="/about">More about GDG UTDallas <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="gallery-section" id="gallery" aria-labelledby="gallery-title">
          <div className="shell">
            <div className="gallery-heading">
              <div>
                <p className="section-label">Around the chapter</p>
                <h2 id="gallery-title">Workshops, projects, and community.</h2>
              </div>
              <p>A look at recent GDG UTDallas events and the students who make them happen.</p>
            </div>
            <div className="gallery-grid">
              <figure className="event-photo event-photo-large">
                <Image
                  src="/pictures/chapter-outreach.png"
                  alt="GDG UTDallas students welcoming people at an outdoor chapter table"
                  fill
                  sizes="(max-width: 720px) 100vw, 66vw"
                />
                <figcaption>Meet the chapter</figcaption>
              </figure>
              <figure className="event-photo">
                <Image
                  src="/pictures/technical-workshop.webp"
                  alt="Students attending a GDG UTDallas technical workshop"
                  fill
                  sizes="(max-width: 720px) 100vw, 34vw"
                />
                <figcaption>Technical workshops</figcaption>
              </figure>
              <figure className="event-photo event-photo-community">
                <Image
                  src="/pictures/community-meetup.png"
                  alt="Three GDG UTDallas students at a community event"
                  fill
                  sizes="(max-width: 720px) 100vw, 34vw"
                />
                <figcaption>Community events</figcaption>
              </figure>
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

        <section className="sprint-home-section" aria-labelledby="sprint-home-title">
          <div className="shell sprint-home-layout">
            <div className="sprint-home-art">
              <span className="sprint-home-shape" aria-hidden="true" />
              <Image
                src="/illustrations/home-sprint-idea.svg"
                alt="A colorful illustration representing a new project idea"
                width={470}
                height={516}
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
              <Link className="primary-button" href="/sprints#sprint-top">Learn about SPRINT <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>

        <section className="faq-section" id="faq" aria-labelledby="faq-title">
          <div className="shell faq-layout">
            <div className="faq-heading">
              <p className="section-label">FAQ</p>
              <h2 id="faq-title">A few common questions.</h2>
              <p>Details about attending events, experience requirements, and staying connected.</p>
            </div>
            <div className="faq-list">
              {faqs.map((faq, index) => (
                <details key={faq.question}>
                  <summary>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{faq.question}</strong>
                    <i aria-hidden="true">+</i>
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="team-teaser shell" aria-labelledby="team-title">
          <div className="team-teaser-art">
            <Image src="/illustrations/home-team-collaboration.svg" alt="An illustration of two people collaborating at a desk" width={618} height={544} />
          </div>
          <div className="team-teaser-copy">
            <p className="section-label">Organizers</p>
            <h2 id="team-title">Meet the officers.</h2>
            <p>Meet the students who organize events and run GDG UTD.</p>
            <Link className="primary-button" href="/officers">Meet the officers <span aria-hidden="true">→</span></Link>
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
              <Link href="/about">About</Link><Link href="/officers">Officers</Link><Link href="/apply">Apply</Link><a href="#events">Events</a><Link href="/sprints">SPRINT</Link>
            </div>
            <div className="footer-nav">
              <strong>Connect</strong>
              <a className="footer-social-link" href={DISCORD_URL} target="_blank" rel="noreferrer"><Image src="/icons/discord.svg" alt="" width={15} height={15} />Discord <span aria-hidden="true">↗</span></a>
              <a className="footer-social-link" href={INSTAGRAM_URL} target="_blank" rel="noreferrer"><Image src="/icons/instagram.svg" alt="" width={15} height={15} />Instagram <span aria-hidden="true">↗</span></a>
              <a className="footer-social-link" href={LINKTREE_URL} target="_blank" rel="noreferrer"><Image src="/icons/linktree.svg" alt="" width={15} height={15} />Linktree <span aria-hidden="true">↗</span></a>
            </div>
            <div className="footer-nav">
              <strong>Account</strong>
              {isSignedIn ? (
                <Link href="/dashboard">Dashboard</Link>
              ) : (
                <><Link href="/login">Log in</Link><Link href="/signup">Sign up</Link></>
              )}
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
