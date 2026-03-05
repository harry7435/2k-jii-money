import { createBrowserClient } from '@supabase/ssr'

// Database generic is omitted to avoid type conflicts with supabase-js v2.98+.
// Type safety is enforced via explicit return types on each query function.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
