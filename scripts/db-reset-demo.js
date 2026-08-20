const readline = require('node:readline/promises');
const { stdin, stdout, env, exit } = require('node:process');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const isProduction = String(env.NODE_ENV || '').toLowerCase() === 'production';
  if (isProduction && env.ALLOW_PRODUCTION_DEMO_RESET !== 'true') {
    console.error('Refusing to reset because NODE_ENV=production.');
    console.error('Set ALLOW_PRODUCTION_DEMO_RESET=true only if you really intend to do this.');
    exit(1);
  }

  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type RESET to delete demo data and keep only the super admin: ');
  rl.close();

  if (answer.trim() !== 'RESET') {
    console.error('Reset cancelled.');
    exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tables = ['attendance', 'payments', 'members', 'membership_plans', 'gyms', 'music_tracks', 'music_settings', 'audit_logs'];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete();
    if (error) {
      throw error;
    }
  }

  const { error: deleteUsersError } = await supabase
    .from('users')
    .delete()
    .neq('role', 'SUPER_ADMIN');
  if (deleteUsersError) throw deleteUsersError;

  const passwordHash = await bcrypt.hash('Super@2026#Admin', 10);
  const { error: upsertError } = await supabase.from('users').upsert(
    [{
      username: 'superadmin',
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      gym_id: null,
      name: 'System Administrator',
      status: 'active',
    }],
    { onConflict: 'username' }
  );
  if (upsertError) throw upsertError;

  console.log('Demo reset complete. Kept the super admin and cleared tenant/demo data.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  exit(1);
});
