import { create } from 'zustand';

import { getApiErrorMessage } from '../services/api-client';
import {
  fetchApiInfo,
  fetchCurrentUser,
  fetchMediaAuthCode,
  loginWithPassword,
  refreshAuthTokens,
} from '../services/auth-service';
import { clearSessionSnapshot, loadSessionSnapshot, saveSessionSnapshot } from '../shared/session-storage';
import type { ApiInfo, AuthTokens, CurrentUser, SessionSnapshot, SessionStatus } from '../shared/types';
import {
  getPreferredServerUrl,
  getServerAddressCandidates,
  readLoginPreferences,
  readServerAddressPreferences,
} from '../shared/workspace-preferences';

interface SessionState extends SessionSnapshot {
  error?: string;
  status: SessionStatus;
  connect: (serverUrl: string) => Promise<void>;
  ensureAuthCode: () => Promise<string | undefined>;
  hydrate: () => Promise<void>;
  login: (params: { serverUrl: string; username: string; password: string; otp?: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<string | undefined>;
  switchServerUrl: (serverUrl: string) => Promise<void>;
}

type SessionGet = () => SessionState;
type SessionSet = (state: Partial<SessionState>) => void;

const DEFAULT_SERVER_URL = 'https://d.mtmt.tech';
const getInitialServerUrl = (): string => {
  const preferredServerUrl = getPreferredServerUrl(readServerAddressPreferences());
  const loginServerUrl = readLoginPreferences().serverUrl;

  return preferredServerUrl || loginServerUrl || DEFAULT_SERVER_URL;
};
const initialServerUrl = getInitialServerUrl();
let hydratePromise: Promise<void> | undefined;
let refreshPromise: Promise<string | undefined> | undefined;

/**
 * Global session store for connection, auth tokens and user permissions.
 */
export const useSessionStore = create<SessionState>((set, get) => ({
  serverUrl: initialServerUrl,
  status: 'booting',

  async hydrate() {
    if (hydratePromise) {
      return hydratePromise;
    }

    hydratePromise = (async () => {
      const snapshot = loadSessionSnapshot();

      if (!snapshot?.serverUrl || !snapshot.tokens?.refreshToken) {
        set({ serverUrl: await resolveReachablePublicServerUrl(snapshot?.serverUrl), status: 'guest' });
        return;
      }

      try {
        await hydrateAuthenticatedSession(snapshot, set, get);
      } catch (error) {
        clearSessionSnapshot();
        set({
          error: getApiErrorMessage(error),
          status: 'guest',
          tokens: undefined,
          user: undefined,
        });
      }
    })().finally(() => {
      hydratePromise = undefined;
    });

    return hydratePromise;
  },

  async connect(serverUrl) {
    set({ serverUrl, status: 'checking', error: undefined });

    try {
      const apiInfo = await fetchApiInfo(serverUrl);
      set({ apiInfo, serverUrl, status: 'guest' });
    } catch (error) {
      set({ error: getApiErrorMessage(error), status: 'error' });
    }
  },

  async ensureAuthCode() {
    const { serverUrl, tokens } = get();

    if (tokens?.authCode) {
      return tokens.authCode;
    }

    if (!tokens?.refreshToken) {
      return undefined;
    }

    const authCode = await fetchMediaAuthCode(serverUrl, tokens.refreshToken);
    const nextTokens = { ...tokens, authCode };

    saveSessionSnapshot(toSnapshot({ ...get(), tokens: nextTokens }));
    set({ tokens: nextTokens });

    return authCode;
  },

  async login(params) {
    set({ serverUrl: params.serverUrl, status: 'checking', error: undefined });

    try {
      commitSession(set, {
        serverUrl: params.serverUrl,
        ...(await loginWithPassword(params)),
      });
    } catch (error) {
      set({ error: getApiErrorMessage(error), status: 'guest' });
    }
  },

  logout() {
    clearSessionSnapshot();
    set({
      apiInfo: undefined,
      error: undefined,
      status: 'guest',
      tokens: undefined,
      user: undefined,
    });
  },

  async refresh() {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      const { serverUrl, tokens } = get();

      if (!tokens?.refreshToken) {
        return undefined;
      }

      const nextTokens = await refreshAuthTokens(serverUrl, tokens);
      const snapshot = { ...get(), tokens: nextTokens };

      saveSessionSnapshot(toSnapshot(snapshot));
      set({ tokens: nextTokens });

      return nextTokens.accessToken;
    })().finally(() => {
      refreshPromise = undefined;
    });

    return refreshPromise;
  },

  async switchServerUrl(serverUrl) {
    const normalizedServerUrl = normalizeServerUrl(serverUrl);

    if (!normalizedServerUrl) {
      return;
    }

    const previousSnapshot = toSnapshot(get());
    const previousError = get().error;
    const previousStatus = get().status;

    set({ error: undefined, serverUrl: normalizedServerUrl, status: 'checking' });

    try {
      const apiInfo = await fetchApiInfo(normalizedServerUrl);
      const tokens = previousSnapshot.tokens;

      if (tokens?.accessToken) {
        const user = await fetchCurrentUser({
          baseUrl: normalizedServerUrl,
          getAccessToken: () => get().tokens?.accessToken,
          onUnauthorized: get().refresh,
        });

        commitSession(set, {
          apiInfo,
          serverUrl: normalizedServerUrl,
          tokens: get().tokens ?? tokens,
          user,
        });
        return;
      }

      set({ apiInfo, error: undefined, serverUrl: normalizedServerUrl, status: 'guest' });
    } catch (error) {
      set({
        ...previousSnapshot,
        error: previousError,
        status: previousStatus === 'checking' ? 'guest' : previousStatus,
      });
      throw error;
    }
  },
}));

