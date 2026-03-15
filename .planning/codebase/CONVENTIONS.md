# Coding Conventions

**Analysis Date:** 2026-03-14

## Naming Patterns

**Files:**
- Components: `kebab-case.tsx` - Example: `app-sidebar.tsx`, `theme-provider.tsx`
- Pages: `kebab-case/page.tsx` - Example: `src/app/login/page.tsx`
- API routes: `route.ts` - Example: `src/app/api/health/route.ts`
- Utilities/functions: `kebab-case.ts` - Example: `use-mobile.ts`
- UI components: `kebab-case.tsx` - Example: `dialog.tsx`, `button.tsx`

**Functions:**
- camelCase for function names
- Exported functions use: `export function functionName()` or `export const functionName = ()`
- Component functions (React): `export function ComponentName()` or `export default function PageName()`
- Handler functions: `handleAction` pattern - Example: `handleSignOut`, `handleSubmit`
- Hooks: `use*` naming convention - Example: `useIsMobile()`

**Variables:**
- camelCase for local variables and state
- State variables: `const [state, setState] = useState<Type>()`
- Constants (module-level): camelCase or UPPER_CASE for truly immutable values
- Example: `const MOBILE_BREAKPOINT = 768`, `const navItems = [...]`

**Types:**
- PascalCase for type/interface names - Example: `type Mode = "signin" | "signup"`
- Props types: Often inline with component function
- Generic types: `React.ComponentProps<typeof Component>`

## Code Style

**Formatting:**
- No Prettier configuration file detected - follows Next.js default formatting
- Semicolons: Used consistently throughout codebase
- Quotes: Double quotes for string literals
- Indentation: 2 spaces (implicit from Next.js defaults)

**Linting:**
- ESLint configured via `eslint.config.mjs`
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config extends Next.js recommended rules with TypeScript support
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

**TypeScript:**
- Strict mode enabled (`"strict": true`)
- Target: ES2017
- Module: esnext
- Isolated modules enabled
- JSX: react-jsx

## Import Organization

**Order:**
1. External libraries (React, Next.js, third-party packages)
2. Internal utilities and lib imports (using `@/` alias)
3. Component imports

**Path Aliases:**
- `@/*` maps to `./src/*`
- Used throughout: `@/components/`, `@/lib/`, `@/db/`, `@/hooks/`

**Example from codebase:**
```typescript
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
```

## Error Handling

**Patterns:**
- **Try-catch with instanceof check:** Error objects are validated before accessing properties
  ```typescript
  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ok', db: 'ok' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    return Response.json(
      { status: 'error', db: 'unreachable', error: message },
      { status: 503 }
    )
  }
  ```

- **API-style error returns:** Functions return discriminated unions with error and data
  ```typescript
  export async function requireUser(): Promise<
    | { userId: string; error: null }
    | { userId: null; error: NextResponse }
  > {
    // ...check logic
    if (error || !user) {
      return {
        userId: null,
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }
    return { userId: user.id, error: null };
  }
  ```

- **Supabase error pattern:** Destructure `{ error }` from API response, check if error exists
  ```typescript
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    setError(error.message);
    return;
  }
  ```

- **Silent catch blocks for read-only operations:** Used when operation failure is expected/safe
  ```typescript
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options),
    );
  } catch {
    // Called from a Server Component — cookies are read-only, safe to ignore
  }
  ```

- **Context hook guards:** Throw error if hook used outside required provider
  ```typescript
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  ```

## Logging

**Framework:** No explicit logging framework detected - uses browser `console` and server response objects

**Patterns:**
- Errors returned in API responses with `Response.json()`
- Client-side errors stored in state for UI display
- No structured logging middleware implemented

## Comments

**When to Comment:**
- JSDoc-style comments for exported functions
- Inline comments for non-obvious logic or workarounds
- Comments for critical requirements (e.g., database configuration requirements)

**JSDoc/TSDoc:**
- Used for public functions like `requireUser()`
  ```typescript
  /** Call at the top of any API route handler that requires authentication.
   *  Returns the authenticated user ID, or a 401 NextResponse to return immediately. */
  export async function requireUser(): Promise<...>
  ```

## Function Design

**Size:**
- Small, focused functions (most utility functions under 50 lines)
- Component functions typical 40-150 lines

**Parameters:**
- Use object destructuring for multiple parameters
- React components use destructured props with TypeScript typing

**Return Values:**
- React components return JSX.Element
- Utility functions return typed values
- Async functions commonly return Promise<T> or discriminated unions

## Module Design

**Exports:**
- Named exports for utilities: `export function functionName()` or `export { Component }`
- Default exports for page/layout components: `export default function PageName()`
- Re-exports from UI components for composition

**Barrel Files:**
- Not used (no `index.ts` export aggregators found)

**Component Composition Pattern:**
- Primitive components from `@base-ui/react` wrapped with styling via `cn()` utility
- Example: `Button` wraps `ButtonPrimitive` from `@base-ui/react/button`
- Styling applied through className with `cva` (class-variance-authority)
- Consistent use of `data-slot` attributes for component identification

## Styling

**Class Management:**
- `cn()` utility from `lib/utils.ts` combines clsx + tailwind-merge
- Used to merge base classes with optional/variant classes
- Prevents Tailwind conflicts when composing styles

**Variant Patterns:**
- Use `class-variance-authority` (cva) for component variants
- Example pattern:
  ```typescript
  const buttonVariants = cva("base-classes", {
    variants: {
      variant: {
        default: "variant-specific-classes",
        outline: "variant-specific-classes",
      },
      size: {
        default: "size-specific-classes",
        sm: "size-specific-classes",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });
  ```

---

*Convention analysis: 2026-03-14*
