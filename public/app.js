const form = document.querySelector('#profile-form');
const profileIdInput = document.querySelector('#profile-id');
const statusEl = document.querySelector('#form-status');
const profileCountEl = document.querySelector('#profile-count');
const profilesContainer = document.querySelector('#profiles');
const template = document.querySelector('#profile-card-template');
const searchInput = document.querySelector('#search');
const roleFilterInput = document.querySelector('#role-filter');
const resetButton = document.querySelector('#reset-form');

let profiles = [];

function setStatus(message, state = '') {
  statusEl.textContent = message;
  statusEl.dataset.state = state;
}

function resetForm() {
  form.reset();
  profileIdInput.value = '';
  setStatus('Ready to create a new profile.');
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
  setStatus(`Editing ${profile.fullName}.`, 'success');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function fetchProfiles() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('q', searchInput.value.trim());
  if (roleFilterInput.value.trim()) params.set('role', roleFilterInput.value.trim());

  const response = await fetch(`/api/profiles?${params.toString()}`);
  const data = await response.json();
  profiles = data.profiles;
  renderProfiles();
}

function renderProfiles() {
  profileCountEl.textContent = profiles.length;
  profilesContainer.innerHTML = '';

  if (profiles.length === 0) {
    profilesContainer.innerHTML = '<div class="empty-state">No profiles match the current filters.</div>';
    return;
  }

  profiles.forEach((profile) => {
    const fragment = template.content.cloneNode(true);
    fragment.querySelector('.avatar').src = profile.avatar;
    fragment.querySelector('.avatar').alt = `${profile.fullName} avatar`;
    fragment.querySelector('.profile-name').textContent = profile.fullName;
    fragment.querySelector('.profile-role').textContent = profile.role;
    fragment.querySelector('.profile-email').textContent = profile.email;
    fragment.querySelector('.profile-bio').textContent = profile.bio;
    fragment.querySelector('.profile-location').textContent = profile.location || 'Location not provided';

    const skillsList = fragment.querySelector('.skills-list');
    (profile.skills || []).forEach((skill) => {
      const chip = document.createElement('span');
      chip.className = 'skill-chip';
      chip.textContent = skill;
      skillsList.appendChild(chip);
    });

    fragment.querySelector('.edit-button').addEventListener('click', () => populateForm(profile));
    fragment.querySelector('.delete-button').addEventListener('click', async () => {
      const confirmed = window.confirm(`Delete ${profile.fullName}?`);
      if (!confirmed) return;

      const response = await fetch(`/api/profiles/${profile.id}`, { method: 'DELETE' });
      if (!response.ok) {
        setStatus('Could not delete the profile.', 'error');
        return;
      }

      if (profileIdInput.value === profile.id) {
        resetForm();
      }
      setStatus(`Deleted ${profile.fullName}.`, 'success');
      await fetchProfiles();
    });

    profilesContainer.appendChild(fragment);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    fullName: form.fullName.value,
    email: form.email.value,
    role: form.role.value,
    location: form.location.value,
    avatar: form.avatar.value,
    skills: form.skills.value,
    bio: form.bio.value
  };

  const profileId = profileIdInput.value;
  const response = await fetch(profileId ? `/api/profiles/${profileId}` : '/api/profiles', {
    method: profileId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    setStatus(data?.errors?.join(' ') || data?.message || 'Something went wrong.', 'error');
    return;
  }

  setStatus(profileId ? 'Profile updated successfully.' : 'Profile created successfully.', 'success');
  resetForm();
  await fetchProfiles();
});

searchInput.addEventListener('input', () => {
  fetchProfiles().catch(() => setStatus('Unable to search profiles right now.', 'error'));
});

roleFilterInput.addEventListener('input', () => {
  fetchProfiles().catch(() => setStatus('Unable to filter profiles right now.', 'error'));
});

resetButton.addEventListener('click', resetForm);

fetchProfiles().catch(() => setStatus('Unable to load profiles right now.', 'error'));
resetForm();
