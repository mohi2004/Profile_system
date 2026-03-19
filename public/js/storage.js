import { DEMO_PROFILES } from './demoProfiles.js';

const DB_NAME = 'profile-system-db';
const DB_VERSION = 2;
const PROFILES_STORE = 'profiles';
const LIKES_STORE = 'likes';

function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed.'));
  });
}

async function openDatabase() {
  if (!('indexedDB' in window)) {
    throw new Error('IndexedDB is not supported in this browser.');
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROFILES_STORE)) {
        const profilesStore = db.createObjectStore(PROFILES_STORE, { keyPath: 'id' });
        profilesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(LIKES_STORE)) {
        const likesStore = db.createObjectStore(LIKES_STORE, { keyPath: 'profileId' });
        likesStore.createIndex('likedAt', 'likedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

function isValidProfile(profile) {
  return profile
    && typeof profile.id === 'string'
    && typeof profile.fullName === 'string'
    && typeof profile.email === 'string'
    && typeof profile.role === 'string'
    && typeof profile.bio === 'string';
}

async function withStore(storeName, mode, runner) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let settled = false;

    const complete = (value) => {
      settled = true;
      resolve(value);
    };

    Promise.resolve()
      .then(() => runner(store, transaction, complete))
      .catch((error) => {
        settled = true;
        reject(error);
      });

    transaction.oncomplete = () => {
      db.close();
      if (!settled) {
        resolve(undefined);
      }
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error('IndexedDB transaction failed.'));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error('IndexedDB transaction aborted.'));
    };
  });
}

export async function getAllProfiles() {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(PROFILES_STORE, 'readonly');
    const store = transaction.objectStore(PROFILES_STORE);
    const request = store.getAll();
    const records = await promisifyRequest(request);
    return Array.isArray(records) ? records.filter(isValidProfile) : [];
  } finally {
    db.close();
  }
}

export async function upsertProfile(profile) {
  return withStore(PROFILES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.put(profile);
    complete(profile);
  });
}

export async function deleteProfile(id) {
  await withStore(PROFILES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.delete(id);
    complete(true);
  });

  await unlikeProfile(id);
  return true;
}

export async function clearProfiles() {
  await withStore(PROFILES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.clear();
    complete(true);
  });

  await clearLikes();
  return true;
}

export async function seedProfiles(force = false) {
  const existing = await getAllProfiles();
  if (existing.length > 0 && !force) {
    return existing;
  }

  if (force) {
    await clearProfiles();
  }

  await withStore(PROFILES_STORE, 'readwrite', (store, _transaction, complete) => {
    DEMO_PROFILES.forEach((profile) => store.put({ ...profile }));
    complete(true);
  });

  return getAllProfiles();
}

export async function getLikedProfileIds() {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(LIKES_STORE, 'readonly');
    const store = transaction.objectStore(LIKES_STORE);
    const request = store.getAllKeys();
    const ids = await promisifyRequest(request);
    return Array.isArray(ids) ? ids.map(String) : [];
  } finally {
    db.close();
  }
}

export async function likeProfile(profileId) {
  return withStore(LIKES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.put({ profileId, likedAt: new Date().toISOString() });
    complete(true);
  });
}

export async function unlikeProfile(profileId) {
  return withStore(LIKES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.delete(profileId);
    complete(true);
  });
}

export async function clearLikes() {
  return withStore(LIKES_STORE, 'readwrite', (store, _transaction, complete) => {
    store.clear();
    complete(true);
  });
}

export async function toggleProfileLike(profileId) {
  const likedIds = new Set(await getLikedProfileIds());

  if (likedIds.has(profileId)) {
    await unlikeProfile(profileId);
    return false;
  }

  await likeProfile(profileId);
  return true;
}

export async function recoverDatabase() {
  await new Promise((resolve, reject) => {
    const request = window.indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to reset IndexedDB.'));
    request.onblocked = () => reject(new Error('IndexedDB reset was blocked by another tab.'));
  });

  return seedProfiles(true);
}
