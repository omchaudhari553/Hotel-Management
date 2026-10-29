const http = require('http');

async function test() {
  const loginData = JSON.stringify({ identifier: 'hoteladmin', password: 'Password@123' });
  
  const token = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length,
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.data.token);
      });
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  const tables = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:8080/api/v1/hotel/tables', {
      method: 'GET',
      headers: { Authorization: 'Bearer ' + token }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const json = JSON.parse(data);
        resolve(json.data);
      });
    });
    req.on('error', reject);
    req.end();
  });

  console.log('Total tables returned by /hotel/tables:', tables.length);
  const byBranch = {};
  for (const t of tables) {
    const b = `${t.branchId} - ${t.branchName}`;
    byBranch[b] = (byBranch[b] || 0) + 1;
  }
  console.log('Tables by branch:', byBranch);
}

test().catch(console.error);
