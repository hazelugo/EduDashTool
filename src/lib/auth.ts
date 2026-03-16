import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { staffProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

/** Call at the top of any API route handler that requires authentication.
 *  Returns the authenticated user ID, or a 401 NextResponse to return immediately.
 *  NOTE: For Server Components and Server Actions, use requireStaffProfile() instead. */
export async function requireUser(): Promise<
  | { userId: string; error: null }
  | { userId: null; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId: user.id, error: null };
}

/** Typed staff profile returned by requireStaffProfile().
 *  This is the single source of auth truth for all Server Components and Server Actions
 *  in Phases 2–7. Callers are responsible for role checking — this helper does NOT
 *  enforce a minimum role.
 *
 *  IMPORTANT: Uses redirect() internally. Do NOT call from API route handlers —
 *  redirect() is not caught properly in that context. Use requireUser() instead. */
export type StaffProfile = {
  userId: string;
  email: string;
  fullName: string | null;
  role: "teacher" | "counselor" | "principal";
};

/** Verify Supabase session + fetch staff_profiles row.
 *  - No session → redirect("/login")
 *  - Session exists but no staff_profiles row → redirect("/no-access")
 *  - Profile found → return StaffProfile
 *
 *  For Server Components and Server Actions ONLY. */
export async function requireStaffProfile(): Promise<StaffProfile> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [profile] = await db
    .select()
    .from(staffProfiles)
    .where(eq(staffProfiles.id, user.id))
    .limit(1);

  if (!profile) {
    redirect("/no-access");
  }

  return {
    userId: user.id,
    email: user.email ?? profile.email,
    fullName: profile.fullName,
    role: profile.role,
  };
}
