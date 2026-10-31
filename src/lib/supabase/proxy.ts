import { safeNextPath } from "@/lib/navigation";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

function responseWithCookies(
  response: NextResponse,
  target: NextResponse,
) {
  response.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));

  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = response.headers.get(header);
    if (value) target.headers.set(header, value);
  }

  return target;
}

export async function updateSession(request: NextRequest, requestHeaders: Headers = request.headers) {
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const pathname = request.nextUrl.pathname;

  const isApplicationForm = pathname.startsWith("/apply/");
  const isProtectedRoute = pathname.startsWith("/account")
    || pathname.startsWith("/dashboard")
    || pathname.startsWith("/admin")
    || isApplicationForm;

  // Server Actions must issue their own redirect so Next can handle the action
  // response, rather than replaying its POST against the login page.
  const isServerAction = request.method === "POST" && request.headers.has("next-action");
  if (!isSignedIn && isProtectedRoute && !isServerAction) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return responseWithCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/signup")
    && !(pathname === "/login" && request.nextUrl.searchParams.get("forgot") === "1")) {
    const homeUrl = request.nextUrl.clone();
    const requestedNext = request.nextUrl.searchParams.get("next");
    const next = safeNextPath(requestedNext);
    const target = new URL(next, request.url);
    homeUrl.pathname = target.pathname;
    homeUrl.search = target.search;
    return responseWithCookies(
      supabaseResponse,
      NextResponse.redirect(homeUrl),
    );
  }

  return supabaseResponse;
}
