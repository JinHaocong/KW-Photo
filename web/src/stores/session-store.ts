import { create } from 'zustand';
import {
  PreferredServerUnavailableError,
  selectPreferredServer,
  type PreferredServerCandidate,
} from '@kwphoto/core';

import { ApiRequestError, getApiErrorMessage } from '../services/api-client';
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
  readLoginPreferences,
  readServerAddressPreferences,
  type WorkspaceServerAddressPreferenceRole,
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

type SessionSet = (state: Partial<SessionState>) => void;

const DEFAULT_SERVER_URL = 'https://d.mtmt.tech';
const SESSION_RECOVERY_TIMEOUT_MS = 2000;
const getInitialServerUrl = (): string => {
  const loginServerUrl = readLoginPreferences().serverUrl;
  const preferredServerUrl = getPreferredServerUrl(readServerAddressPreferences());

  return loginServerUrl || preferredServerUrl || DEFAULT_SERVER_URL;
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
        set({ serverUrl: getInitialServerUrl(), status: 'guest' });
        return;
      }

      try {
        await hydrateAuthenticatedSession(snapshot, set);
      } catch (error) {
        if (shouldClearSessionAfterRecoveryError(error)) {
          clearSessionSnapshot();
          set({
            error: getApiErrorMessage(error),
            status: 'guest',
            tokens: undefined,
            user: undefined,
          });
          return;
        }

        set({
          ...snapshot,
          error: getApiErrorMessage(error),
          status: 'authenticated',
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
 * Restores auth after selecting a reachable primary/backup server in one parallel probe window.
 */
const hydrateAuthenticatedSession = async (
  snapshot: SessionSnapshot,
  set: SessionSet,
): Promise<void> => {
  const { candidates, preferredRole } = getRuntimeServerRecoveryConfig(snapshot.serverUrl);

  set({ ...snapshot, status: 'checking', error: undefined });

  const selectedServer = await selectPreferredServer<ApiInfo>({
    candidates,
    preferredRole,
    probeCandidate: (candidate) => fetchApiInfo(candidate.url),
    timeoutMs: SESSION_RECOVERY_TIMEOUT_MS,
  });
  const nextSnapshot = await createSessionForServer(snapshot, selectedServer.candidate.url, selectedServer.value, {
    refreshFirst: true,
  });

  commitSession(set, nextSnapshot);
};

const createSessionForServer = async (
  snapshot: SessionSnapshot,
  serverUrl: string,
  apiInfo: ApiInfo,
  options: { refreshFirst?: boolean } = {},
): Promise<SessionSnapshot> => {
  if (!snapshot.tokens?.refreshToken) {
    throw new Error('登录状态已过期');
  }

  const tokensRef = { current: snapshot.tokens };

  if (options.refreshFirst) {
    tokensRef.current = await refreshAuthTokens(serverUrl, tokensRef.current);
  }

  const user = await fetchCurrentUser({
    baseUrl: serverUrl,
    getAccessToken: () => tokensRef.current.accessToken,
    onUnauthorized: async () => {
      const nextTokens = await refreshAuthTokens(serverUrl, tokensRef.current);

      tokensRef.current = nextTokens;
      return nextTokens.accessToken;
    },
  });

  return {
    ...snapshot,
    apiInfo,
    serverUrl,
    tokens: tokensRef.current,
    user,
  };
};

/**
 * Converts saved workspace server settings into primary/backup recovery candidates.
 */
const getRuntimeServerRecoveryConfig = (
  fallbackUrl?: string,
): { candidates: PreferredServerCandidate[]; preferredRole: WorkspaceServerAddressPreferenceRole } => {
  const preferences = readServerAddressPreferences();
  const primaryUrl = normalizeServerUrl(preferences.primaryUrl || fallbackUrl || getInitialServerUrl());
  const backupUrl = normalizeServerUrl(preferences.backupUrl);

  return {
    candidates: createServerRecoveryCandidates(primaryUrl, backupUrl, preferences.preferred),
    preferredRole: preferences.preferred,
  };
};

/**
 * Creates at most one candidate per configured primary/backup role.
 */
const createServerRecoveryCandidates = (
  primaryUrl: string,
  backupUrl: string,
  preferredRole: WorkspaceServerAddressPreferenceRole,
): PreferredServerCandidate[] => {
  if (primaryUrl && backupUrl && primaryUrl === backupUrl) {
    return [{ role: preferredRole, url: primaryUrl }];
  }

  return [
    primaryUrl ? { role: 'primary' as const, url: primaryUrl } : undefined,
    backupUrl ? { role: 'backup' as const, url: backupUrl } : undefined,
  ].filter(Boolean) as PreferredServerCandidate[];
};

/**
 * Limits automatic logout to confirmed session-expired or no-server-available recovery failures.
 */
const shouldClearSessionAfterRecoveryError = (error: unknown): boolean => {
  return error instanceof PreferredServerUnavailableError ||
    (error instanceof ApiRequestError && error.statusCode === 401);
};

const normalizeServerUrl = (serverUrl: string): string => {
  return serverUrl.trim().replace(/\/+$/, '');
};
