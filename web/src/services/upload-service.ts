import { ApiRequestError, createApiClient } from './api-client';
import type { ApiClientOptions, ApiErrorPayload } from './api-client';
import type { UploadTarget } from '../shared/types';

const LARGE_FILE_THRESHOLD = 200 * 1024 * 1024;
const CHUNK_SIZE = 10 * 1024 * 1024;
const NO_SUB_FOLDER = '__NO_SUB_FOLDER__';
const DEV_UPLOAD_PROXY_PATH = '/__kwphoto_mt_proxy';

export interface UploadProgressEvent {
  progress: number;
  status: string;
}

export interface UploadFileResult {
  fileId?: number;
  skipped?: boolean;
  target?: UploadTarget;
}

interface CheckPathForUploadResponse {
  abort?: boolean;
  code?: string | number;
  id?: number;
  message?: string;
  msg?: string;
}

interface UploadResponse {
  abort?: boolean;
  code?: string | number;
  id?: number;
  msg?: string;
  message?: string;
}

interface UploadChunkCheckResponse extends UploadResponse {
  existParts?: string[];
  fileExist?: boolean;
  fileNameForSave?: string;
  galleryId?: number;
}

interface BackupUploadTargetResponse extends UploadResponse {
  id?: number;
  path?: string;
}

interface MergeStatusResponse extends UploadResponse {
  type?: 'done' | 'fail' | string;
}

/**
 * Uploads one file to an MT Photos folder using the same gateway contract as the web client.
 * @param options Authenticated API client options.
 * @param params File, target folder and progress callback.
 * @returns Uploaded file id, or skipped marker when the server reports duplicate content.
 */
export const uploadFileToFolder = async (options: ApiClientOptions, params: {
    file: File;
    onProgress: (event: UploadProgressEvent) => void;
    target?: UploadTarget;
  }): Promise<UploadFileResult> => {
  const { file, onProgress, target } = params;
  const uploadTarget = await resolveUploadTarget(options, target);
  const extra = createUploadExtra(uploadTarget);
  const md5 = await computeUploadMd5(file, onProgress);

  onProgress({ progress: 2, status: '检查重复' });

  const checkResult = await checkPathForUpload(options, {
    ctime: file.lastModified,
    fileName: file.name,
    md5,
    size: file.size,
    ...extra,
  });

  if (checkResult.id) {
    onProgress({ progress: 100, status: '已存在，跳过' });
    return { fileId: checkResult.id, skipped: true, target: uploadTarget };
  }

  ensureSuccessResponse(checkResult);

  if (file.size > LARGE_FILE_THRESHOLD) {
    return uploadChunkedFile(options, {
      extra,
      file,
      md5,
      onProgress,
      target: uploadTarget,
    });
  }

  return uploadSmallFile(options, {
    extra,
    file,
    md5,
    onProgress,
    target: uploadTarget,
  });
};

/**
 * Triggers server-side scanning after an upload batch finishes.
 * @param options Authenticated API client options.
 * @param target Upload target folder.
 */
export const scanAfterUpload = (options: ApiClientOptions, target?: UploadTarget): Promise<unknown> => {
  return createApiClient(options).request('/gateway/scanAfterUpload', {
    method: 'POST',
    body: {
      folderId: target?.folderId,
    },
  });
};

/**
 * Resolves the default MT Photos backup folder before uploading without an explicit target.
 * @param options Authenticated API client options.
 * @param target Optional folder chosen by the user.
 * @returns Upload target with a concrete folder id when the server provides one.
 */
export const resolveUploadTarget = async (options: ApiClientOptions, target?: UploadTarget): Promise<UploadTarget | undefined> => {
  if (target?.folderId) {
    return target;
  }

  const response = await createApiClient(options).request<BackupUploadTargetResponse>('/gateway/enableFileBackup', {
    method: 'POST',
  });

  ensureSuccessResponse(response);

  if (!response.id) {
    throw new Error('未获取到默认上传目录。');
  }

  const path = response.path || target?.path || target?.name || '默认上传目录';

  return {
    folderId: response.id,
    name: target?.name ?? path,
    path,
  };
};

const checkPathForUpload = (options: ApiClientOptions, payload: Record<string, unknown>): Promise<CheckPathForUploadResponse> => {
  return createApiClient(options).request<CheckPathForUploadResponse>('/gateway/checkPathForUpload', {
    method: 'POST',
    body: {
      deviceName: 'web',
      trigger_thumb_task: 'on',
      ...payload,
    },
  });
};

