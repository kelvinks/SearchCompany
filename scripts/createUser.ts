import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';

async function createUser() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('Supabase is not configured. Check .env.local');
    return;
  }

  const email = 'jikang@gbsa.or.kr';
  const password = 'rkdwjddlf96';

  console.log(`Creating user ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'superuser',
      }
    }
  });

  if (error) {
    console.error('Failed to create user:', error.message);
  } else {
    console.log('User created successfully:', JSON.stringify(data, null, 2));
  }
}

createUser().then(() => process.exit());
