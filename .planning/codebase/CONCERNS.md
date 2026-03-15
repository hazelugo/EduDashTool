# Codebase Concerns

**Analysis Date:** 2026-03-14

## Tech Debt

**Hardcoded placeholder values in Supabase client:**
- Issue: `src/lib/supabase/client.ts` uses fallback placeholder values (`https://placeholder.supabase.co` and `placeholder`) when environment variables are not defined. This allows the application to load but with non-functional credentials, potentially masking missing configuration during development.
- Files: `src/lib/supabase/client.ts`
- Impact: Configuration errors go unnoticed; client-side auth will silently fail to connect to real backend, making debugging difficult
- Fix approach: Remove fallback values or throw explicit error when `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are not set

**Database connection lacks error validation:**
- Issue: `src/db/index.ts` uses `DATABASE_URL!` with non-null assertion but doesn't validate the connection at runtime. If `DATABASE_URL` is missing or malformed, it will fail silently until first use.
- Files: `src/db/index.ts`
- Impact: Deployment can proceed without working database connection; errors surface only when queries execute
- Fix approach: Add connection validation at application startup (e.g., in middleware or health check)

**Empty environment variable defaults:**
- Issue: `src/lib/supabase/server.ts` and `src/proxy.ts` both use empty string defaults (`?? ""`) for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This is less obvious than placeholders but still masks missing configuration.
- Files: `src/lib/supabase/server.ts`, `src/proxy.ts`
- Impact: Server-side authentication will fail when Supabase credentials are missing, blocking all authenticated routes
- Fix approach: Validate environment variables exist at application startup; throw detailed error if missing

**Cookie error handling swallows exceptions:**
- Issue: `src/lib/supabase/server.ts` (lines 13-19) has a try-catch block that silently ignores all cookie errors with the comment "Called from a Server Component — cookies are read-only, safe to ignore". This is intentional but fragile: if the assumption changes or a different error occurs, it's hidden.
- Files: `src/lib/supabase/server.ts`
- Impact: Legitimate errors updating cookies could be silently lost; session management may fail without visibility
- Fix approach: Be more specific about which errors are safe to ignore (check error type/message); log unexpected errors

## Security Considerations

**Supabase anonymous key exposed in client bundle:**
- Risk: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is intentionally public (as required by Supabase architecture) but still represents a potential attack surface. If the anon key permissions are misconfigured, it could allow unauthorized access.
- Files: `src/lib/supabase/client.ts`, `src/proxy.ts`
- Current mitigation: Supabase RLS policies should enforce row-level security; anon key should have minimal permissions
- Recommendations: Audit Supabase RLS policies; implement rate limiting on sensitive endpoints; consider using service role key for sensitive operations via server-only endpoints

**Authentication state checked in proxy but not all routes protected:**
- Risk: `src/proxy.ts` (lines 33-45) redirects unauthenticated users to `/login`, but only controls top-level navigation. Individual API endpoints must implement their own authentication checks (e.g., `src/lib/auth.ts` `requireUser` function). If an endpoint forgets this check, it's exposed.
- Files: `src/proxy.ts`, `src/lib/auth.ts`
- Current mitigation: Each API route handler should call `requireUser()` at the start
- Recommendations: Add schema validation or API middleware to enforce authentication on all protected routes; add automated tests to verify auth requirements

**Placeholder credentials don't prevent app from loading:**
- Risk: With placeholder values, the app presents a login page that appears functional but cannot authenticate users. This could be confusing or be mistaken for a configuration-free demo.
- Files: `src/lib/supabase/client.ts`
- Current mitigation: None
- Recommendations: Display an explicit error banner if credentials are using placeholders; fail fast at startup

## Testing Gaps

**No unit or integration tests:**
- What's not tested: Authentication flows, authorization, API endpoints, database interactions, proxy logic
- Files: All src files - no .test or .spec files exist
- Risk: Refactoring, dependency updates, or configuration changes could break core functionality without detection. Auth bugs (the most critical path) are especially risky to deploy without tests.
- Priority: High

**E2E tests configured but status unknown:**
- What's not tested: `test:e2e` script exists in package.json (Playwright configured), but no test files are present in the codebase. It's unclear if tests have been written elsewhere or not started.
- Files: `package.json` references Playwright but no `.spec.ts` files found in project
- Risk: E2E test suite may be incomplete or untested; deployment relies on manual testing
- Priority: High

**No database schema validation tests:**
- What's not tested: Drizzle ORM schema, migrations, database integrity. The schema file `src/db/schema.ts` has no tests verifying migrations run correctly or constraints are enforced.
- Files: `src/db/schema.ts`
- Risk: Migration failures or constraint violations could corrupt production data silently
- Priority: Medium

## Fragile Areas

**Authentication flow in app-sidebar component:**
- Files: `src/components/app-sidebar.tsx`
- Why fragile: Lines 31-35 call `supabase.auth.getUser()` without error handling and set `userEmail` based on the response. If this call fails (network error, session expired), the state will show no email but won't alert the user. Sign out also doesn't handle errors (line 38).
- Safe modification: Wrap both calls in try-catch; show error toast or message if auth operations fail; validate that user data exists before rendering

**Login page error messaging:**
- Files: `src/app/login/page.tsx`
- Why fragile: Error states (lines 33-35, 41-43) rely on Supabase error messages being user-friendly. Some auth errors (e.g., network timeouts) return generic messages that don't help users debug. The loading state (line 142) shows "..." which may confuse users about what's happening.
- Safe modification: Map Supabase error codes to user-friendly messages; improve loading state feedback; add network error recovery; validate email/password format before submission

**Proxy redirect logic assumes hardcoded routes exist:**
- Files: `src/proxy.ts`
- Why fragile: Lines 42-44 redirect logged-in users to `/songs` and unauthenticated to `/login`, but these routes don't exist in the current codebase (only `/` and `/login` found). If routes are moved or deleted, redirects break silently.
- Safe modification: Extract route paths to constants; verify all redirect targets exist; add unit tests for redirect logic; consider centralizing route management

## Known Limitations

**Sidebar component is 723 lines long:**
- Concern: `src/components/ui/sidebar.tsx` is a monolithic component containing all sidebar logic: state management, keyboard shortcuts, mobile responsiveness, rendering, styling. This makes it hard to test, modify, or reuse parts.
- Impact: Bugs in sidebar (e.g., keyboard shortcut handling) affect the entire app; any change risks regression across multiple concerns
- Improvement path: Extract concerns into smaller components (e.g., `SidebarStateProvider`, `SidebarKeyboardShortcuts`, `SidebarContent`) and hooks; add unit tests for each concern

**No build-time environment validation:**
- Concern: The build script (`"build": "drizzle-kit migrate && next build"`) runs migrations during build but doesn't validate that all required environment variables are set. If variables are missing, the build might succeed but the app will fail at runtime.
- Impact: Failed deployments; unclear error messages during startup
- Fix approach: Add a validation script that runs before Next.js build; throw detailed errors for missing critical vars

**Untyped error handling in health endpoint:**
- Concern: `src/app/api/health/route.ts` assumes all errors are Error instances but catches `unknown` (line 8). The fallback message `'unknown'` won't help debug real issues.
- Impact: Health check errors are not descriptive; hard to diagnose database connection issues
- Fix approach: Add proper error type guards; log full error stack server-side; return specific error codes (e.g., `TIMEOUT`, `AUTH_FAILED`, `CONSTRAINT_VIOLATION`)

## Missing Critical Features

**No logging infrastructure:**
- Problem: Application has no centralized logging. Console methods are not used; errors are returned in responses but not logged for audit/debugging.
- Blocks: Production debugging; audit trails for security events; performance monitoring
- Recommendation: Add structured logging (e.g., Winston, Pino, or Supabase built-in logging); log authentication attempts, errors, and critical operations

**No monitoring or alerting:**
- Problem: No observability tools (error tracking, performance monitoring, uptime checks). The health endpoint exists but is not integrated with any monitoring service.
- Blocks: Detecting production issues in real-time; performance regression detection
- Recommendation: Integrate with error tracking (e.g., Sentry) and performance monitoring (e.g., Vercel Analytics - already included in dependencies); set up alerts for critical failures

**No rate limiting or DDoS protection:**
- Problem: API endpoints have no rate limiting. Authentication endpoint is vulnerable to brute force attacks.
- Blocks: Protection against abuse; account takeover via credential stuffing
- Recommendation: Add middleware-level rate limiting (e.g., using Redis or Upstash); apply stricter limits to auth endpoints; consider adding CAPTCHA for failed login attempts

## Performance Bottlenecks

**Sidebar state persisted via document.cookie manipulation:**
- Problem: `src/components/ui/sidebar.tsx` (line 86) directly manipulates `document.cookie` string instead of using the Cookie API. This is fragile and doesn't handle special characters correctly.
- Files: `src/components/ui/sidebar.tsx` (line 86)
- Cause: Manual cookie string formatting is error-prone; library utilities should be used
- Improvement path: Use `js-cookie` or similar library; or use Next.js cookie utilities on server side if this state should be server-managed

---

*Concerns audit: 2026-03-14*
