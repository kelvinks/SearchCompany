const https = require('https');

const rpcNames = [
  'exec_sql', 'run_sql', 'execute_sql', 'sql', 'query', 'exec', 'run_query', 'execute_query', 
  'db_query', 'update_user_status', 'confirm_user', 'activate_user', 'force_confirm_user',
  'confirm_email', 'verify_email', 'verify_user', 'bypass_confirm'
];

function probeRpc(name) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ query: 'SELECT 1;', sql: 'SELECT 1;', email: 'jikang@gbsa.or.kr' });
    const options = {
      hostname: 'jpnzhtbgagwdstienmxy.supabase.co',
      port: 443,
      path: `/rest/v1/rpc/${name}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL',
        'Authorization': 'Bearer sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        resolve({ name, status: res.statusCode, body });
      });
    });

    req.on('error', () => {
      resolve({ name, status: 500 });
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('Probing possible RPC functions...');
  for (const name of rpcNames) {
    const res = await probeRpc(name);
    if (res.status !== 404) {
      console.log(`FOUND potential RPC: ${res.name} (Status: ${res.status})`);
      console.log('Response:', res.body);
    }
  }
  console.log('Probing complete.');
}

main().then(() => process.exit());