const uploadSmallFile = async (options: ApiClientOptions, params: {
    extra: UploadExtra;
    file: File;
    md5: string;
    onProgress: (event: UploadProgressEvent) => void;
    target?: UploadTarget;
  }): Promise<UploadFileResult> => {
  const { extra, file, onProgress, target } = params;
  const formData = new FormData();

  formData.append('file', file);
  onProgress({ progress: 8, status: '上传中' });

  const result = await xhrUpload<UploadResponse>(
    options,
    '/gateway/upload',
    {
      body: formData,
      headers: createUploadHeaders(options, file, extra),
      onUploadComplete: () => onProgress({ progress: 94, status: '服务端处理中' }),
      onProgress: (progress) => onProgress({ progress: scaleProgress(progress, 8, 94), status: '上传中' }),
    },
    false,
  );

  ensureSuccessResponse(result);
  onProgress({ progress: 96, status: '等待扫描' });

  return { fileId: result.id, target };
};

const uploadChunkedFile = async (options: ApiClientOptions, params: {
    extra: UploadExtra;
    file: File;
    md5: string;
    onProgress: (event: UploadProgressEvent) => void;
    target?: UploadTarget;
  }): Promise<UploadFileResult> => {
  const { extra, file, md5, onProgress, target } = params;
  const uploadKey = createUploadKey(file);

  onProgress({ progress: 8, status: '准备分块' });

  const checkResult = await createApiClient(options).request<UploadChunkCheckResponse>('/gateway/uploadChunk/check', {
    method: 'POST',
    body: {
      MD5: md5,
      chunkSize: CHUNK_SIZE,
      ctime: file.lastModified,
      deviceName: 'web',
      fileName: file.name,
      size: file.size,
      uploadKey,
      ...extra,
    },
  });

  if (checkResult.id) {
    onProgress({ progress: 100, status: '已存在，跳过' });
    return { fileId: checkResult.id, skipped: true, target };
  }

  ensureSuccessResponse(checkResult);

  const chunkCount = Math.ceil(file.size / CHUNK_SIZE);
  const existingParts = new Set(checkResult.existParts ?? []);

  for (let index = 0; index < chunkCount; index += 1) {
    if (existingParts.has(`part_${index}`)) {
      onProgress({ progress: scaleProgress((index + 1) / chunkCount, 10, 82), status: '上传分块' });
      continue;
    }

    await uploadChunk(options, {
      chunk: file.slice(index * CHUNK_SIZE, Math.min(file.size, (index + 1) * CHUNK_SIZE)),
      index,
      uploadKey,
    });
    onProgress({ progress: scaleProgress((index + 1) / chunkCount, 10, 82), status: '上传分块' });
  }

  onProgress({ progress: 88, status: '合并文件' });

  let mergeResult: UploadResponse;

  try {
    mergeResult = await createApiClient(options).request<UploadResponse>('/gateway/uploadChunk/merge', {
      method: 'POST',
      body: {
        MD5: md5,
        chunkCount,
        chunkSize: CHUNK_SIZE,
        duration: 0,
        fileNameForSave: checkResult.fileNameForSave,
        fileSize: file.size,
        galleryId: checkResult.galleryId,
        uploadKey,
      },
    });
  } catch {
    mergeResult = await waitForMergeStatus(options, {
      md5,
      uploadKey,
    });
  }

  if (!mergeResult.id && !mergeResult.msg && !mergeResult.code) {
    mergeResult = await waitForMergeStatus(options, {
      md5,
      uploadKey,
    });
  }

  ensureSuccessResponse(mergeResult);
  onProgress({ progress: 96, status: '等待扫描' });

  return { fileId: mergeResult.id, target };
};

const uploadChunk = async (options: ApiClientOptions, params: {
    chunk: Blob;
    index: number;
    uploadKey: string;
  }): Promise<void> => {
  const body = await readBlobAsDataUrl(params.chunk);
  const response = await rawJsonRequest<UploadResponse>(
    options,
    '/gateway/uploadChunk/uploadWeb',
    {
      body,
      headers: {
        'Content-Type': 'application/octet-stream',
        mtextra: encodeURIComponent(
          JSON.stringify({
            i: params.index,
            md5: '',
            uploadKey: params.uploadKey,
          }),
        ),
      },
      method: 'POST',
    },
    false,
  );

  ensureSuccessResponse(response);
};

