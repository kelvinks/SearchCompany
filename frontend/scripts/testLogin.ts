import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';

async function testLogin() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('Supabase is not configured. Check .env.local');
    return;
  }

  const email = 'jikang@gbsa.or.kr';
  const password = 'rkdwjddlf96';

  console.log(`Testing login for ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login failed:', error.message);
  } else {
    console.log('Login successful!');
    console.log('User ID:', data.user?.id);
    console.log('Email Confirmed At:', data.user?.email_confirmed_at);
  }
}

testLogin().then(() => process.exit());
