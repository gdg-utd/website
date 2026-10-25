import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CHAPTER_URL, DISCORD_URL, getChapterData } from "@/lib/gdg";
import styles from "./events.module.css";

const description = "Find upcoming GDG on Campus UT Dallas workshops, technical sessions, and community events. Explore the schedule and RSVP through our official chapter page.";

export const metadata: Metadata = {
  title: "Events",
  description,
  alternates: { canonical: "/events" },
  openGraph: {
    title: "Events | GDG on Campus at UT Dallas",
    description,
    url: "/events",
    images: [],
  },
  twitter: {
    card: "summary",
    title: "Events | GDG on Campus at UT Dallas",
    description,
    images: [],
  },
};

function dateParts(value: string) {
  const date = new Date(value);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { ...options, timeZone: "America/Chicago" }).format(date);
  return {
    day: format({ day: "2-digit" }),
    month: format({ month: "short" }),
    weekday: format({ weekday: "short" }),
    full: format({ weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: format({ hour: "numeric", minute: "2-digit", timeZoneName: "short" }),
    group: format({ month: "long", year: "numeric" }),
  };
}

export default async function EventsPage() {
  const chapter = await getChapterData();
  const [featured, ...remaining] = chapter.events;
  const nextDate = featured ? dateParts(featured.startDate) : null;
  const groups = Map.groupBy(remaining, (event) => dateParts(event.startDate).group);

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="events-heading">
          <div className="shell">
            <div className={styles.heroTop}>
              <p className="section-label">GDG on Campus · UT Dallas</p>
              <div className={styles.colorRule} aria-hidden="true"><i /><i /><i /><i /></div>
            </div>
            <div className={styles.heroLayout}>
              <h1 id="events-heading">Events<span>.</span></h1>
              <div className={styles.heroCopy}>
                <p>Join us for workshops, tech talks, and socials throughout the semester. New to GDG? You&apos;re welcome to join us.</p>
                <div className={styles.actions}>
                  <a className={styles.textLink} href="#upcoming"><span>View upcoming events</span> <span aria-hidden="true">↓</span></a>
                  <a className={styles.textLink} href={CHAPTER_URL} target="_blank" rel="noreferrer"><span>Join the chapter</span> <span aria-hidden="true">↗</span></a>
                </div>
              </div>
            </div>
            <div className={styles.heroBottom}>
              <div><span>Workshops</span><span>Tech talks</span><span>Socials</span></div>
              {!chapter.eventsUnavailable && <p><span className={styles.statusDot} aria-hidden="true" />{chapter.events.length} upcoming {chapter.events.length === 1 ? "event" : "events"}</p>}
            </div>
          </div>
        </section>

        <section className={`${styles.schedule} shell`} id="upcoming" aria-labelledby="upcoming-heading">
          <div className={styles.sectionHeading}>
            <div><p className="section-label">Chapter calendar</p><h2 id="upcoming-heading">Upcoming events</h2></div>
            <p>Times shown in Dallas time.<br />RSVPs and venue details on the official event page.</p>
          </div>

          {featured && nextDate ? (
            <>
              <article className={styles.featured}>
                <div className={styles.featuredDate}>
                  <p><span aria-hidden="true" />Up next</p>
                  <time dateTime={featured.startDate} aria-label={nextDate.full}><span>{nextDate.month}</span><strong>{nextDate.day}</strong><span>{nextDate.weekday}</span></time>
                  <span className={styles.dateYear}>{new Date(featured.startDate).toLocaleDateString("en-US", { year: "numeric", timeZone: "America/Chicago" })}</span>
                </div>
                <div className={styles.featuredCopy}>
                  <p className={styles.eyebrow}>{featured.registrationType}</p>
                  <h3>{featured.title}</h3>
                  <p>{featured.description}</p>
                  <div className={styles.eventBottom}><span>{nextDate.full}<br /><strong>{nextDate.time}</strong></span><a className="primary-button" href={featured.url} target="_blank" rel="noreferrer" aria-label={`View details and RSVP for ${featured.title}`}><span>View details &amp; RSVP</span> <span aria-hidden="true">↗</span></a></div>
                </div>
              </article>

              {Array.from(groups, ([month, events]) => (
                <div className={styles.monthGroup} key={month}>
                  <h3 className={styles.monthTitle}>{month}<span>{String(events.length).padStart(2, "0")} {events.length === 1 ? "event" : "events"}</span></h3>
                  <div>{events.map((event) => {
                    const date = dateParts(event.startDate);
                    return (
                      <article className={styles.event} key={`${event.startDate}-${event.url}`}>
                        <time className={styles.eventDate} dateTime={event.startDate} aria-label={date.full}><span>{date.weekday}</span><strong>{date.day}</strong></time>
                        <div className={styles.eventCopy}><p className={styles.eyebrow}>{event.registrationType} <span aria-hidden="true">·</span> {date.time}</p><h4><a href={event.url} target="_blank" rel="noreferrer">{event.title}</a></h4><p>{event.description}</p><a className={styles.textLink} href={event.url} target="_blank" rel="noreferrer" aria-label={`View details and RSVP for ${event.title}`}><span>View details &amp; RSVP</span> <span aria-hidden="true">↗</span></a></div>
                      </article>
                    );
                  })}</div>
                </div>
              ))}
            </>
          ) : (
            <div className={styles.empty}><span aria-hidden="true">↗</span><h3>{chapter.eventsUnavailable ? "We couldn’t load the calendar." : "No upcoming events right now."}</h3><p>{chapter.eventsUnavailable ? "Please check our official chapter page for event details and RSVPs." : "Check back soon, or join our Discord for event announcements."}</p><a className="primary-button" href={CHAPTER_URL} target="_blank" rel="noreferrer">View chapter calendar ↗</a></div>
          )}
        </section>

        <section className={`${styles.resources} shell`} aria-label="More from the chapter">
          <div className={styles.resource}>
            <p className="section-label">Event archive</p>
            <h2>Past events</h2>
            <p>Browse previous workshops, talks, and meetups on our official chapter page.</p>
            <a className={styles.textLink} href={`${CHAPTER_URL}#eeSGPsrOVmy`} target="_blank" rel="noreferrer"><span>View past events</span> <span aria-hidden="true">↗</span></a>
          </div>
          <div className={styles.resource}>
            <p className="section-label">Discord</p>
            <h2>Stay updated</h2>
            <p>Join our Discord for event announcements, questions, and chats with other members.</p>
            <a className={styles.textLink} href={DISCORD_URL} target="_blank" rel="noreferrer"><span>Join our Discord</span> <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
