# Codebase Structure

**Analysis Date:** 2026-03-14

## Directory Layout

```
EduDashTool/
├── src/                       # Application source code
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── api/               # API route handlers
│   │   │   └── health/        # Health check endpoint
│   │   ├── login/             # Authentication page
│   │   ├── layout.tsx         # Root layout (metadata, providers, sidebar)
│   │   └── page.tsx           # Home page (currently empty)
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui primitives (button, dialog, sidebar, etc.)
│   │   ├── app-sidebar.tsx    # Main navigation sidebar with theme toggle and sign-out
│   │   └── theme-provider.tsx # Next-themes wrapper for dark/light mode
│   ├── db/                    # Database configuration and schema
│   │   ├── index.ts           # Drizzle ORM client instance
│   │   └── schema.ts          # Table definitions (currently empty)
│   ├── hooks/                 # Custom React hooks
│   │   └── use-mobile.ts      # Mobile breakpoint detection hook
│   ├── lib/                   # Utilities and helpers
│   │   ├── supabase/          # Supabase client factories
│   │   │   ├── client.ts      # Browser client (public keys)
│   │   │   └── server.ts      # Server client (with cookie handling)
│   │   ├── auth.ts            # Authentication utilities (requireUser function)
│   │   └── utils.ts           # General utilities (cn classname merger)
│   └── proxy.ts               # Middleware for auth and route protection
├── drizzle/                   # Generated migration files (git-ignored)
├── drizzle.config.ts          # Drizzle ORM configuration
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript compiler options
├── components.json            # shadcn/ui config (component paths and aliases)
├── eslint.config.mjs          # ESLint rules
├── postcss.config.mjs         # PostCSS configuration for Tailwind
├── package.json               # Dependencies and scripts
└── .env.local                 # Local environment variables (git-ignored)
```

## Directory Purposes

**src/app/**
- Purpose: Next.js App Router—all pages and route handlers
- Contains: `.tsx` files for pages, `route.ts` files for API handlers
- Key files: `layout.tsx` (root setup), `login/page.tsx` (auth), `page.tsx` (home), `api/health/route.ts` (health check)
- Pattern: File-based routing; nested folders create URL paths

**src/components/**
- Purpose: Reusable UI components and layouts
- Contains: Functional React components (mostly client-side)
- Key files: `app-sidebar.tsx` (main nav), `ui/` subdirectory (primitive components)
- Pattern: Barrel exports not used; components imported directly from files

**src/components/ui/**
- Purpose: Headless UI primitives from shadcn/ui
- Contains: Pre-styled button, dialog, sidebar, table, input, etc.
- Key files: `button.tsx`, `sidebar.tsx`, `dialog.tsx`
- Pattern: Wrapper components around Base UI; Tailwind + CVA (class-variance-authority) for styling

**src/db/**
- Purpose: Database layer (schema and client)
- Contains: Drizzle ORM setup and table definitions
- Key files: `index.ts` (exports `db` instance), `schema.ts` (table schemas—currently empty)
- Pattern: ORM client initialized once and re-exported; schema definitions co-located

**src/hooks/**
- Purpose: Custom React hooks
- Contains: Reusable state logic and side effects
- Key files: `use-mobile.ts` (responsive design detection)
- Pattern: Standard React hooks pattern; use `use-` prefix

**src/lib/**
- Purpose: Utilities, helpers, and service clients
- Contains: Non-component code; business logic
- Key files: `auth.ts` (auth helpers), `supabase/` (Supabase clients), `utils.ts` (utilities)
- Pattern: Organized by concern; Supabase clients in subdirectory

**src/lib/supabase/**
- Purpose: Supabase client initialization for different contexts
- Contains: Client-side and server-side Supabase instances
- Key files: `client.ts` (browser), `server.ts` (server with cookies)
- Pattern: Factory functions named `createClient()`; import based on context

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root document layout and provider setup
- `src/app/login/page.tsx`: Authentication page for sign-in/sign-up
- `src/app/page.tsx`: Home page (currently empty placeholder)
- `src/proxy.ts`: Middleware that runs on every request (not a page, but critical entry point)

**Configuration:**
- `drizzle.config.ts`: Database migration and schema generation settings
- `tsconfig.json`: TypeScript compiler settings and path aliases (`@/*` → `./src/*`)
- `next.config.ts`: Next.js build and runtime configuration
- `components.json`: shadcn/ui metadata (component import paths)

**Core Logic:**
- `src/lib/auth.ts`: `requireUser()` function for protecting API routes
- `src/lib/supabase/client.ts`: Browser-side Supabase client factory
- `src/lib/supabase/server.ts`: Server-side Supabase client factory (handles cookies)
- `src/db/index.ts`: Drizzle ORM instance with schema

**Testing:**
- No test files currently present (see TESTING gaps)

## Naming Conventions

**Files:**
- Page components: lowercase with hyphens, e.g., `login/page.tsx`, `health/route.ts`
- Component files: PascalCase, e.g., `AppSidebar.tsx`, `ThemeProvider.tsx`
- Utility files: camelCase, e.g., `useAuth.ts`, `utils.ts`
- API routes: `route.ts` in endpoint directory

**Directories:**
- Features/pages: lowercase, e.g., `app/login/`, `app/api/health/`
- UI components: `ui/` subdirectory under components
- Configuration: kebab-case or camelCase (drizzle.config.ts, next.config.ts)

**Exported Functions/Hooks:**
- Hooks: `use` prefix, e.g., `useIsMobile()`
- Auth functions: descriptive verb, e.g., `requireUser()`
- Factories: `createClient()` for service instantiation

## Where to Add New Code

**New Feature:**
- Primary code: `src/app/[feature-name]/page.tsx` (for pages) or `src/app/api/[feature-name]/route.ts` (for API)
- Components: `src/components/[feature-name]/` (optional subdirectory)
- Hooks: `src/hooks/use-[feature-name].ts`
- Tests: Co-locate with feature, e.g., `src/app/[feature-name]/page.test.tsx` (see TESTING.md for setup)

**New Component/Module:**
- Reusable component: `src/components/[ComponentName].tsx`
- Feature-specific component: `src/components/[feature-name]/[ComponentName].tsx`
- UI primitive: `src/components/ui/[component-name].tsx` (typically added by shadcn/ui CLI)

**Utilities:**
- Shared helpers: `src/lib/[utility-name].ts`
- Service clients: `src/lib/[service]/[client-name].ts` (e.g., `supabase/client.ts`)
- Constants/types: `src/lib/types/` (not yet created; consider adding)

## Special Directories

**src/db/**
- Purpose: Database schema and ORM configuration
- Generated: Migrations auto-generated by Drizzle Kit in `drizzle/` directory
- Committed: `schema.ts` is committed; `drizzle/` directory should be git-ignored for local migrations

**drizzle/**
- Purpose: Generated migration SQL files
- Generated: Yes (by `drizzle-kit migrate` and `drizzle-kit generate`)
- Committed: Typically committed (migrations are version-controlled); local test migrations may be ignored

**.next/**
- Purpose: Build output and cached assets
- Generated: Yes (by `next build`)
- Committed: No (git-ignored)

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes (by `npm install`)
- Committed: No (git-ignored)

---

*Structure analysis: 2026-03-14*
