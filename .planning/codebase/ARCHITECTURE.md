# Architecture

**Analysis Date:** 2026-03-14

## Pattern Overview

**Overall:** Server-driven Next.js application with authentication middleware, database abstraction layer, and shadcn/ui component library.

**Key Characteristics:**
- Full-stack React with Next.js App Router (file-based routing)
- Type-safe database operations via Drizzle ORM
- Supabase for authentication (SSR-compatible client)
- Middleware-based route protection before page load
- Modular component architecture with UI primitives from shadcn/ui

## Layers

**Presentation Layer:**
- Purpose: User-facing components and page layouts
- Location: `src/app/`, `src/components/`
- Contains: Next.js pages, layouts, client components
- Depends on: UI components, hooks, Supabase client
- Used by: Browser/user interactions

**Application/Routing Layer:**
- Purpose: Page routing and API endpoints
- Location: `src/app/page.tsx`, `src/app/api/`, `src/app/login/`
- Contains: Route handlers, page components, middleware
- Depends on: Business logic, database, authentication
- Used by: HTTP requests from browser

**Business Logic Layer:**
- Purpose: Authentication, data operations, utility functions
- Location: `src/lib/auth.ts`, `src/db/index.ts`, `src/lib/utils.ts`
- Contains: Authentication helpers, database client initialization
- Depends on: Database, Supabase SDK
- Used by: Pages, API routes

**Data Access Layer:**
- Purpose: Database schema and ORM configuration
- Location: `src/db/schema.ts`, `src/db/index.ts`
- Contains: Drizzle schema definitions, database client
- Depends on: Postgres/Supabase connection
- Used by: API routes, server components

**Infrastructure Layer:**
- Purpose: Third-party service clients and configuration
- Location: `src/lib/supabase/`, `drizzle.config.ts`
- Contains: Supabase client (browser and server), Drizzle ORM setup
- Depends on: Environment variables, external services
- Used by: All application layers

## Data Flow

**Authentication Flow:**
1. User visits `/login` page (unauthenticated)
2. `src/proxy.ts` middleware allows login page to load
3. User submits email/password via `src/app/login/page.tsx`
4. `createClient()` from `src/lib/supabase/client.ts` calls Supabase auth API
5. On success, session stored in browser cookies by Supabase SDK
6. Router redirects to `/songs` and refreshes

**Protected Route Flow:**
1. User navigates to protected route (e.g., `/songs`)
2. `src/proxy.ts` middleware runs (matcher excludes `/api/` and static files)
3. Middleware calls `supabase.auth.getUser()` via server client
4. If no user: redirect to `/login`
5. If user exists: allow page load
6. Page component uses `src/lib/supabase/client.ts` for client-side operations

**API Request Flow:**
1. Client component or API route needs data
2. API route handler calls `requireUser()` from `src/lib/auth.ts`
3. `requireUser()` creates server Supabase client and gets authenticated user
4. If authenticated: returns userId, proceeds with DB operations
5. If not authenticated: returns 401 error
6. Database operations use `db` instance from `src/db/index.ts`

**State Management:**
- Authentication state: Managed by Supabase SDK (stored in cookies)
- UI state: React component state (e.g., theme in `AppSidebar`, modal open/close)
- No central Redux/Zustand (state is minimal/local)

## Key Abstractions

**Authentication Utility:**
- Purpose: Centralized auth verification for API routes
- Examples: `src/lib/auth.ts` contains `requireUser()`
- Pattern: Async function that returns union type `{ userId, error }`

**Supabase Client Factory:**
- Purpose: Initialize Supabase client for browser or server context
- Examples: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Pattern: Export `createClient()` function; server version handles cookies

**Database Client:**
- Purpose: Single shared Drizzle ORM instance with schema
- Examples: `src/db/index.ts` exports `db` instance
- Pattern: `postgres()` driver with `drizzle()` wrapper; schema imported

**UI Components:**
- Purpose: Reusable, unstyled primitives from shadcn/ui
- Examples: `src/components/ui/button.tsx`, `src/components/ui/sidebar.tsx`
- Pattern: Headless component wrappers around Base UI; Tailwind styling

## Entry Points

**Web App Root:**
- Location: `src/app/layout.tsx`
- Triggers: Initial page load
- Responsibilities: Set up document metadata, theme provider, sidebar layout, root styling

**Login Page:**
- Location: `src/app/login/page.tsx`
- Triggers: Unauthenticated user navigates to protected route (via middleware redirect)
- Responsibilities: Email/password sign-in and sign-up form, Supabase auth API calls

**Health Check API:**
- Location: `src/app/api/health/route.ts`
- Triggers: External monitoring or manual health verification
- Responsibilities: Test database connectivity, return status

**Middleware (Request Interceptor):**
- Location: `src/proxy.ts`
- Triggers: Every request except `/api/*` and static assets (based on matcher)
- Responsibilities: Refresh Supabase session, redirect unauthenticated users to `/login`, redirect authenticated users away from `/login`

## Error Handling

**Strategy:** Try-catch in API routes; error propagation to client; user-friendly messages in UI.

**Patterns:**
- API routes: `try { /* operation */ } catch (error) { return Response.json({ error: message }, { status: 503 }) }`
- Client components: State-based error display (see `src/app/login/page.tsx` with `error` state)
- Auth errors: `requireUser()` returns union type; caller checks for `error` property
- Database errors: `src/app/api/health/route.ts` catches and returns 503 on DB failure

## Cross-Cutting Concerns

**Logging:** Not explicitly configured; uses browser console and server-side console (Next.js stdout)

**Validation:** Zod installed but not yet integrated (see `package.json`); form validation currently done via HTML attributes (email type, minLength)

**Authentication:** Supabase handles JWT token management; cookies refreshed by middleware on every request

**Styling:** Tailwind CSS with theme support via `next-themes`; color scheme toggled in `src/components/app-sidebar.tsx`

---

*Architecture analysis: 2026-03-14*
