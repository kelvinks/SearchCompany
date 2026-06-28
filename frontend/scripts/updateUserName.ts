import { createClient } from '@supabase/supabase-js';

const url = 'https://jpnzhtbgagwdstienmxy.supabase.co';
const key = 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL';

const supabase = createClient(url, key);

async function updateUserName() {
  const email = 'jikang@gbsa.or.kr';
  const password = 'rkdwjddlf96';

  console.log(`1. Logging in as ${email}...`);
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login failed:', signInError.message);
    return;
  }
  console.log('Login successful!');

  console.log('2. Updating user metadata (family_name: "강", name: "정일", full_name: "강정일")...');
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    data: {
      name: '정일',
      family_name: '강',
      full_name: '강정일'
    }
  });

  if (updateError) {
    console.error('Failed to update metadata:', updateError.message);
  } else {
    console.log('User metadata updated successfully!');
    console.log('Updated user metadata:', JSON.stringify(updateData.user?.user_metadata, null, 2));
  }

  console.log('3. Logging out...');
  await supabase.auth.signOut();
  console.log('Logout completed.');
}

updateUserName().then(() => process.exit());
