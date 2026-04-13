import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client
 * Uses the service role key to bypass RLS policies and access admin APIs.
 * ONLY use in Server Actions/Route Handlers - NEVER expose to client.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin environment variables')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
