import {
  buildProfileRecord,
  createAvatar,
  filterProfiles,
  formatRelativeDate,
  sortProfiles,
  validateProfile
} from './js/validation.js';
import {
  clearLikes,
  clearProfiles,
  deleteProfile,
  getAllProfiles,
  getLikedProfileIds,
  recoverDatabase,
  seedProfiles,
  toggleProfileLike,
  upsertProfile
} from './js/storage.js';

const form = document.querySelector('#profile-form');
const profileIdInput = document.querySelector('#profile-id');
const statusEl = document.querySelector('#form-status');
const validationList = document.querySelector('#validation-errors');
const bioCounter = document.querySelector('#bio-counter');
const submitButton = document.querySelector('#submit-button');
const deleteCurrentButton = document.querySelector('#delete-current');
const profilesContainer = document.querySelector('#profiles');
const likesGrid = document.querySelector('#likes-grid');
const likesEmptyState = document.querySelector('#likes-empty-state');
const profileTemplate = document.querySelector('#profile-card-template');
const likedCardTemplate = document.querySelector('#liked-card-template');
const searchInput = document.querySelector('#search');
const roleFilterInput = document.querySelector('#role-filter');
const sortOrderInput = document.querySelector('#sort-order');
const resetButton = document.querySelector('#reset-form');
const seedDemoButton = document.querySelector('#seed-demo-data');
const clearDataButton = document.querySelector('#clear-all-data');
const loadingState = document.querySelector('#loading-state');
const selectedProfilePanel = document.querySelector('#selected-profile-panel');
const themeToggle = document.querySelector('#theme-toggle');
const toast = document.querySelector('#toast');
const showcasePills = document.querySelector('#showcase-pills');
const heroTotalProfiles = document.querySelector('#hero-total-profiles');
const heroRoleCount = document.querySelector('#hero-role-count');
const heroLikedCount = document.querySelector('#hero-liked-count');
const insightTotal = document.querySelector('#insight-total');
const insightTopRole = document.querySelector('#insight-top-role');
const insightLiked = document.querySelector('#insight-liked');
const insightLastUpdated = document.querySelector('#insight-last-updated');
const likesTotalCount = document.querySelector('#likes-total-count');

const state = {
  profiles: [],
  filteredProfiles: [],
  likedIds: new Set(),
  selectedProfileId: '',
  isHydrating: false
};

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem('profile-system-theme', theme);
}

function initializeTheme() {
  const storedTheme = window.localStorage.getItem('profile-system-theme');
  const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(storedTheme || (preferredDark ? 'dark' : 'light'));
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.remove('toast--visible');

  requestAnimationFrame(() => {
    toast.classList.add('toast--visible');
  });

  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.classList.remove('toast--visible');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 250);
  }, 2600);
}

function setStatus(message, tone = '') {
  statusEl.textContent = message;
  statusEl.dataset.state = tone;
}

function setValidationErrors(errors = []) {
  validationList.innerHTML = '';
  errors.forEach((error) => {
    const item = document.createElement('li');
    item.textContent = error;
    validationList.appendChild(item);
  });
}

function setLoading(isLoading) {
  state.isHydrating = isLoading;
  loadingState.hidden = !isLoading;
}

function updateBioCounter() {
  bioCounter.textContent = `${form.bio.value.length} / 320`;
}

function getFormPayload() {
  return {
    fullName: form.fullName.value,
    email: form.email.value,
    role: form.role.value,
    location: form.location.value,
    avatar: form.avatar.value,
    skills: form.skills.value,
    bio: form.bio.value,
    createdAt: state.profiles.find((profile) => profile.id === profileIdInput.value)?.createdAt
  };
}

function resetForm() {
  form.reset();
  profileIdInput.value = '';
  deleteCurrentButton.disabled = true;
  setValidationErrors();
  setStatus('Ready to create a new local profile.');
  submitButton.textContent = 'Save profile';
  updateBioCounter();
}

