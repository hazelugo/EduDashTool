import { createBrowserClient } from "@supabase/ssr";

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

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