const waitForMergeStatus = async (options: ApiClientOptions, params: {
    md5: string;
    uploadKey: string;
  }): Promise<UploadResponse> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 300_000) {
    const status = await createApiClient(options).request<MergeStatusResponse>('/gateway/uploadChunk/mergeStatus', {
      method: 'POST',
      body: {
        MD5: params.md5,
        uploadKey: params.uploadKey,
      },
    });

    if (status.type === 'done') {
      return { id: status.id };
    }

    if (status.type === 'fail') {
      return { msg: status.msg || '合并文件失败。' };
    }

    await sleep(2_000);
  }

  return { msg: '合并文件超时，请稍后重试。' };
};

const rawJsonRequest = async <TResponse>(options: ApiClientOptions, path: string, init: RequestInit, retried: boolean): Promise<TResponse> => {
  const response = await fetch(buildUploadRequestUrl(options.baseUrl, path), {
    ...init,
    credentials: init.credentials ?? 'same-origin',
    headers: createRawHeaders(options, init.headers),
  });

  if (response.status === 401 && !retried && options.onUnauthorized) {
    const nextToken = await options.onUnauthorized();

    if (nextToken) {
      return rawJsonRequest<TResponse>(options, path, init, true);
    }
  }

  const payload = await readJsonPayload<TResponse>(response);

  if (!response.ok) {
    throw new ApiRequestError(response.status, payload as ApiErrorPayload);
  }

  return payload;
};

const xhrUpload = <TResponse>(options: ApiClientOptions, path: string, params: {
    body: XMLHttpRequestBodyInit;
    headers: HeadersInit;
    onUploadComplete?: () => void;
    onProgress: (progress: number) => void;
  }, retried: boolean): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', buildUploadRequestUrl(options.baseUrl, path));
    xhr.withCredentials = true;
    createRawHeaders(options, params.headers).forEach((value, key) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        params.onProgress(event.loaded / event.total);
      }
    };
    xhr.upload.onload = () => params.onUploadComplete?.();
    xhr.onerror = () => reject(new Error('上传请求失败，请检查网络。'));
    xhr.onload = async () => {
      const payload = parseJsonText<TResponse>(xhr.responseText);

      if (xhr.status === 401 && !retried && options.onUnauthorized) {
        try {
          const nextToken = await options.onUnauthorized();

          if (nextToken) {
            resolve(xhrUpload<TResponse>(options, path, params, true));
            return;
          }
        } catch (error) {
          reject(error);
          return;
        }
      }

      if (xhr.status >= 300) {
        reject(new ApiRequestError(xhr.status, payload as ApiErrorPayload));
        return;
      }

      resolve(payload);
    };

    xhr.send(params.body);
  });
};

/**
 * Mirrors MT Photos Web by calculating small-file MD5 before duplicate checks.
 */
const computeUploadMd5 = async (file: File, onProgress: (event: UploadProgressEvent) => void): Promise<string> => {
  if (file.size <= 0 || file.size > LARGE_FILE_THRESHOLD) {
    return '';
  }

  onProgress({ progress: 1, status: '计算指纹' });

  try {
    return createMd5Hex(await file.arrayBuffer());
  } catch {
    return '';
  }
};

interface UploadExtra {
  dist_id?: number;
  duplicate: number;
  source_folder_path: string;
  trigger_thumb_task: 'on';
}

const createUploadExtra = (target?: UploadTarget): UploadExtra => {
  return {
    dist_id: target?.folderId,
    duplicate: 1,
    source_folder_path: NO_SUB_FOLDER,
    trigger_thumb_task: 'on',
  };
};

const createUploadHeaders = (options: ApiClientOptions, file: File, extra: UploadExtra): HeadersInit => {
  const headers = new Headers();
  const token = options.getAccessToken?.();

  if (token) {
    headers.set('jwt', token);
  }

  headers.set('filename', encodeURIComponent(file.name));
  headers.set('ctime', String(file.lastModified));
  headers.set('devicename', 'web');
  headers.set('mtextra', encodeURIComponent(JSON.stringify(extra)));

  return headers;
};

const createRawHeaders = (options: ApiClientOptions, rawHeaders?: HeadersInit): Headers => {
  const headers = new Headers(rawHeaders);
  const token = options.getAccessToken?.();

  if (token) {
    headers.set('jwt', token);
  }

  return headers;
};

const readJsonPayload = async <TResponse>(response: Response): Promise<TResponse> => {
  try {
    return (await response.json()) as TResponse;
  } catch {
    return { message: response.statusText, statusCode: response.status } as TResponse;
  }
};

