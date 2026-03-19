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

export function createAvatar(fullName = '') {
  const seed = encodeURIComponent(fullName || 'Profile System');
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}`;
}

export function sanitizeProfileInput(payload = {}) {
  return {
    fullName: String(payload.fullName || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    role: String(payload.role || '').trim(),
    bio: String(payload.bio || '').trim(),
    location: String(payload.location || '').trim(),
    avatar: String(payload.avatar || '').trim() || createAvatar(payload.fullName),
    skills: normalizeSkills(payload.skills)
  };
}

export function validateProfile(payload = {}) {
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

export function buildProfileRecord(payload, existingProfileId = '') {
  const profile = sanitizeProfileInput(payload);
  const now = new Date().toISOString();

  return {
    id: existingProfileId || crypto.randomUUID(),
    ...profile,
    createdAt: payload.createdAt || now,
    updatedAt: now
  };
}

export function sortProfiles(profiles, order) {
  const nextProfiles = [...profiles];

  switch (order) {
    case 'name-asc':
      return nextProfiles.sort((a, b) => a.fullName.localeCompare(b.fullName));
    case 'role-asc':
      return nextProfiles.sort((a, b) => a.role.localeCompare(b.role));
    case 'updated-desc':
    default:
      return nextProfiles.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

export function filterProfiles(profiles, searchTerm = '', roleTerm = '') {
  const query = searchTerm.trim().toLowerCase();
  const roleFilter = roleTerm.trim().toLowerCase();

  return profiles.filter((profile) => {
    const matchesSearch = !query || [
      profile.fullName,
      profile.email,
      profile.role,
      profile.location,
      profile.bio,
      ...(profile.skills || [])
    ].join(' ').toLowerCase().includes(query);

    const matchesRole = !roleFilter || profile.role.toLowerCase().includes(roleFilter);
    return matchesSearch && matchesRole;
  });
}

export function formatRelativeDate(isoString) {
  if (!isoString) {
    return 'Recently';
  }

  const timestamp = new Date(isoString).getTime();
  if (Number.isNaN(timestamp)) {
    return 'Unknown update';
  }

  const diffMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;

  return new Date(isoString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
