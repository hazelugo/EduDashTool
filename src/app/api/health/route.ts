import { db } from '@/db'
import { sql } from 'drizzle-orm'

export async function GET() {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  try {
    await db.execute(sql`SELECT 1`)
    return Response.json({ status: 'ok', db: 'ok', env: envCheck })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    const cause = error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : String((error as { cause?: unknown } | null)?.cause ?? '')
    return Response.json(
      { status: 'error', db: 'unreachable', error: message, cause, env: envCheck },
      { status: 503 }
    )
  }
}
