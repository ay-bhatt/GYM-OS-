const readline = require('node:readline/promises');
const { stdin, stdout, env, exit } = require('node:process');
const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  if (env.ALLOW_DEMO_SEED !== 'true') {
    console.error('Demo seeding is disabled by default.');
    console.error('Set ALLOW_DEMO_SEED=true to run this command.');
    exit(1);
  }

  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    exit(1);
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type SEED to insert demo data: ');
  rl.close();

  if (answer.trim() !== 'SEED') {
    console.error('Demo seed cancelled.');
    exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const passwordHash = await bcrypt.hash('Demo@2026#Admin', 10);
  const gymId = 'DEMO-001';

  await supabase.from('attendance').delete().eq('gym_id', gymId);
  await supabase.from('payments').delete().eq('gym_id', gymId);
  await supabase.from('members').delete().eq('gym_id', gymId);
  await supabase.from('membership_plans').delete().eq('gym_id', gymId);
  await supabase.from('users').delete().ilike('username', 'demo_admin');
  await supabase.from('gyms').delete().ilike('gym_id', gymId);

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .insert({
      gym_id: gymId,
      name: 'Demo Fitness',
      owner_name: 'Demo Owner',
      phone: '+91 99999 99999',
      email: 'demo@example.com',
      address: 'Demo City',
      status: 'active',
    })
    .select('id, gym_id')
    .single();
  if (gymError) throw gymError;

  const { error: adminError } = await supabase.from('users').upsert(
    {
      username: 'demo_admin',
      password_hash: passwordHash,
      role: 'GYM_ADMIN',
      gym_id: gymId,
      name: 'Demo Owner',
      status: 'active',
    },
    { onConflict: 'username' }
  );
  if (adminError) throw adminError;

  const { data: plan, error: planError } = await supabase
    .from('membership_plans')
    .insert({
      gym_id: gymId,
      name: 'Monthly Demo',
      duration_days: 30,
      price: 999,
      discount: 0,
      final_price: 999,
      description: 'Development demo plan',
      status: 'active',
    })
    .select('id')
    .single();
  if (planError) throw planError;

  const memberId = `M-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const { data: member, error: memberError } = await supabase
    .from('members')
    .insert({
      gym_id: gymId,
      member_id: memberId,
      name: 'Demo Member',
      phone: '+91 88888 88888',
      plan_id: plan.id,
      start_date: new Date().toISOString().slice(0, 10),
      expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      amount_paid: 999,
      status: 'active',
      qr_token: crypto.randomUUID(),
    })
    .select('id')
    .single();
  if (memberError) throw memberError;

  const today = new Date().toISOString().slice(0, 10);
  const { error: attendanceError } = await supabase.from('attendance').upsert(
    {
      gym_id: gymId,
      member_id: member.id,
      date: today,
      check_in_time: new Date().toISOString(),
      status: 'present',
    },
    { onConflict: 'gym_id,member_id,date' }
  );
  if (attendanceError) throw attendanceError;

  const { error: paymentError } = await supabase.from('payments').upsert(
    {
      gym_id: gymId,
      member_id: member.id,
      plan_id: plan.id,
      amount: 999,
      discount: 0,
      payment_method: 'Cash',
      payment_date: new Date().toISOString(),
      notes: 'Demo payment',
    }
  );
  if (paymentError) throw paymentError;

  console.log('Demo data inserted for local development.');
  console.log(`Gym: ${gymId}`);
  console.log('Gym admin: demo_admin / Demo@2026#Admin');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  exit(1);
});
