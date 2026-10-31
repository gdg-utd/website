"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useApplicationSession(slug: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let checking = false;
    let active = true;
    async function check() {
      if (document.visibilityState !== "visible" || checking) return;
      checking = true;
      try {
        const { data, error } = await supabase.auth.getUser();
        const missing = !data.user && (!error || error.name === "AuthSessionMissingError" || error.status === 401 || error.status === 403);
        if (active && missing) {
          await supabase.auth.signOut({ scope: "local" });
          if (active) router.replace(`/login?next=${encodeURIComponent(`/apply/${slug}`)}`);
        }
      } catch {
        // A network failure is not proof of logout. The next action still
        // authenticates on the server; retry when the tab is focused again.
      } finally {
        checking = false;
      }
    }
    // Recheck only when returning to the tab, not on each edit or on a timer.
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [router, slug]);
}
