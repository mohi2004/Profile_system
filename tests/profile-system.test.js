const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createApp, getContentType } = require('../src/app');

async function createTestServer() {
  const app = createApp();
  const server = http.createServer(app);
  server.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

test('getContentType returns expected values for core assets', () => {
  assert.equal(getContentType('index.html'), 'text/html; charset=utf-8');
  assert.equal(getContentType('styles.css'), 'text/css; charset=utf-8');
  assert.equal(getContentType('app.js'), 'application/javascript; charset=utf-8');
});

test('GET /health returns frontend-only status', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/health`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.status, 'ok');
    assert.equal(payload.mode, 'frontend-only');
  } finally {
    await server.close();
  }
});

test('GET / serves the landing page shell', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Profile System \| Premium Frontend Demo/);
    assert.match(html, /Launch workspace/);
    assert.match(html, /Hydrating browser data/);
  } finally {
    await server.close();
  }
});

test('GET /app.js serves the client module entrypoint', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/app.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/javascript/);
    const script = await response.text();
    assert.match(script, /hydrateProfiles\(\)/);
  } finally {
    await server.close();
  }
});

test('GET /api/profiles returns a frontend-only guidance message', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/api/profiles`);
    assert.equal(response.status, 404);
    const payload = await response.json();
    assert.match(payload.message, /frontend-only app/i);
    assert.match(payload.message, /IndexedDB/i);
  } finally {
    await server.close();
  }
});

test('unknown routes fall back to index.html for SPA hosting', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/workspace/demo`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Profile directory/);
  } finally {
    await server.close();
  }
});
