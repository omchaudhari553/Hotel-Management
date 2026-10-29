const http = require('http');

async function checkAllTables() {
  const loginData = JSON.stringify({ identifier: 'hoteladmin', password: 'Password@123' });
  const token = await new Promise((resolve, reject) => {
    const req = http.request('http://localhost:8080/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': loginData.length }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data).data.token));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  const getTables = async (bId) => {
    return new Promise((resolve) => {
      const url = bId ? `http://localhost:8080/api/v1/hotel/tables?branchId=${bId}` : `http://localhost:8080/api/v1/hotel/tables`;
      const req = http.request(url, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data).data));
      });
      req.on('error', () => resolve([]));
      req.end();
    });
  };

  const all = await getTables();
  console.log(`Total: ${all.length}`);
  for (const bId of [1, 2, 3, 4, 5]) {
    const bTables = await getTables(bId);
    console.log(`Branch ${bId}: ${bTables.length} tables:`, bTables.map(t => `${t.id}:${t.name}(${t.status},${t.area})`));
  }
}

checkAllTables().catch(console.error);
