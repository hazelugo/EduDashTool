# Route

> **Navigation aid.** Route list and file locations extracted via AST. Read the source files listed below before implementing or modifying this subsystem.

The Route subsystem handles **1 routes** and touches: db.

## Routes

- `GET` `/api/health` → out: { status, db, env } [db]
  `src/app/api/health/route.ts`

## Source Files

Read these before implementing or modifying this subsystem:
- `src/app/api/health/route.ts`

---
_Back to [overview.md](./overview.md)_