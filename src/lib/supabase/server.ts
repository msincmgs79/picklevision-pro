import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Server-side Supabase client for server components, route handlers and actions.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            // `.set` exists at runtime in route handlers / server actions; the
            // next/headers type is read-only, so cast. In a Server Component this
            // throws and is safely ignored — middleware refreshes the session.
            (cookieStore as unknown as { set: (n: string, v: string, o?: unknown) => void }).set(
              name,
              value,
              options
            )
          );
        } catch {
          /* no-op: refreshed by middleware */
        }
      },
    },
  });
}
