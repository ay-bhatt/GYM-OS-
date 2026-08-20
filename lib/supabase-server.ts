import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

export function createServerClient() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getServiceRoleKey();

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

/** Returns null when env is missing so optional features can skip persistence. */
export function tryCreateServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createServerClient();
}
