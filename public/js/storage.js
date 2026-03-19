import { DEMO_PROFILES } from './demoProfiles.js';

const DB_NAME = 'profile-system-db';
const DB_VERSION = 1;
const STORE_NAME = 'profiles';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });
}

async function runTransaction(mode, executor) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = executor(store, transaction);

    transaction.oncomplete = () => {
      db.close();
      resolve(result);
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

function isValidProfile(profile) {
  return profile
    && typeof profile.id === 'string'
    && typeof profile.fullName === 'string'
    && typeof profile.email === 'string'
    && typeof profile.role === 'string'
    && typeof profile.bio === 'string';
}

export async function getAllProfiles() {
  const db = await openDatabase();

  try {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    const records = await promisifyRequest(request);
    return Array.isArray(records) ? records.filter(isValidProfile) : [];
  } finally {
    db.close();
  }
}

export async function upsertProfile(profile) {
  return runTransaction('readwrite', (store) => {
    store.put(profile);
    return profile;
  });
}

export async function deleteProfile(id) {
  return runTransaction('readwrite', (store) => {
    store.delete(id);
    return true;
  });
}

export async function clearProfiles() {
  return runTransaction('readwrite', (store) => {
    store.clear();
    return true;
  });
}

export async function seedProfiles(force = false) {
  const existing = await getAllProfiles();
  if (existing.length > 0 && !force) {
    return existing;
  }

  if (force) {
    await clearProfiles();
  }

  await runTransaction('readwrite', (store) => {
    DEMO_PROFILES.forEach((profile) => store.put({ ...profile }));
    return true;
  });

  return getAllProfiles();
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
