import type { SessionSnapshot } from './types';

const SESSION_STORAGE_KEY = 'kwphoto:session';

/**
 * Reads the persisted MT Photos session from localStorage.
 * @returns Saved session snapshot or null when the payload is missing/invalid.
 */
export const loadSessionSnapshot = (): SessionSnapshot | null => {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionSnapshot;
  } catch {
    clearSessionSnapshot();
    return null;
  }
};

/**
 * Persists the minimum data needed to resume a session.
 * @param snapshot Current session snapshot.
 */
export const saveSessionSnapshot = (snapshot: SessionSnapshot): void => {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
};

/**
 * Clears all persisted session data owned by the desktop client.
 */
export const clearSessionSnapshot = (): void => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};
