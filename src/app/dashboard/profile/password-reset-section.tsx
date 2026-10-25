import Link from "next/link";

export function PasswordResetSection() {
  return (
    <section
      className="dashboard-profile-card dashboard-security-section"
      aria-labelledby="security-heading"
    >
      <div className="dashboard-profile-section-heading dashboard-security-heading">
        <div>
          <h2 id="security-heading">Security</h2>
          <p>Change the password used to access your applicant dashboard.</p>
        </div>
        <Link
          className="dashboard-security-toggle"
          href="/dashboard/profile/password"
        >
          Reset password
        </Link>
      </div>
    </section>
  );
}
