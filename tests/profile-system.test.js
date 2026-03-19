const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');
const { createProfileStore } = require('../src/profileStore');

async function createTestServer() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-system-'));
  const dataFile = path.join(tempDir, 'profiles.json');
  const store = createProfileStore(dataFile);
  const app = createApp({ store });
  const server = http.createServer(app);
  server.listen(0);

  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();

  return {
    store,
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  };
}

test('GET /api/profiles returns seeded profiles', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/api/profiles`);
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.total, 2);
    assert.equal(payload.profiles[0].fullName, 'Avery Johnson');
  } finally {
    await server.close();
  }
});

test('POST /api/profiles creates a new profile', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Taylor Brooks',
        email: 'taylor@example.com',
        role: 'QA Engineer',
        bio: 'Owns release quality and automated coverage across the platform.',
        location: 'Denver, CO',
        skills: 'Testing, Playwright, CI'
      })
    });

    assert.equal(response.status, 201);
    const profile = await response.json();
    assert.equal(profile.fullName, 'Taylor Brooks');
    assert.deepEqual(profile.skills, ['Testing', 'Playwright', 'CI']);

    const listResponse = await fetch(`${server.url}/api/profiles`);
    const listPayload = await listResponse.json();
    assert.equal(listPayload.total, 3);
  } finally {
    await server.close();
  }
});

test('PUT /api/profiles/:id updates an existing profile', async () => {
  const server = await createTestServer();

  try {
    const existing = server.store.list()[0];
    const response = await fetch(`${server.url}/api/profiles/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: existing.fullName,
        email: existing.email,
        role: 'Lead Product Designer',
        bio: `${existing.bio} Focused on mentoring and design ops.`,
        location: existing.location,
        avatar: existing.avatar,
        skills: existing.skills.concat('Leadership')
      })
    });

    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.equal(updated.role, 'Lead Product Designer');
    assert.ok(updated.skills.includes('Leadership'));
  } finally {
    await server.close();
  }
});

test('DELETE /api/profiles/:id removes an existing profile', async () => {
  const server = await createTestServer();

  try {
    const existing = server.store.list()[0];
    const response = await fetch(`${server.url}/api/profiles/${existing.id}`, { method: 'DELETE' });
    assert.equal(response.status, 204);

    const listResponse = await fetch(`${server.url}/api/profiles`);
    const listPayload = await listResponse.json();
    assert.equal(listPayload.total, 1);
  } finally {
    await server.close();
  }
});

test('POST /api/profiles validates required fields', async () => {
  const server = await createTestServer();

  try {
    const response = await fetch(`${server.url}/api/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'x',
        email: 'invalid-email',
        role: '',
        bio: 'short'
      })
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.message, 'Validation failed.');
    assert.ok(payload.errors.length >= 3);
  } finally {
    await server.close();
  }
});
