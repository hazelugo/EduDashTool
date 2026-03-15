# Technology Stack

**Analysis Date:** 2026-03-14

## Languages

**Primary:**
- TypeScript 5.x - Full-stack application (frontend, backend, configuration)

**Secondary:**
- JavaScript - PostCSS and ESLint configuration files

## Runtime

**Environment:**
- Node.js (via Next.js)

**Package Manager:**
- npm (v10+)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library for client and server components
- React DOM 19.2.3 - React rendering for browser

**UI & Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- PostCSS 4.x - CSS processing via `@tailwindcss/postcss`
- shadcn/ui 4.0.2 - Headless component library (base-nova style)
- next-themes 0.4.6 - Theme management (light/dark mode)
- Lucide React 0.577.0 - Icon library (177+ icons)

**Forms & Validation:**
- React Hook Form 7.71.2 - Form state management
- Zod 4.3.6 - Schema validation (TypeScript-first)
- @hookform/resolvers 5.2.2 - Form resolver integrations

**Data & Table Display:**
- TanStack React Table 8.21.3 - Headless table library
- TanStack React Virtual 3.13.22 - Virtual scrolling for large lists
- Class Variance Authority 0.7.1 - Component style composition

**Drag & Drop:**
- @dnd-kit/core 6.3.1 - Drag-and-drop library
- @dnd-kit/sortable 10.0.0 - Sortable features for dnd-kit
- @dnd-kit/utilities 3.2.2 - dnd-kit utilities

**UI Utilities:**
- clsx 2.1.1 - Conditional className combining
- tailwind-merge 3.5.0 - Merge Tailwind classes intelligently
- tw-animate-css 1.4.0 - Animation utilities
- use-debounce 10.1.0 - Debounce hook for performance

**Base UI:**
- @base-ui/react 1.2.0 - Unstyled component primitives

**Testing:**
- @playwright/test 1.58.2 - E2E testing framework

**Build & Dev Tools:**
- drizzle-kit 0.30.0 - Database migration and schema generation
- drizzle-orm 0.45.1 - SQL ORM for TypeScript
- Hono 4.12.5 - Lightweight web framework (installed but role unclear)
- tsx 4.21.0 - TypeScript execution for scripts

**Linting & Code Quality:**
- ESLint 9.x - JavaScript/TypeScript linter
- eslint-config-next 16.1.6 - Next.js-specific ESLint rules

**Type Safety:**
- @types/react 19.x - React type definitions
- @types/react-dom 19.x - React DOM type definitions
- @types/node 20.x - Node.js type definitions

## Key Dependencies

**Critical:**
- postgres 3.4.8 - Native PostgreSQL client for Node.js
- @supabase/supabase-js 2.99.1 - Supabase JavaScript client SDK
- @supabase/ssr 0.9.0 - Supabase SSR integration for Next.js

**Infrastructure:**
- @vercel/analytics 2.0.1 - Vercel web analytics integration
- dotenv 17.3.1 - Environment variable loading

## Configuration

**Environment:**
- `.env.local` - Local environment file (present - contains configuration)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public API key (public)
- `DATABASE_URL` - PostgreSQL connection string (required for migrations and app)

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
- `next.config.ts` - Next.js build configuration (minimal - placeholder only)
- `postcss.config.mjs` - PostCSS pipeline configuration
- `eslint.config.mjs` - ESLint configuration
- `components.json` - shadcn/ui configuration (base-nova style, Tailwind CSS, Lucide icons)
- `drizzle.config.ts` - Drizzle ORM configuration (PostgreSQL dialect)

## Platform Requirements

**Development:**
- Node.js 18+ (per @types/node 20)
- npm or compatible package manager
- PostgreSQL database (Supabase recommended)

**Production:**
- Vercel (target deployment platform - suggested by @vercel/analytics)
- PostgreSQL database
- Supabase project (for authentication and real-time features)

## Database

**Type:** PostgreSQL via Supabase

**ORM:** Drizzle ORM 0.45.1
- Schema: `src/db/schema.ts` (currently empty)
- Database instance: `src/db/index.ts`
- Drizzle output: `./drizzle/` directory
- Configuration: `drizzle.config.ts`
- Client: postgres 3.4.8 (prepared statements disabled for Supabase Transaction pool mode)

---

*Stack analysis: 2026-03-14*