const parseJsonText = <TResponse>(text: string): TResponse => {
  if (!text) {
    return undefined as TResponse;
  }

  try {
    return JSON.parse(text) as TResponse;
  } catch {
    return { message: text } as TResponse;
  }
};

const ensureSuccessResponse = (response: UploadResponse | CheckPathForUploadResponse): void => {
  if (response.abort || response.code || response.msg || response.message) {
    throw new Error(response.msg || response.message || '上传失败。');
  }
};

const createUploadKey = (file: File): string => {
  return `${file.name}_${file.size}`.replace(/[.\/*?:"<>|=+\[\]{};,]/gim, '_');
};

const readBlobAsDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error('读取分块失败。'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
};

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
};

const createMd5Hex = (buffer: ArrayBuffer): string => {
  const words = createMd5Words(new Uint8Array(buffer));
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let index = 0; index < words.length; index += 16) {
    const oldA = a;
    const oldB = b;
    const oldC = c;
    const oldD = d;

    a = ff(a, b, c, d, words[index + 0], 7, -680876936);
    d = ff(d, a, b, c, words[index + 1], 12, -389564586);
    c = ff(c, d, a, b, words[index + 2], 17, 606105819);
    b = ff(b, c, d, a, words[index + 3], 22, -1044525330);
    a = ff(a, b, c, d, words[index + 4], 7, -176418897);
    d = ff(d, a, b, c, words[index + 5], 12, 1200080426);
    c = ff(c, d, a, b, words[index + 6], 17, -1473231341);
    b = ff(b, c, d, a, words[index + 7], 22, -45705983);
    a = ff(a, b, c, d, words[index + 8], 7, 1770035416);
    d = ff(d, a, b, c, words[index + 9], 12, -1958414417);
    c = ff(c, d, a, b, words[index + 10], 17, -42063);
    b = ff(b, c, d, a, words[index + 11], 22, -1990404162);
    a = ff(a, b, c, d, words[index + 12], 7, 1804603682);
    d = ff(d, a, b, c, words[index + 13], 12, -40341101);
    c = ff(c, d, a, b, words[index + 14], 17, -1502002290);
    b = ff(b, c, d, a, words[index + 15], 22, 1236535329);

    a = gg(a, b, c, d, words[index + 1], 5, -165796510);
    d = gg(d, a, b, c, words[index + 6], 9, -1069501632);
    c = gg(c, d, a, b, words[index + 11], 14, 643717713);
    b = gg(b, c, d, a, words[index + 0], 20, -373897302);
    a = gg(a, b, c, d, words[index + 5], 5, -701558691);
    d = gg(d, a, b, c, words[index + 10], 9, 38016083);
    c = gg(c, d, a, b, words[index + 15], 14, -660478335);
    b = gg(b, c, d, a, words[index + 4], 20, -405537848);
    a = gg(a, b, c, d, words[index + 9], 5, 568446438);
    d = gg(d, a, b, c, words[index + 14], 9, -1019803690);
    c = gg(c, d, a, b, words[index + 3], 14, -187363961);
    b = gg(b, c, d, a, words[index + 8], 20, 1163531501);
    a = gg(a, b, c, d, words[index + 13], 5, -1444681467);
    d = gg(d, a, b, c, words[index + 2], 9, -51403784);
    c = gg(c, d, a, b, words[index + 7], 14, 1735328473);
    b = gg(b, c, d, a, words[index + 12], 20, -1926607734);

    a = hh(a, b, c, d, words[index + 5], 4, -378558);
    d = hh(d, a, b, c, words[index + 8], 11, -2022574463);
    c = hh(c, d, a, b, words[index + 11], 16, 1839030562);
    b = hh(b, c, d, a, words[index + 14], 23, -35309556);
    a = hh(a, b, c, d, words[index + 1], 4, -1530992060);
    d = hh(d, a, b, c, words[index + 4], 11, 1272893353);
    c = hh(c, d, a, b, words[index + 7], 16, -155497632);
    b = hh(b, c, d, a, words[index + 10], 23, -1094730640);
    a = hh(a, b, c, d, words[index + 13], 4, 681279174);
    d = hh(d, a, b, c, words[index + 0], 11, -358537222);
    c = hh(c, d, a, b, words[index + 3], 16, -722521979);
    b = hh(b, c, d, a, words[index + 6], 23, 76029189);
    a = hh(a, b, c, d, words[index + 9], 4, -640364487);
    d = hh(d, a, b, c, words[index + 12], 11, -421815835);
    c = hh(c, d, a, b, words[index + 15], 16, 530742520);
    b = hh(b, c, d, a, words[index + 2], 23, -995338651);

    a = ii(a, b, c, d, words[index + 0], 6, -198630844);
    d = ii(d, a, b, c, words[index + 7], 10, 1126891415);
    c = ii(c, d, a, b, words[index + 14], 15, -1416354905);
    b = ii(b, c, d, a, words[index + 5], 21, -57434055);
    a = ii(a, b, c, d, words[index + 12], 6, 1700485571);
    d = ii(d, a, b, c, words[index + 3], 10, -1894986606);
    c = ii(c, d, a, b, words[index + 10], 15, -1051523);
    b = ii(b, c, d, a, words[index + 1], 21, -2054922799);
    a = ii(a, b, c, d, words[index + 8], 6, 1873313359);
    d = ii(d, a, b, c, words[index + 15], 10, -30611744);
    c = ii(c, d, a, b, words[index + 6], 15, -1560198380);
    b = ii(b, c, d, a, words[index + 13], 21, 1309151649);
    a = ii(a, b, c, d, words[index + 4], 6, -145523070);
    d = ii(d, a, b, c, words[index + 11], 10, -1120210379);
    c = ii(c, d, a, b, words[index + 2], 15, 718787259);
    b = ii(b, c, d, a, words[index + 9], 21, -343485551);

    a = add32(a, oldA);
    b = add32(b, oldB);
    c = add32(c, oldC);
    d = add32(d, oldD);
  }

  return `${wordToHex(a)}${wordToHex(b)}${wordToHex(c)}${wordToHex(d)}`;
};

const createMd5Words = (bytes: Uint8Array): number[] => {
  const bitLength = bytes.length * 8;
  const words = new Array<number>(((((bytes.length + 8) >>> 6) + 1) * 16)).fill(0);

  bytes.forEach((byte, index) => {
    words[index >> 2] |= byte << ((index % 4) * 8);
  });
  words[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  words[words.length - 2] = bitLength & 0xffffffff;
  words[words.length - 1] = Math.floor(bitLength / 0x100000000);

  return words;
};

const ff = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number => {
  return cmn((b & c) | (~b & d), a, b, x, s, t);
};

const gg = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number => {
  return cmn((b & d) | (c & ~d), a, b, x, s, t);
};

const hh = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number => {
  return cmn(b ^ c ^ d, a, b, x, s, t);
};

const ii = (a: number, b: number, c: number, d: number, x: number, s: number, t: number): number => {
  return cmn(c ^ (b | ~d), a, b, x, s, t);
};

const cmn = (q: number, a: number, b: number, x: number, s: number, t: number): number => {
  return add32(rotateLeft(add32(add32(a, q), add32(x, t)), s), b);
};

const rotateLeft = (value: number, shift: number): number => {
  return (value << shift) | (value >>> (32 - shift));
};

const add32 = (left: number, right: number): number => {
  return (left + right) >>> 0;
};

const wordToHex = (word: number): string => {
  let output = '';

  for (let index = 0; index < 4; index += 1) {
    output += ((word >>> (index * 8)) & 0xff).toString(16).padStart(2, '0');
  }

  return output;
};

/**
 * Builds an upload URL and routes local cross-origin uploads through the Vite proxy.
 */
const buildUploadRequestUrl = (baseUrl: string, path: string): string => {
  const targetUrl = `${normalizeBaseUrl(baseUrl)}${path}`;

  if (!shouldUseDevUploadProxy(targetUrl)) {
    return targetUrl;
  }

  return `${DEV_UPLOAD_PROXY_PATH}?target=${encodeURIComponent(targetUrl)}`;
};

/**
 * Detects whether the current browser request should avoid local-dev CORS.
 */
const shouldUseDevUploadProxy = (targetUrl: string): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  const targetOrigin = new URL(targetUrl).origin;
  const currentHostname = window.location.hostname;

  return targetOrigin !== window.location.origin && isLocalDevHost(currentHostname);
};

/**
 * Checks local hosts that are served by Vite during Web and desktop development.
 */
const isLocalDevHost = (hostname: string): boolean => {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
};

const scaleProgress = (progress: number, from: number, to: number): number => {
  return Math.max(from, Math.min(to, Math.round(from + (to - from) * progress)));
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};
