import { createClient } from '@supabase/supabase-js';

const url = 'https://jpnzhtbgagwdstienmxy.supabase.co';
const key = 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL';

const supabase = createClient(url, key);

async function inspect() {
  const { data, error } = await supabase
    .from('search_logs')
    .select('id, title, description, created_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching logs:', error.message);
    return;
  }

  console.log('\n--- TOP 3 SEARCH LOGS IN DATABASE ---');
  data.forEach((log, index) => {
    console.log(`\n[Log #${index + 1}] ID: ${log.id}`);
    console.log(`  - Title     : ${log.title}`);
    console.log(`  - Created At: ${log.created_at}`);
    console.log(`  - Length of Description: ${log.description?.length} chars`);
    
    try {
      const parsed = JSON.parse(log.description || '');
      console.log(`  - Description Type: JSON`);
      console.log(`  - Parsed Desc: "${parsed.desc}"`);
      console.log(`  - Contains results array: ${Array.isArray(parsed.results) ? `YES (${parsed.results.length} companies)` : 'NO'}`);
    } catch {
      console.log(`  - Description Type: Plain Text`);
      console.log(`  - Description Val: "${log.description}"`);
    }
  });
  console.log('\n-------------------------------------');
}

inspect().then(() => process.exit());
