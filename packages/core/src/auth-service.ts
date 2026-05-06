import JSEncrypt from 'jsencrypt';

import type { ApiInfo, AuthTokens, CurrentUser } from './types';
import type { ApiClientOptions, ApiRequestOptions } from './api-client';
import { createApiClient } from './api-client';

export interface LoginParams {
  serverUrl: string;
  username: string;
  password: string;
  otp?: string;
  dev?: boolean;
}

interface RsaResponse {
  publicKey: string;
  ver?: number;
}

interface LoginResponse {
  username: string;
  id: number;
  uid?: string;
  isAdmin?: boolean;
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  auth_code?: string;
}

interface RefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  auth_code?: string;
}

interface AuthCodeResponse {
  auth_code: string;
}

interface EncryptedLoginPayload {
  username: string;
  password: string;
}

/**
 * Fetches public server information before login.
 * @param serverUrl MT Photos server URL.
 * @returns Server API information.
 */
export const fetchApiInfo = (serverUrl: string): Promise<ApiInfo> => {
  return publicRequest<ApiInfo>(serverUrl, '/api-info', {
    query: { type: 'all' },
  });
};

/**
 * Logs in with the service-provided RSA public key.
 * @param params Login form values.
 * @returns Authenticated user, tokens and server metadata.
 */
export const loginWithPassword = async (params: LoginParams): Promise<{
  apiInfo: ApiInfo;
  tokens: AuthTokens;
  user: CurrentUser;
}> => {
  const [apiInfo, rsa] = await Promise.all([fetchApiInfo(params.serverUrl), fetchLoginRsa(params.serverUrl)]);
  const encryptedLogin = createEncryptedLoginPayload({
    password: params.password,
    publicKey: rsa.publicKey,
    rsaVersion: rsa.ver,
    username: params.username,
  });
  const login = await publicRequest<LoginResponse>(params.serverUrl, '/auth/login', {
    method: 'POST',
    body: {
      ...encryptedLogin,
      otp: params.otp || undefined,
      dev: params.dev || undefined,
    },
  });

  return {
    apiInfo,
    tokens: mapLoginTokens(login),
    user: {
      id: login.id,
      uid: login.uid,
      username: login.username,
      isAdmin: Boolean(login.isAdmin),
    },
  };
};

/**
 * Refreshes the access token using MT Photos refresh_token.
 * @param serverUrl MT Photos server URL.
 * @param currentTokens Token pair from the current session.
 * @returns New token pair.
 */
export const refreshAuthTokens = async (serverUrl: string, currentTokens: AuthTokens): Promise<AuthTokens> => {
  const response = await publicRequest<RefreshResponse>(serverUrl, '/auth/refresh', {
    method: 'POST',
    body: {
      token: currentTokens.refreshToken,
      ver: 2,
    },
  });

  return mapRefreshTokens(response, currentTokens);
};

/**
 * Fetches a media auth_code for browser-loaded thumbnails and files.
 * @param serverUrl MT Photos server URL.
 * @param refreshToken Refresh token from the current session.
 * @returns Media authorization code.
 */
export const fetchMediaAuthCode = async (serverUrl: string, refreshToken: string): Promise<string> => {
  const response = await publicRequest<AuthCodeResponse>(serverUrl, '/auth/auth_code', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });

  return response.auth_code;
};

/**
 * Fetches the current authenticated user.
 * @param options API client options.
 * @returns Current user profile.
 */
export const fetchCurrentUser = (options: ApiClientOptions): Promise<CurrentUser> => {
  return createApiClient(options).request<CurrentUser>('/gateway/userInfo', {
    signal: createTimeoutSignal(2000),
  });
};

const fetchLoginRsa = async (serverUrl: string): Promise<RsaResponse> => {
  return publicRequest<RsaResponse>(serverUrl, '/auth/rsa', { method: 'POST' });
};

const publicRequest = async <TResponse>(
  serverUrl: string,
  path: string,
  init: ApiRequestOptions = {},
): Promise<TResponse> => {
  return createApiClient({ baseUrl: serverUrl }).request<TResponse>(path, {
    signal: createTimeoutSignal(2000),
    ...init,
    auth: false,
  });
};

const encryptPassword = (password: string, publicKey: string): string => {
  const encryptor = new JSEncrypt();

  encryptor.setPublicKey(publicKey);
  const encrypted = encryptor.encrypt(password);

  if (!encrypted) {
    throw new Error('密码加密失败，请检查服务端 RSA 公钥。');
  }

  return encrypted;
};

const createEncryptedLoginPayload = ({
  password,
  publicKey,
  rsaVersion,
  username,
}: {
  password: string;
  publicKey: string;
  rsaVersion?: number;
  username: string;
}): EncryptedLoginPayload => {
  const payload = JSON.stringify({ u: username, p: password });
  const encryptedPayload = encryptPassword(
    rsaVersion === 2 ? encodeURIComponent(payload) : payload,
    publicKey,
  );

  return {
    username: rsaVersion === 2 ? '__MT_RSA_ENC_V2' : '__MT_RSA_ENC',
    password: encryptedPayload,
  };
};

const mapLoginTokens = (response: LoginResponse): AuthTokens => {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
    authCode: response.auth_code,
  };
};

const mapRefreshTokens = (response: RefreshResponse, currentTokens: AuthTokens): AuthTokens => {
  return {
    accessToken: response.access_token ?? currentTokens.accessToken,
    refreshToken: response.refresh_token ?? currentTokens.refreshToken,
    expiresIn: response.expires_in ?? currentTokens.expiresIn,
    authCode: response.auth_code ?? currentTokens.authCode,
  };
};

const createTimeoutSignal = (timeoutMs: number): AbortSignal | undefined => {
  const abortSignal = globalThis.AbortSignal as typeof AbortSignal & {
    timeout?: (ms: number) => AbortSignal;
  };

  return abortSignal.timeout?.(timeoutMs);
};
