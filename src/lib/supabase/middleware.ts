import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

// Refreshes the auth session cookie on each request. No-ops in demo mode.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Touch the session so tokens stay fresh — but NEVER let a slow or unreachable
  // Supabase hang the middleware. The middleware runs on every request, so a hung
  // auth call here 504s the entire site (MIDDLEWARE_INVOCATION_TIMEOUT). Cap it:
  // if it doesn't finish quickly we just skip the refresh this request (the page
  // still renders; the client + server components refresh the session anyway).
  try {
    await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("auth-timeout")), 2500)),
    ]);
  } catch {
    /* Supabase slow/unreachable — proceed without refreshing this request. */
  }
  return response;
}
