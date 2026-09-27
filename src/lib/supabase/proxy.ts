import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
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

  const isProtectedRoute = pathname.startsWith("/account") || pathname.startsWith("/dashboard");

  if (!isSignedIn && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return responseWithCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl),
    );
  }

  if (isSignedIn && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return responseWithCookies(
      supabaseResponse,
      NextResponse.redirect(homeUrl),
    );
  }

  return supabaseResponse;
}
