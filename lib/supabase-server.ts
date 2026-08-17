import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function createServerClient() {
  if (!supabaseUrl) {
    throw new Error(
      'Supabase URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY so server routes can read the users table.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
