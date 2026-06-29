const { Client } = require('pg');

async function tryConnect(port, password) {
  const email = 'jikang@gbsa.or.kr';
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
  const user = 'postgres.jpnzhtbgagwdstienmxy';

  console.log(`Trying connection via port ${port} with password...`);
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
    console.log(`Successfully connected via port ${port}!`);
    
    const query = `
      UPDATE auth.users 
      SET 
        email_confirmed_at = NOW(), 
        confirmed_at = NOW(),
        updated_at = NOW()
      WHERE email = $1;
    `;
    
    const res = await client.query(query, [email]);
    console.log(`Update query result: ${res.rowCount} row(s) updated.`);
    
    await client.end();
    return true;
  } catch (err) {
    console.error(`Connection failed for port ${port}:`, err.message);
    return false;
  }
}

async function main() {
  const passwords = ['rkdwjddlf96', 'admin'];
  const ports = [6543, 5432];

  for (const password of passwords) {
    for (const port of ports) {
      const success = await tryConnect(port, password);
      if (success) {
        console.log('User status updated successfully.');
        return;
      }
    }
  }
  console.error('All DB connection attempts failed.');
}

main().then(() => process.exit());