function populateForm(profile) {
  profileIdInput.value = profile.id;
  form.fullName.value = profile.fullName;
  form.email.value = profile.email;
  form.role.value = profile.role;
  form.location.value = profile.location || '';
  form.avatar.value = profile.avatar || '';
  form.skills.value = (profile.skills || []).join(', ');
  form.bio.value = profile.bio || '';
  deleteCurrentButton.disabled = false;
  submitButton.textContent = 'Update profile';
  setValidationErrors();
  setStatus(`Editing ${profile.fullName}.`, 'success');
  updateBioCounter();
  document.querySelector('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectProfile(profileId) {
  state.selectedProfileId = profileId;
  renderSelectedProfile();
}

function getProfileById(profileId) {
  return state.profiles.find((entry) => entry.id === profileId);
}

function isLiked(profileId) {
  return state.likedIds.has(profileId);
}

function buildMetaPills(profile) {
  const values = [profile.department, profile.year, ...(profile.interests || []).slice(0, 2)].filter(Boolean);
  return values.map((value) => `<span class="meta-pill">${escapeHtml(value)}</span>`).join('');
}

function renderShowcasePills() {
  const tags = [...new Set(state.profiles.flatMap((profile) => [profile.role, ...(profile.interests || [])]))].slice(0, 8);
  showcasePills.innerHTML = tags.map((tag) => `<span class="showcase-pill">${escapeHtml(tag)}</span>`).join('');
}

function renderSelectedProfile() {
  const profile = getProfileById(state.selectedProfileId);

  if (!profile) {
    selectedProfilePanel.innerHTML = '<p class="selected-profile-placeholder">Select a profile to inspect its details here.</p>';
    return;
  }

  selectedProfilePanel.innerHTML = `
    <div class="selected-profile-header">
      <img class="avatar avatar--large" src="${escapeHtml(profile.avatar || createAvatar(profile.fullName))}" alt="${escapeHtml(profile.fullName)} avatar" />
      <div>
        <p class="selected-profile-label">Focused profile</p>
        <h3>${escapeHtml(profile.fullName)}</h3>
        <p>${escapeHtml(profile.role)}</p>
      </div>
    </div>
    <p class="selected-profile-tagline">${escapeHtml(profile.tagline || 'High-potential profile with strong presentation value.')}</p>
    <p class="selected-profile-body">${escapeHtml(profile.bio)}</p>
    <div class="selected-profile-meta">
      <span>${escapeHtml(profile.email)}</span>
      <span>${escapeHtml(profile.location || 'Location pending')}</span>
      <span>Updated ${escapeHtml(formatRelativeDate(profile.updatedAt))}</span>
    </div>
    <div class="selected-profile-pills">${buildMetaPills(profile)}</div>
    <div class="skills-list">
      ${(profile.skills || []).map((skill) => `<span class="skill-chip">${escapeHtml(skill)}</span>`).join('')}
    </div>
    <div class="selected-profile-actions">
      <button class="like-button ${isLiked(profile.id) ? 'like-button--active' : ''}" type="button" data-like-profile-id="${escapeHtml(profile.id)}" aria-pressed="${isLiked(profile.id)}">
        <span class="like-button__icon">♥</span>
        <span class="like-button__label">${isLiked(profile.id) ? 'Liked profile' : 'Save to Like System'}</span>
      </button>
      <button class="ghost-button small-button" type="button" data-edit-profile-id="${escapeHtml(profile.id)}">Edit profile</button>
    </div>
  `;

  selectedProfilePanel.querySelector('[data-like-profile-id]')?.addEventListener('click', async () => {
    await handleToggleLike(profile.id, profile.fullName);
  });

  selectedProfilePanel.querySelector('[data-edit-profile-id]')?.addEventListener('click', () => {
    populateForm(profile);
  });
}

function renderInsights() {
  const roles = new Map();
  state.profiles.forEach((profile) => {
    const key = profile.role || 'Unknown';
    roles.set(key, (roles.get(key) || 0) + 1);
  });

  const topRole = [...roles.entries()].sort((a, b) => b[1] - a[1])[0];
  const latestProfile = [...state.profiles].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

  heroTotalProfiles.textContent = String(state.profiles.length);
  heroRoleCount.textContent = String(roles.size);
  heroLikedCount.textContent = String(state.likedIds.size);
  insightTotal.textContent = String(state.profiles.length);
  insightTopRole.textContent = topRole ? `${topRole[0]} · ${topRole[1]}` : 'No data yet';
  insightLiked.textContent = String(state.likedIds.size);
  insightLastUpdated.textContent = latestProfile ? `${latestProfile.fullName} · ${formatRelativeDate(latestProfile.updatedAt)}` : 'Waiting for activity';
  likesTotalCount.textContent = String(state.likedIds.size);
  renderShowcasePills();
}

function attachCardActions(node, profile) {
  node.querySelector('.edit-button')?.addEventListener('click', () => {
    populateForm(profile);
    selectProfile(profile.id);
  });

  node.querySelector('.inspect-button')?.addEventListener('click', () => {
    selectProfile(profile.id);
    document.querySelector('#workspace').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  node.querySelector('.delete-button')?.addEventListener('click', async () => {
    const confirmed = window.confirm(`Delete ${profile.fullName} from local browser storage?`);
    if (!confirmed) return;
    await handleDelete(profile.id, profile.fullName);
  });

  node.querySelector('.like-button')?.addEventListener('click', async () => {
    await handleToggleLike(profile.id, profile.fullName);
  });
}

function hydrateProfileCard(fragment, profile) {
  const card = fragment.querySelector('.profile-card');
  const liked = isLiked(profile.id);
  fragment.querySelector('.avatar').src = profile.avatar || createAvatar(profile.fullName);
  fragment.querySelector('.avatar').alt = `${profile.fullName} avatar`;
  fragment.querySelector('.profile-name').textContent = profile.fullName;
  fragment.querySelector('.profile-role').textContent = profile.role;
  fragment.querySelector('.profile-email').textContent = profile.email;
  fragment.querySelector('.profile-tagline').textContent = profile.tagline || 'Believable, demo-ready sample profile';
  fragment.querySelector('.profile-bio').textContent = profile.bio;
  fragment.querySelector('.profile-location').textContent = profile.location || 'Location not provided';
  fragment.querySelector('.profile-updated').textContent = `Updated ${formatRelativeDate(profile.updatedAt)}`;
  fragment.querySelector('.profile-extra-meta').innerHTML = buildMetaPills(profile);

  const likeButton = fragment.querySelector('.like-button');
  likeButton.classList.toggle('like-button--active', liked);
  likeButton.setAttribute('aria-pressed', String(liked));
  likeButton.querySelector('.like-button__label').textContent = liked ? 'Liked' : 'Like';

  const skillsList = fragment.querySelector('.skills-list');
  (profile.skills || []).forEach((skill) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.textContent = skill;
    skillsList.appendChild(chip);
  });

  if (card) {
    card.dataset.liked = String(liked);
    attachCardActions(card, profile);
  }
}

function renderProfiles() {
  const filtered = filterProfiles(state.profiles, searchInput.value, roleFilterInput.value);
  const ordered = sortProfiles(filtered, sortOrderInput.value);
  state.filteredProfiles = ordered;
  profilesContainer.innerHTML = '';

  if (ordered.length === 0) {
    profilesContainer.innerHTML = `
      <article class="empty-state glass-panel">
        <h3>No profiles match the current filters.</h3>
        <p>Try a broader search, reload the demo dataset, or create a fresh profile from the workspace above.</p>
        <a class="primary-button" href="#workspace">Create a profile</a>
      </article>
    `;
    return;
  }

  ordered.forEach((profile) => {
    const fragment = profileTemplate.content.cloneNode(true);
    hydrateProfileCard(fragment, profile);
    profilesContainer.appendChild(fragment);
  });
}

function renderLikes() {
  const likedProfiles = state.profiles.filter((profile) => isLiked(profile.id));
  likesGrid.innerHTML = '';
  likesEmptyState.hidden = likedProfiles.length !== 0;

  likedProfiles.forEach((profile) => {
    const fragment = likedCardTemplate.content.cloneNode(true);
    fragment.querySelector('.avatar').src = profile.avatar || createAvatar(profile.fullName);
    fragment.querySelector('.avatar').alt = `${profile.fullName} avatar`;
    fragment.querySelector('.profile-name').textContent = profile.fullName;
    fragment.querySelector('.profile-role').textContent = profile.role;
    fragment.querySelector('.profile-email').textContent = profile.email;
    fragment.querySelector('.profile-tagline').textContent = profile.tagline || 'Saved from the directory';
    fragment.querySelector('.profile-bio').textContent = profile.bio;

    const skillsList = fragment.querySelector('.skills-list');
    (profile.skills || []).forEach((skill) => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip';
      chip.textContent = skill;
      skillsList.appendChild(chip);
    });

    fragment.querySelector('.like-button')?.addEventListener('click', async () => {
      await handleToggleLike(profile.id, profile.fullName);
    });

    likesGrid.appendChild(fragment);
  });
}

function refreshUI() {
  renderProfiles();
  renderInsights();
  renderSelectedProfile();
  renderLikes();
}

async function hydrateProfiles() {
  setLoading(true);

  try {
    const [existingProfiles, likedIds] = await Promise.all([getAllProfiles(), getLikedProfileIds()]);
    state.profiles = existingProfiles.length > 0 ? existingProfiles : await seedProfiles();
    state.likedIds = new Set(likedIds);

    if (!state.selectedProfileId && state.profiles[0]) {
      state.selectedProfileId = state.profiles[0].id;
    }

    refreshUI();
    setStatus('Local IndexedDB data loaded successfully.', 'success');
  } catch (error) {
    console.error(error);
    state.profiles = await recoverDatabase();
    state.likedIds = new Set();
    setStatus('Local data was recovered and reseeded from demo profiles.', 'success');
    refreshUI();
    showToast('Recovered browser database.');
  } finally {
    setLoading(false);
  }
}

async function saveProfile() {
  const payload = getFormPayload();
  const errors = validateProfile(payload);
  setValidationErrors(errors);

  if (errors.length > 0) {
    setStatus('Please resolve the highlighted validation errors.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = profileIdInput.value ? 'Updating…' : 'Saving…';

  const isUpdate = Boolean(profileIdInput.value);

  try {
    const record = buildProfileRecord(payload, profileIdInput.value);
    await upsertProfile(record);
    state.profiles = await getAllProfiles();
    selectProfile(record.id);
    refreshUI();
    resetForm();
    setStatus(isUpdate ? 'Profile updated successfully.' : 'Profile created successfully.', 'success');
    showToast(isUpdate ? 'Profile updated.' : 'Profile created.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Save profile';
  }
}

async function handleDelete(profileId, name = 'profile') {
  await deleteProfile(profileId);
  state.profiles = await getAllProfiles();
  state.likedIds.delete(profileId);

  if (profileIdInput.value === profileId) {
    resetForm();
  }

  if (state.selectedProfileId === profileId) {
    state.selectedProfileId = state.profiles[0]?.id || '';
  }

  refreshUI();
  setStatus(`Deleted ${name}.`, 'success');
  showToast(`${name} removed from local storage.`);
}

async function handleToggleLike(profileId, name = 'profile') {
  const liked = await toggleProfileLike(profileId);

  if (liked) {
    state.likedIds.add(profileId);
  } else {
    state.likedIds.delete(profileId);
  }

  refreshUI();
  showToast(liked ? `${name} added to Like System.` : `${name} removed from Like System.`);
}

function initializeTiltCards() {
  document.addEventListener('pointermove', (event) => {
    document.querySelectorAll('.tilt-card').forEach((card) => {
      const rect = card.getBoundingClientRect();
      const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;

      if (!inside) {
        card.style.setProperty('--rotate-x', '0deg');
        card.style.setProperty('--rotate-y', '0deg');
        return;
      }

      const percentX = ((event.clientX - rect.left) / rect.width) - 0.5;
      const percentY = ((event.clientY - rect.top) / rect.height) - 0.5;
      card.style.setProperty('--rotate-x', `${percentY * -8}deg`);
      card.style.setProperty('--rotate-y', `${percentX * 10}deg`);
    });
  });
}

function initializeParallax() {
  const layers = document.querySelectorAll('.orb, .hero-stack');
  window.addEventListener('scroll', () => {
    const offset = window.scrollY * 0.08;
    layers.forEach((layer, index) => {
      const multiplier = index % 2 === 0 ? 1 : -0.7;
      layer.style.transform = `translate3d(0, ${offset * multiplier}px, 0)`;
    });
  }, { passive: true });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveProfile();
});

resetButton.addEventListener('click', resetForm);

deleteCurrentButton.addEventListener('click', async () => {
  if (!profileIdInput.value) return;
  const profile = getProfileById(profileIdInput.value);
  if (!profile) return;

  const confirmed = window.confirm(`Delete ${profile.fullName} from local browser storage?`);
  if (!confirmed) return;

  await handleDelete(profile.id, profile.fullName);
});

[searchInput, roleFilterInput, sortOrderInput].forEach((input) => {
  input.addEventListener('input', refreshUI);
  input.addEventListener('change', refreshUI);
});

seedDemoButton.addEventListener('click', async () => {
  await seedProfiles(true);
  state.profiles = await getAllProfiles();
  state.likedIds = new Set();
  await clearLikes();
  state.selectedProfileId = state.profiles[0]?.id || '';
  refreshUI();
  setStatus('Demo profiles reloaded into IndexedDB.', 'success');
  showToast('Demo dataset restored.');
});

clearDataButton.addEventListener('click', async () => {
  const confirmed = window.confirm('Clear all locally stored profiles and likes from this browser?');
  if (!confirmed) return;

  await clearProfiles();
  state.profiles = [];
  state.likedIds = new Set();
  state.selectedProfileId = '';
  resetForm();
  refreshUI();
  setStatus('All local profile data cleared.', 'success');
  showToast('Local data cleared.');
});

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  showToast(`${nextTheme[0].toUpperCase()}${nextTheme.slice(1)} theme enabled.`);
});

form.bio.addEventListener('input', updateBioCounter);

initializeTheme();
initializeTiltCards();
initializeParallax();
resetForm();
updateBioCounter();
hydrateProfiles();
