const http = require('http');

const data = JSON.stringify({
  identifier: 'hoteladmin',
  password: 'Password@123',
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 8080,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      const resp = JSON.parse(body);
      const token = resp.data.token;
      console.log('Got token:', token.substring(0, 20) + '...');

      // Now request /api/v1/hotel/orders with token
      const reqOrders = http.request(
        {
          hostname: 'localhost',
          port: 8080,
          path: '/api/v1/hotel/orders',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + token,
          },
        },
        (resOrders) => {
          let bodyOrders = '';
          resOrders.on('data', (c) => (bodyOrders += c));
          resOrders.on('end', () => {
            console.log('GET /hotel/orders STATUS:', resOrders.statusCode);
            console.log('GET /hotel/orders BODY:', bodyOrders.substring(0, 200));
          });
        }
      );
      reqOrders.end();
    });
  }
);

req.write(data);
req.end();
