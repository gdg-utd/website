import Link from "next/link";

export function DataUnavailable({ href, label }: { href: string; label: string }) {
  return (
    <section className="dashboard-empty-state data-unavailable" role="alert">
      <h2>We couldn’t load {label}.</h2>
      <p>Your information has not been changed. Please try loading this page again.</p>
      <a className="primary-link" href={href}>Try again <span aria-hidden="true">↻</span></a>
      <Link className="secondary-link" href="/dashboard">Member dashboard</Link>
    </section>
  );
}
