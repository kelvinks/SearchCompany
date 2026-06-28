import { createClient } from '@supabase/supabase-js';

async function testUpdate() {
  const url = 'https://jpnzhtbgagwdstienmxy.supabase.co';
  const key = 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL';
  const email = 'jikang@gbsa.or.kr';

  console.log(`Trying to update auth.users using auth schema client...`);
  
  const supabaseAuthSchema = createClient(url, key, {
    db: {
      schema: 'auth'
    }
  });

  const { data, error } = await supabaseAuthSchema
    .from('users')
    .update({ email_confirmed_at: new Date().toISOString() })
    .eq('email', email);

  if (error) {
    console.error('Update failed:', error.message);
  } else {
    console.log('Update success!', data);
  }
}

testUpdate().then(() => process.exit());
