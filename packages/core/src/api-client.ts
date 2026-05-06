export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | undefined;
  onUnauthorized?: () => Promise<string | undefined>;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: BodyInit | Record<string, unknown> | null;
  query?: Record<string, string | number | boolean | undefined>;
}

export interface ApiErrorPayload {
  msg?: string;
  message?: string;
  statusCode?: number;
  code?: string | number;
  serverTime?: number;
}

/**
 * Error wrapper that keeps HTTP status and backend payload together.
 */
export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly payload?: ApiErrorPayload;

  constructor(statusCode: number, payload?: ApiErrorPayload) {
    super(payload?.msg ?? payload?.message ?? `Request failed: ${statusCode}`);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

/**
 * Creates a typed MT Photos API client with jwt auth and refresh retry support.
 * @param options Client configuration.
 * @returns Request helper scoped to the configured server.
 */
export const createApiClient = (options: ApiClientOptions) => {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  /**
   * Executes a request and retries once after a successful token refresh.
   * @param path API path starting with slash.
   * @param init Request configuration.
   * @returns Parsed response body.
   */
  const request = async <TResponse>(path: string, init: ApiRequestOptions = {}): Promise<TResponse> => {
    return executeRequest<TResponse>(baseUrl, path, init, options, false);
  };

  return { request };
};

/**
 * Extracts a readable message from unknown request errors.
 * @param error Unknown thrown value.
 * @returns User-facing error message.
 */
export const getApiErrorMessage = (error: unknown): string => {
  if (error instanceof ApiRequestError && error.payload?.code === 'INVALID_2FA_TOKEN') {
    return '需要输入两步验证码。请填写验证码后再次登录。';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '请求失败，请稍后重试。';
};

const executeRequest = async <TResponse>(
  baseUrl: string,
  path: string,
  init: ApiRequestOptions,
  options: ApiClientOptions,
  retried: boolean,
): Promise<TResponse> => {
  const response = await fetch(buildUrl(baseUrl, path, init.query), {
    ...init,
    body: normalizeBody(init.body),
    credentials: init.credentials ?? 'same-origin',
    headers: createHeaders(init, options),
  });

  if (response.status === 401 && init.auth !== false && !retried && options.onUnauthorized) {
    const nextToken = await options.onUnauthorized();

    if (nextToken) {
      return executeRequest<TResponse>(baseUrl, path, init, options, true);
    }
  }

  if (!response.ok) {
    throw new ApiRequestError(response.status, await readErrorPayload(response));
  }

  const payload = await readResponse<TResponse>(response);

  if (isApiErrorPayload(payload)) {
    throw new ApiRequestError(response.status, payload);
  }

  return payload;
};

const createHeaders = (init: ApiRequestOptions, options: ApiClientOptions): HeadersInit => {
  const body = init.body;
  const token = init.auth === false ? undefined : options.getAccessToken?.();
  const headers = new Headers(init.headers);

  if (body && shouldUseJson(body) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    // MT Photos Web uses the jwt header for authenticated gateway requests.
    headers.set('jwt', token);
  }

  return headers;
};

const normalizeBody = (body: ApiRequestOptions['body']): BodyInit | null | undefined => {
  if (!body || !shouldUseJson(body)) {
    return body as BodyInit | null | undefined;
  }

  return JSON.stringify(body);
};

const shouldUseJson = (body: ApiRequestOptions['body']): body is Record<string, unknown> => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const isBlob = typeof Blob !== 'undefined' && body instanceof Blob;

  return typeof body === 'object' && !isFormData && !isBlob;
};

const readResponse = async <TResponse>(response: Response): Promise<TResponse> => {
  if (response.status === 204) {
    return undefined as TResponse;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    return response.text() as Promise<TResponse>;
  }

  return response.json() as Promise<TResponse>;
};

const readErrorPayload = async (response: Response): Promise<ApiErrorPayload | undefined> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return { message: response.statusText, statusCode: response.status };
  }
};

const isApiErrorPayload = (payload: unknown): payload is ApiErrorPayload => {
  return Boolean(
    payload &&
      typeof payload === 'object' &&
      'code' in payload &&
      (payload as ApiErrorPayload).code,
  );
};

const buildUrl = (baseUrl: string, path: string, query?: ApiRequestOptions['query']): string => {
  const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};
