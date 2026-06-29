const https = require('https');

const sql = `
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(), 
    confirmed_at = NOW(),
    updated_at = NOW()
  WHERE email = 'jikang@gbsa.or.kr';
`;

const data = JSON.stringify({ query: sql, sql: sql }); // Try both query and sql keys

const options = {
  hostname: 'jpnzhtbgagwdstienmxy.supabase.co',
  port: 443,
  path: '/rest/v1/rpc/run_sql', // Commonly used custom RPC name
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
    console.log(`Status Code: ${res.statusCode}`);
    console.log('Response Body:', body);
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
