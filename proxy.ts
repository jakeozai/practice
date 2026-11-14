import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages that need a session. Pages still verify the user themselves. */
const PROTECTED_PREFIXES = ["/onboarding", "/admin"];

/**
 * Refreshes the Supabase session cookie on every page request and sends
 * signed-out visitors of protected pages to the landing page.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Must run before any response is returned so a refreshed token is written.
  const { data } = await supabase.auth.getClaims();

  const path = request.nextUrl.pathname;
  if (!data?.claims && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    // Sign in right on 내 정보 (email → code), then come back here.
    const login = request.nextUrl.clone();
    login.pathname = "/account";
    login.search = "";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  // Skip static assets and the token-authenticated mail endpoints.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/email|r/|unsubscribe|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
