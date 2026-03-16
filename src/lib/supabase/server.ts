import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[EduDash] Missing NEXT_PUBLIC_SUPABASE_URL. Set this in .env.local and restart the dev server."
  );
}
if (!supabaseKey) {
  throw new Error(
    "[EduDash] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Set this in .env.local and restart the dev server."
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — cookies are read-only, safe to ignore
          }
        },
      },
    },
  );
}
