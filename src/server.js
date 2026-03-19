const http = require('node:http');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 3000;
const server = http.createServer(createApp());

server.listen(PORT, () => {
  console.log(`Profile system running on http://localhost:${PORT}`);
});
