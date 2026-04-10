# Project Context

This is a typescript project using next-app, hono with drizzle.

The API has 1 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The database has 11 models. See .codesight/schema.md for the full schema with fields, types, and relations.
The UI has 18 components. See .codesight/components.md for the full list with props.
Middleware includes: custom, auth.

High-impact files (most imported, changes here affect many other files):
- src\lib\dashboard.ts (imported by 8 files)
- src\lib\students.ts (imported by 7 files)
- src\lib\auth.ts (imported by 3 files)
- src\lib\audit.ts (imported by 2 files)
- src\app\students\_components\student-filters.tsx (imported by 1 files)
- src\db\schema.ts (imported by 1 files)
- src\db\index.ts (imported by 1 files)

Required environment variables (no defaults):
- CI (playwright.config.ts)
- POSTGRES_URL (src\app\api\health\route.ts)
- POSTGRES_URL_NON_POOLING (src\app\api\health\route.ts)
- TEST_EMAIL (tests\phase1.spec.ts)
- TEST_PASSWORD (tests\phase1.spec.ts)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.
