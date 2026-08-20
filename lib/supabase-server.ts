import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createLocalServerClient } from './local-db';

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}

function createRemoteClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function allowLocalFallback() {
  return process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCAL_DB === 'true';
}

export function createServerClient() {
  if (isSupabaseConfigured()) {
    return createRemoteClient();
  }

  if (allowLocalFallback()) {
    return createLocalServerClient() as unknown as SupabaseClient;
  }

  if (!getSupabaseUrl()) {
    throw new Error(
      'Supabase URL is not configured. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL.'
    );
  }

  throw new Error(
    'Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY so server routes can read the users table.'
  );
}

/** Returns null when env is missing so optional features can skip persistence. */
export function tryCreateServerClient(): SupabaseClient | null {
  if (isSupabaseConfigured()) return createRemoteClient();
  if (allowLocalFallback()) return createLocalServerClient() as unknown as SupabaseClient;
  return null;
}
