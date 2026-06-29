const { Client } = require('pg');

const hosts = [
  'aws-0-ap-northeast-2.pooler.supabase.com', // Seoul
  'aws-0-ap-northeast-1.pooler.supabase.com', // Tokyo
  'aws-0-ap-southeast-1.pooler.supabase.com', // Singapore
  'aws-0-us-east-1.pooler.supabase.com',      // N. Virginia
  'aws-0-us-west-1.pooler.supabase.com'       // N. California
];

async function tryConnectAndExecute(host, port, password) {
  const email = 'jikang@gbsa.or.kr';
  const user = 'postgres.jpnzhtbgagwdstienmxy';

  console.log(`Trying ${host}:${port} with user ${user}...`);
  const client = new Client({
    host: host,
    port: port,
    database: 'postgres',
    user: user,
    password: password,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(`--> Connected successfully to ${host}!`);
    
    // 1. ALTER TABLE ADD COLUMN
    console.log('Executing DDL: Add additional_data column...');
    const ddlQuery = `ALTER TABLE public.search_logs ADD COLUMN IF NOT EXISTS additional_data jsonb default '{}'::jsonb;`;
    await client.query(ddlQuery);
    console.log('DDL execution completed successfully!');

    // 2. CONFIRM USER EMAIL
    console.log('Executing DML: Confirm user email...');
    const dmlQuery = `
      UPDATE auth.users 
      SET 
        email_confirmed_at = NOW(), 
        confirmed_at = NOW(),
        updated_at = NOW()
      WHERE email = $1;
    `;
    const res = await client.query(dmlQuery, [email]);
    console.log(`DML execution completed. ${res.rowCount} row(s) updated.`);
    
    await client.end();
    return true;
  } catch (err) {
    console.error(`Connection failed to ${host}:`, err.message);
    return false;
  }
}

async function main() {
  const password = 'rkdwjddlf96';
  const ports = [6543, 5432];

  for (const host of hosts) {
    for (const port of ports) {
      const success = await tryConnectAndExecute(host, port, password);
      if (success) {
        console.log('\nDatabase migration and user confirmation executed successfully!');
        return;
      }
    }
  }
  console.error('\nAll connection attempts failed. Check credentials or project reference.');
}

main().then(() => process.exit());
