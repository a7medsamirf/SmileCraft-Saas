import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client using the **service role** key.
 * This client **bypasses Row Level Security (RLS)** and should ONLY be used
 * for trusted server-side operations like:
 *   - Bootstrapping clinics/users during first-time signup
 *   - Creating clinic records for users who signed up before migration
 *   - Any admin operation that needs to bypass RLS
 *
 * ⚠️ NEVER expose this client to the browser or use it in client components.
 */
export async function createServiceClient() {
  const cookieStore = await cookies()

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. ' +
      'Please add it to your .env.local file.'
    )
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
