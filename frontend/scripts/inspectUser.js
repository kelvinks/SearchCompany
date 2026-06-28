const { Client } = require('pg');

async function main() {
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
  const port = 6543;
  const password = 'rkdwjddlf96';
  const user = 'postgres.jpnzhtbgagwdstienmxy';

  const client = new Client({
    host: host,
    port: port,
    database: 'postgres',
    user: user,
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const res = await client.query("SELECT id, email, raw_user_meta_data FROM auth.users;");
    console.log("Users in auth.users:");
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error("Error inspecting users:", err);
  }
}

main();
