const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'profiles.json');

const DEFAULT_PROFILES = [
  {
    id: 'profile-demo-1',
    fullName: 'Avery Johnson',
    email: 'avery@example.com',
    role: 'Product Designer',
    bio: 'Design systems advocate who turns rough ideas into polished user journeys.',
    location: 'Austin, TX',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Avery%20Johnson',
    skills: ['Figma', 'Design Systems', 'Research'],
    createdAt: new Date('2026-01-10T09:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-10T09:00:00.000Z').toISOString()
  },
  {
    id: 'profile-demo-2',
    fullName: 'Mina Patel',
    email: 'mina@example.com',
    role: 'Backend Engineer',
    bio: 'Builds reliable services, APIs, and tooling for fast-moving product teams.',
    location: 'Seattle, WA',
    avatar: 'https://api.dicebear.com/9.x/initials/svg?seed=Mina%20Patel',
    skills: ['Node.js', 'PostgreSQL', 'System Design'],
    createdAt: new Date('2026-01-12T12:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-12T12:00:00.000Z').toISOString()
  }
];

function ensureDataFile(filePath = DEFAULT_DATA_FILE) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_PROFILES, null, 2));
  }
}

function createProfileStore(filePath = DEFAULT_DATA_FILE) {
  ensureDataFile(filePath);

  const readProfiles = () => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = raw.trim() ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  };

  const writeProfiles = (profiles) => {
    fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2));
  };

  const list = ({ q = '', role = '' } = {}) => {
    const searchTerm = q.trim().toLowerCase();
    const roleTerm = role.trim().toLowerCase();

    return readProfiles().filter((profile) => {
      const matchesSearch = !searchTerm
        || [
          profile.fullName,
          profile.email,
          profile.role,
          profile.location,
          profile.bio,
          ...(profile.skills || [])
        ].join(' ').toLowerCase().includes(searchTerm);

      const matchesRole = !roleTerm || profile.role.toLowerCase().includes(roleTerm);
      return matchesSearch && matchesRole;
    });
  };

  const getById = (id) => readProfiles().find((profile) => profile.id === id);

  const create = (input) => {
    const profiles = readProfiles();
    const now = new Date().toISOString();
    const profile = {
      id: crypto.randomUUID(),
      ...input,
      skills: Array.isArray(input.skills) ? input.skills : [],
      createdAt: now,
      updatedAt: now
    };
    profiles.unshift(profile);
    writeProfiles(profiles);
    return profile;
  };

  const update = (id, input) => {
    const profiles = readProfiles();
    const index = profiles.findIndex((profile) => profile.id === id);
    if (index === -1) {
      return null;
    }

    const updatedProfile = {
      ...profiles[index],
      ...input,
      id,
      skills: Array.isArray(input.skills) ? input.skills : profiles[index].skills,
      updatedAt: new Date().toISOString()
    };

    profiles[index] = updatedProfile;
    writeProfiles(profiles);
    return updatedProfile;
  };

  const remove = (id) => {
    const profiles = readProfiles();
    const nextProfiles = profiles.filter((profile) => profile.id !== id);
    if (nextProfiles.length === profiles.length) {
      return false;
    }
    writeProfiles(nextProfiles);
    return true;
  };

  return { ensureDataFile: () => ensureDataFile(filePath), list, getById, create, update, remove };
}

module.exports = {
  DEFAULT_DATA_FILE,
  DEFAULT_PROFILES,
  createProfileStore,
  ensureDataFile
};