const commitSession = (set: (state: Partial<SessionState>) => void, snapshot: SessionSnapshot): void => {
  saveSessionSnapshot(snapshot);
  set({ ...snapshot, error: undefined, status: 'authenticated' });
};

const toSnapshot = (state: Partial<SessionState>): SessionSnapshot => {
  return {
    apiInfo: state.apiInfo,
    serverUrl: state.serverUrl ?? getInitialServerUrl(),
    tokens: state.tokens as AuthTokens | undefined,
    user: state.user as CurrentUser | undefined,
  };
};

/**
 * Restores auth against the first configured server that is both reachable and token-valid.
 */
const hydrateAuthenticatedSession = async (
  snapshot: SessionSnapshot,
  set: SessionSet,
  get: SessionGet,
): Promise<void> => {
  let lastError: unknown;

  for (const serverUrl of getRuntimeServerCandidates(snapshot.serverUrl)) {
    const candidateSnapshot = {
      ...snapshot,
      serverUrl,
      tokens: snapshot.tokens,
    };

    set({ ...candidateSnapshot, status: 'checking', error: undefined });

    try {
      const accessToken = await get().refresh();

      if (!accessToken) {
        lastError = new Error('登录状态已过期');
        continue;
      }

      const user = await fetchCurrentUser({
        baseUrl: serverUrl,
        getAccessToken: () => get().tokens?.accessToken,
        onUnauthorized: get().refresh,
      });

      commitSession(set, {
        ...candidateSnapshot,
        user,
        tokens: get().tokens,
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('无法恢复登录状态');
};

/**
 * Resolves the login screen server by testing configured addresses in preference order.
 */
const resolveReachablePublicServerUrl = async (fallbackUrl?: string): Promise<string> => {
  const candidates = getRuntimeServerCandidates(fallbackUrl);

  if (candidates.length === 0) {
    return DEFAULT_SERVER_URL;
  }

  try {
    return await Promise.any(
      candidates.map(async (serverUrl) => {
        await fetchApiInfo(serverUrl);
        return serverUrl;
      }),
    );
  } catch {
    return candidates[0] ?? DEFAULT_SERVER_URL;
  }
};

const getRuntimeServerCandidates = (fallbackUrl?: string): string[] => {
  return normalizeServerUrlList([
    ...getServerAddressCandidates(readServerAddressPreferences()),
    fallbackUrl,
    getInitialServerUrl(),
  ]);
};

const normalizeServerUrlList = (serverUrls: Array<string | undefined>): string[] => {
  return Array.from(new Set(serverUrls.map((serverUrl) => normalizeServerUrl(serverUrl ?? '')).filter(Boolean)));
};

const normalizeServerUrl = (serverUrl: string): string => {
  return serverUrl.trim().replace(/\/+$/, '');
};
