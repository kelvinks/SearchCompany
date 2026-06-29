import { supabase, isSupabaseConfigured } from '../src/services/supabaseClient';

async function verify() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('Supabase is not configured. Check .env.local');
    return;
  }

  const email = 'jikang@gbsa.or.kr';
  console.log(`Verifying email ${email} using default OTP '123456'...`);
  
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: '123456',
    type: 'signup'
  });

  if (error) {
    console.error('Verification failed:', error.message);
  } else {
    console.log('Verification successful! User is now confirmed.');
    console.log('User data:', data.user?.id);
  }
}

verify().then(() => process.exit());
