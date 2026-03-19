const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { createProfileStore } = require('./profileStore');

function normalizeSkills(skillsInput) {
  if (Array.isArray(skillsInput)) {
    return skillsInput.map((skill) => String(skill).trim()).filter(Boolean);
  }

  if (typeof skillsInput === 'string') {
    return skillsInput
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
  }

  return [];
}

function validateProfile(payload) {
  const errors = [];

  if (!payload.fullName || payload.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long.');
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.push('A valid email address is required.');
  }

  if (!payload.role || payload.role.trim().length < 2) {
    errors.push('Role must be at least 2 characters long.');
  }

  if (!payload.bio || payload.bio.trim().length < 10) {
    errors.push('Bio must be at least 10 characters long.');
  }

  return errors;
}

function sanitizeProfileInput(payload = {}) {
  return {
    fullName: String(payload.fullName || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    role: String(payload.role || '').trim(),
    bio: String(payload.bio || '').trim(),
    location: String(payload.location || '').trim(),
    avatar: String(payload.avatar || '').trim() || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(String(payload.fullName || 'Profile'))}`,
    skills: normalizeSkills(payload.skills)
  };
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    default: return 'text/plain; charset=utf-8';
  }
}

function createApp(options = {}) {
  const store = options.store || createProfileStore(options.dataFile);
  const publicDir = path.join(__dirname, '..', 'public');

  const sendJson = (res, statusCode, payload) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
  };

  const sendFile = (res, filePath) => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      sendJson(res, 404, { message: 'File not found.' });
      return;
    }

    res.writeHead(200, { 'Content-Type': getContentType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  };

  const parseBody = async (req) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    if (chunks.length === 0) {
      return {};
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    return raw ? JSON.parse(raw) : {};
  };

  return async function app(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    if (req.method === 'GET' && pathname === '/health') {
      return sendJson(res, 200, { status: 'ok' });
    }

    if (pathname === '/api/profiles' && req.method === 'GET') {
      const profiles = store.list({ q: url.searchParams.get('q') || '', role: url.searchParams.get('role') || '' });
      return sendJson(res, 200, { profiles, total: profiles.length });
    }

    if (pathname.startsWith('/api/profiles/')) {
      const id = pathname.split('/').pop();

      if (req.method === 'GET') {
        const profile = store.getById(id);
        return profile
          ? sendJson(res, 200, profile)
          : sendJson(res, 404, { message: 'Profile not found.' });
      }

      if (req.method === 'PUT') {
        try {
          const payload = sanitizeProfileInput(await parseBody(req));
          const errors = validateProfile(payload);
          if (errors.length > 0) {
            return sendJson(res, 400, { message: 'Validation failed.', errors });
          }

          const profile = store.update(id, payload);
          return profile
            ? sendJson(res, 200, profile)
            : sendJson(res, 404, { message: 'Profile not found.' });
        } catch (error) {
          return sendJson(res, 400, { message: 'Invalid JSON payload.' });
        }
      }

      if (req.method === 'DELETE') {
        const removed = store.remove(id);
        if (!removed) {
          return sendJson(res, 404, { message: 'Profile not found.' });
        }
        res.writeHead(204);
        return res.end();
      }
    }

    if (pathname === '/api/profiles' && req.method === 'POST') {
      try {
        const payload = sanitizeProfileInput(await parseBody(req));
        const errors = validateProfile(payload);
        if (errors.length > 0) {
          return sendJson(res, 400, { message: 'Validation failed.', errors });
        }

        const profile = store.create(payload);
        return sendJson(res, 201, profile);
      } catch (error) {
        return sendJson(res, 400, { message: 'Invalid JSON payload.' });
      }
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { message: 'Route not found.' });
    }

    const candidatePath = pathname === '/'
      ? path.join(publicDir, 'index.html')
      : path.join(publicDir, pathname.replace(/^\/+/, ''));

    if (candidatePath.startsWith(publicDir) && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return sendFile(res, candidatePath);
    }

    return sendFile(res, path.join(publicDir, 'index.html'));
  };
}

module.exports = {
  createApp,
  normalizeSkills,
  sanitizeProfileInput,
  validateProfile
};
