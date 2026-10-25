import type { Metadata } from "next";
import { PasswordForm } from "@/components/password-form";

export const metadata: Metadata = { title: "Change password" };
export default function ChangePasswordPage() {
  return (
    <>
      <header className="dashboard-page-heading">
        <div>
          <p className="section-label">Account security</p>
          <h1>Change password</h1>
          <p>Confirm your current password and choose a new one.</p>
        </div>
      </header>
      <section className="password-card dashboard-profile-card">
        <PasswordForm mode="profile" />
      </section>
    </>
  );
}
