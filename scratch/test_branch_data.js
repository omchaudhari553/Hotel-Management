const http = require('http');

async function testBackend() {
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
      res.on('end', () => resolve(JSON.parse(data).data.token));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  const getEndpoint = async (url) => {
    return new Promise((resolve) => {
      const req = http.request(`http://localhost:8080/api/v1${url}`, {
        method: 'GET',
        headers: { Authorization: 'Bearer ' + token }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) {
            resolve({ error: data.substring(0, 100) });
          }
        });
      });
      req.on('error', (err) => resolve({ error: err.message }));
      req.end();
    });
  };

  for (const bId of [1, 2, 3, 5]) {
    console.log(`\n================ BRANCH ${bId} ================`);
    const tables = await getEndpoint(`/hotel/tables?branchId=${bId}`);
    console.log(`Tables count:`, tables.data ? tables.data.length : tables);
    if (tables.data && tables.data.length > 0) {
      console.log('Sample table:', tables.data[0]);
    }
    const orders = await getEndpoint(`/hotel/orders?branchId=${bId}`);
    console.log(`Orders count:`, orders.data ? orders.data.length : orders);

    const invoices = await getEndpoint(`/hotel/invoices?branchId=${bId}`);
    console.log(`Invoices count:`, invoices.data ? invoices.data.length : invoices);

    const payments = await getEndpoint(`/hotel/payments?branchId=${bId}`);
    console.log(`Payments count:`, payments.data ? payments.data.length : payments);

    const stats = await getEndpoint(`/hotel/reports/dashboard-stats?branchId=${bId}`);
    console.log(`Dashboard stats:`, stats.data ? {
      todaySales: stats.data.todaySales,
      totalSales: stats.data.totalSales,
      todayOrders: stats.data.todayOrders || stats.data.todayCafeOrders,
      totalInvoices: stats.data.totalInvoices,
    } : stats);
  }
}

testBackend().catch(console.error);
