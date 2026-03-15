# External Integrations

**Analysis Date:** 2026-03-14

## APIs & External Services

**Vercel Analytics:**
- Service: Vercel web analytics
- What it's used for: Performance and usage tracking in production
- SDK/Client: `@vercel/analytics` 2.0.1
- Auth: Automatic via Vercel deployment

## Data Storage

**Databases:**
- PostgreSQL (via Supabase)
  - Connection: `DATABASE_URL` environment variable
  - Client: `postgres` 3.4.8
  - ORM: Drizzle ORM 0.45.1
  - Configuration: `src/db/index.ts`
  - Note: Uses `prepare: false` option for Supabase Transaction pool mode (port 6543) to avoid "prepared statement already exists" errors

**File Storage:**
- Not detected - application does not currently use external file storage

**Caching:**
- Not detected - application does not currently use external caching services

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (managed PostgreSQL + authentication service)
  - Implementation: Supabase session cookies via Next.js middleware
  - Client Library: `@supabase/supabase-js` 2.99.1
  - SSR Integration: `@supabase/ssr` 0.9.0

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key for client authentication (public)

**Auth Flow:**
1. Client-side login: `src/app/login/page.tsx` uses browser client via `src/lib/supabase/client.ts`
   - Sign in: `supabase.auth.signInWithPassword({ email, password })`
   - Sign up: `supabase.auth.signUp({ email, password })`
   - Email confirmation required for signup

2. Server-side authentication: `src/lib/auth.ts` exports `requireUser()` for API route protection
   - Uses server client via `src/lib/supabase/server.ts`
   - Returns authenticated user ID or 401 NextResponse

3. Middleware authentication: `src/proxy.ts` (middleware) manages session persistence
   - Refreshes session on every request
   - Redirects unauthenticated users to login page
   - Redirects authenticated users away from login page
   - Applies to all routes except static files and API routes

**Cookie Management:**
- Supabase authentication cookies stored in browser/server cookies
- Server client refreshes session on each request to maintain auth state
- Cookie options managed by Next.js `cookies()` API

## Monitoring & Observability

**Error Tracking:**
- Not detected - application does not currently use error tracking service

**Logs:**
- Not detected - application does not currently use external logging service
- Health check available: `src/app/api/health/route.ts` verifies database connectivity

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from `@vercel/analytics` and Next.js usage)

**CI Pipeline:**
- Not detected - no GitHub Actions or CI configuration present

## Environment Configuration

**Required env vars:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key
- `DATABASE_URL` - PostgreSQL connection string (for Drizzle and migrations)

**Optional env vars:**
- None currently detected

**Secrets location:**
- `.env.local` - Local development (contains configuration, should not be committed)
- `.env` - Fallback environment file (checked if `.env.local` not present)
- Production: Environment variables set via Vercel dashboard or deployment secrets

## Webhooks & Callbacks

**Incoming:**
- Not detected - application does not expose webhook endpoints

**Outgoing:**
- Not detected - application does not currently send webhooks

## Data Synchronization

**Real-time Features:**
- Not currently implemented - Supabase includes real-time capabilities but not active in current codebase

**Background Jobs:**
- Not detected - no job queue or background task system present

## API Routes & Endpoints

**Health Check:**
- `GET /api/health` - Verifies database connectivity
  - Location: `src/app/api/health/route.ts`
  - Returns: `{ status: "ok", db: "ok" }` on success or `{ status: "error", db: "unreachable", error: message }` with 503 on failure

---

*Integration audit: 2026-03-14*
