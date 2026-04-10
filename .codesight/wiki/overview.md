# edu-dash-tool — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**edu-dash-tool** is a typescript project built with next-app, hono, using drizzle for data persistence.

## Scale

1 API routes · 11 database models · 18 UI components · 3 middleware layers · 8 environment variables

## Subsystems

- **[Route](./route.md)** — 1 routes — touches: db

**Database:** drizzle, 11 models — see [database.md](./database.md)

**UI:** 18 components (react) — see [ui.md](./ui.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `src\lib\dashboard.ts` — imported by **8** files
- `src\lib\students.ts` — imported by **7** files
- `src\lib\auth.ts` — imported by **3** files
- `src\lib\audit.ts` — imported by **2** files
- `src\app\students\_components\student-filters.tsx` — imported by **1** files
- `src\db\schema.ts` — imported by **1** files

## Required Environment Variables

- `CI` — `playwright.config.ts`
- `POSTGRES_URL` — `src\app\api\health\route.ts`
- `POSTGRES_URL_NON_POOLING` — `src\app\api\health\route.ts`
- `TEST_EMAIL` — `tests\phase1.spec.ts`
- `TEST_PASSWORD` — `tests\phase1.spec.ts`

---
_Back to [index.md](./index.md) · Generated 2026-04-10_