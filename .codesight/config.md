# Config

## Environment Variables

- `CI` **required** — playwright.config.ts
- `DATABASE_URL` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (has default) — .env.local
- `NEXT_PUBLIC_SUPABASE_URL` (has default) — .env.local
- `POSTGRES_URL` **required** — src\app\api\health\route.ts
- `POSTGRES_URL_NON_POOLING` **required** — src\app\api\health\route.ts
- `TEST_EMAIL` **required** — tests\phase1.spec.ts
- `TEST_PASSWORD` **required** — tests\phase1.spec.ts

## Config Files

- `drizzle.config.ts`
- `next.config.ts`
- `tsconfig.json`

## Key Dependencies

- @supabase/supabase-js: ^2.101.1
- drizzle-orm: ^0.45.1
- hono: ^4.12.5
- next: 16.1.6
- react: 19.2.3
- zod: ^4.3.6
