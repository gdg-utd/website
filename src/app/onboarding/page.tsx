import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<{ next?: string; preview?: string }>;
};

function safeNextPath(value?: string) {
  return value?.startsWith("/")
    && !value.startsWith("//")
    && !value.includes("\\")
    && !value.startsWith("/onboarding")
    ? value
    : "/dashboard";
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const query = await searchParams;
  const next = safeNextPath(query.next);
  const isDevelopmentPreview = process.env.NODE_ENV !== "production" && query.preview === "1";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;

  if (!userId) redirect(`/login?next=${encodeURIComponent(`/onboarding?next=${encodeURIComponent(next)}`)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, net_id, degree, major, github_url, portfolio_url, linkedin_url, onboarding_completed_at")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.onboarding_completed_at && !isDevelopmentPreview) redirect(next);

  return (
    <main className="onboarding-page">
      <div className="onboarding-shell">
        <header className="onboarding-header">
          <Image src="/brand/gdg-lockup.svg" alt="Google Developer Groups" width={188} height={38} priority />
          <div>
            <span><i aria-hidden="true">✓</i> Account verified</span>
            <form action={logout}><button type="submit">Log out</button></form>
          </div>
        </header>
        <OnboardingFlow
          firstName={profile?.first_name || "there"}
          nextPath={next}
          profile={{
            netId: profile?.net_id ?? null,
            degree: profile?.degree ?? null,
            major: profile?.major ?? null,
            githubUrl: profile?.github_url ?? null,
            portfolioUrl: profile?.portfolio_url ?? null,
            linkedinUrl: profile?.linkedin_url ?? null,
          }}
        />
      </div>
    </main>
  );
}
