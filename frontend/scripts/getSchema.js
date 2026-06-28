const https = require('https');

const options = {
  hostname: 'jpnzhtbgagwdstienmxy.supabase.co',
  port: 443,
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': 'sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL',
    'Authorization': 'Bearer sb_publishable_VZf242axrJ9sO7QJVGMxVg_CCpbbtfL'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('Available Paths (endpoints):');
      console.log(Object.keys(parsed.paths));
    } catch (e) {
      console.log('Failed to parse body:', body);
    }
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.end();
