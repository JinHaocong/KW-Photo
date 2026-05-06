import { ApiRequestError, createApiClient } from './api-client';
import type { ApiClientOptions, ApiErrorPayload } from './api-client';

export interface DownloadableFile {
  id: number;
  md5: string;
  name: string;
}

export interface BatchDownloadResult {
  downloadedCount: number;
  mode: 'files' | 'zip';
}

export interface FileDetail {
  dateLabel?: string;
  deviceName?: string;
  duration?: number;
  fileType?: string;
  height?: number;
  location?: string;
  md5?: string;
  name?: string;
  sizeLabel?: string;
  width?: number;
}

export interface VideoTranscodeResult {
  code?: string | null;
  n?: number;
  transcodeStatus?: number | null;
}

export interface RefreshFileThumbsResult {
  code?: string | null;
  msg?: string;
  n?: number;
}

export interface RefreshFileDescriptorResult {
  code?: string | null;
  msg?: string;
  n?: number;
}

interface FileInfoResponse {
  MD5?: string;
  addr?: string;
  address?: string;
  city?: string;
  country?: string;
  date?: number | string;
  deviceName?: string;
  duration?: number | string;
  fileName?: string;
  fileSize?: number | string;
  fileType?: string;
  height?: number | string;
  md5?: string;
  mtime?: number | string;
  name?: string;
  province?: string;
  size?: number | string;
  tokenAt?: number | string;
  type?: string;
  width?: number | string;
}

interface BatchDownloadFileResponse {
  MD5?: string;
  fileName?: string;
  id?: number;
  md5?: string;
  name?: string;
}

interface BatchDownloadInfoResponse {
  downloadKey?: string;
  list?: BatchDownloadFileResponse[];
}

type BatchDownloadPayload = BatchDownloadFileResponse[] | BatchDownloadInfoResponse;

/**
 * Fetches file detail information for the preview side panel.
 * @param options Authenticated API client options plus file identity.
 * @returns Normalized file detail fields.
 */
export const fetchFileInfo = async (options: ApiClientOptions & { file: DownloadableFile }): Promise<FileDetail> => {
  const client = createApiClient(options);

  if (!options.file.md5) {
    const detail = await client.request<FileInfoResponse>(`/gateway/fileInfoById/${options.file.id}`);
    return mapFileDetail(detail);
  }

  try {
    const detail = await client.request<FileInfoResponse>(
      `/gateway/fileInfo/${options.file.id}/${encodeURIComponent(options.file.md5)}`,
    );

    return mapFileDetail(detail);
  } catch (error) {
    const detail = await client.request<FileInfoResponse>(`/gateway/fileInfoById/${options.file.id}`);

    return mapFileDetail(detail);
  }
};

/**
 * Downloads the original file with authenticated gateway headers.
 * @param options Authenticated API client options plus file identity.
 */
export const downloadOriginalFile = async (options: ApiClientOptions & { file: DownloadableFile }): Promise<void> => {
  const response = await fetchDownloadResponse(options, false);

  if (!response.ok) {
    throw new ApiRequestError(response.status, await readDownloadError(response));
  }

  const blob = await response.blob();
  const filename = getFilenameFromDisposition(response.headers.get('content-disposition')) ?? options.file.name;

  triggerBrowserDownload(blob, filename || 'download');
  reportDownloadStat(options);
};

/**
 * Starts the server-side video transcode task used by built-in preview fallback.
 * @param options Authenticated API options and the target file id.
 * @returns Backend transcode task status.
 */
export const triggerVideoTranscode = async (
  options: ApiClientOptions & { fileId: number },
): Promise<VideoTranscodeResult> => {
  return createApiClient(options).request<VideoTranscodeResult>('/gateway/transcode', {
    body: {
      fileIds: [options.fileId],
      type: 'file',
    },
    method: 'POST',
  });
};

/**
 * Refreshes server thumbnails for one file.
 * @param options Authenticated API options and target file id.
 * @param videoSec Optional video frame second for poster regeneration.
 * @returns Backend refresh result.
 */
export const refreshFileThumbs = (
  options: ApiClientOptions & { fileId: number },
  videoSec?: number,
): Promise<RefreshFileThumbsResult> => {
  return createApiClient(options).request<RefreshFileThumbsResult>(
    `/gateway/refreshFileThumbs/${options.fileId}`,
    videoSec === undefined ? undefined : { query: { videoSec } },
  );
};

/**
 * Refreshes face descriptors for one file using the official preview utility.
 * @param options Authenticated API options and target file id.
 * @returns Backend refresh result.
 */
export const refreshFileDescriptor = (
  options: ApiClientOptions & { fileId: number },
): Promise<RefreshFileDescriptorResult> => {
  return createApiClient(options).request<RefreshFileDescriptorResult>('/gateway/refreshFileDescriptor', {
    method: 'POST',
    body: {
      id: options.fileId,
    },
  });
};

/**
 * Refreshes EXIF-backed file metadata and returns normalized detail fields.
 * @param options Authenticated API options and target file identity.
 * @returns Refreshed file detail fields.
 */
export const refreshFileInfo = async (options: ApiClientOptions & { file: DownloadableFile }): Promise<FileDetail> => {
  const detail = await createApiClient(options).request<FileInfoResponse>(`/gateway/fileInfoRT/${options.file.id}`);

  return mapFileDetail(detail);
};

/**
 * Creates a server-side batch download package and downloads it.
 * Falls back to individual downloads when the server returns a direct file list.
 * @param options Authenticated API client options plus selected files.
 * @returns Download mode and downloaded count.
 */
export const downloadBatchFiles = async (options: ApiClientOptions & { files: DownloadableFile[] }): Promise<BatchDownloadResult> => {
  const files = options.files.filter((file) => file.id > 0);

  if (files.length === 0) {
    return { downloadedCount: 0, mode: 'files' };
  }

  const payload = await createApiClient(options).request<BatchDownloadPayload>('/gateway/filesInfo', {
    method: 'POST',
    body: {
      ids: files.map((file) => file.id),
      type: 'batchDownload',
    },
  });
  const normalizedPayload = normalizeBatchDownloadPayload(payload);

  if (normalizedPayload.downloadKey) {
    await downloadZipFile(options, normalizedPayload.downloadKey);
    return { downloadedCount: files.length, mode: 'zip' };
  }

  const fallbackFiles = normalizedPayload.list.length > 0
    ? normalizedPayload.list.map((file) => mapBatchDownloadFile(file, files)).filter(isDownloadableFile)
    : files;

  for (const file of fallbackFiles) {
    await downloadOriginalFile({ ...options, file });
  }

  return { downloadedCount: fallbackFiles.length, mode: 'files' };
};

const fetchDownloadResponse = async (options: ApiClientOptions & { file: DownloadableFile }, retried: boolean): Promise<Response> => {
  const response = await fetch(buildFileDownloadUrl(options.baseUrl, options.file), {
    credentials: 'same-origin',
    headers: createDownloadHeaders(options),
  });

  if (response.status === 401 && !retried && options.onUnauthorized) {
    const nextToken = await options.onUnauthorized();

    if (nextToken) {
      return fetchDownloadResponse(options, true);
    }
  }

  return response;
};

const buildFileDownloadUrl = (baseUrl: string, file: DownloadableFile): string => {
  return `${normalizeBaseUrl(baseUrl)}/gateway/fileDownload/${file.id}/${encodeURIComponent(file.md5)}`;
};

const downloadZipFile = async (options: ApiClientOptions, downloadKey: string): Promise<void> => {
  const response = await fetchZipResponse(options, downloadKey, false);

  if (!response.ok) {
    throw new ApiRequestError(response.status, await readDownloadError(response));
  }

  triggerBrowserDownload(await response.blob(), `mt_photos_${formatDownloadTimestamp(new Date())}.zip`);
};

const fetchZipResponse = async (options: ApiClientOptions, downloadKey: string, retried: boolean): Promise<Response> => {
  const response = await fetch(`${normalizeBaseUrl(options.baseUrl)}/gateway/fileZIP/${encodeURIComponent(downloadKey)}`, {
    credentials: 'same-origin',
    headers: createDownloadHeaders(options),
  });

  if (response.status === 401 && !retried && options.onUnauthorized) {
    const nextToken = await options.onUnauthorized();

    if (nextToken) {
      return fetchZipResponse(options, downloadKey, true);
    }
  }

  return response;
};

const createDownloadHeaders = (options: ApiClientOptions): HeadersInit => {
  const headers = new Headers();
  const token = options.getAccessToken?.();

  if (token) {
    headers.set('jwt', token);
  }

  return headers;
};

const readDownloadError = async (response: Response): Promise<ApiErrorPayload | undefined> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return { message: response.statusText, statusCode: response.status };
  }
};

const getFilenameFromDisposition = (disposition: string | null): string | undefined => {
  if (!disposition) {
    return undefined;
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);

  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const fallbackMatch = /filename="?([^";]+)"?/i.exec(disposition);

  return fallbackMatch?.[1];
};

const triggerBrowserDownload = (blob: Blob, filename: string): void => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 0);
};

const reportDownloadStat = (options: ApiClientOptions & { file: DownloadableFile }): void => {
  void createApiClient(options)
    .request(`/gateway/fileDownloadStat/${options.file.id}/${encodeURIComponent(options.file.md5)}`, {
      method: 'POST',
    })
    .catch(() => undefined);
};

const normalizeBatchDownloadPayload = (payload: BatchDownloadPayload): Required<BatchDownloadInfoResponse> => {
  if (Array.isArray(payload)) {
    return {
      downloadKey: '',
      list: payload,
    };
  }

  return {
    downloadKey: payload.downloadKey ?? '',
    list: payload.list ?? [],
  };
};

const mapBatchDownloadFile = (file: BatchDownloadFileResponse, fallbackFiles: DownloadableFile[]): DownloadableFile | undefined => {
  const id = file.id ?? 0;
  const fallback = fallbackFiles.find((item) => item.id === id);
  const md5 = file.MD5 ?? file.md5 ?? fallback?.md5 ?? '';

  if (!id || !md5) {
    return undefined;
  }

  return {
    id,
    md5,
    name: file.fileName ?? file.name ?? fallback?.name ?? md5,
  };
};

const isDownloadableFile = (file: DownloadableFile | undefined): file is DownloadableFile => {
  return Boolean(file);
};

const formatDownloadTimestamp = (date: Date): string => {
  const value = (part: number) => String(part).padStart(2, '0');

  return [
    date.getFullYear(),
    value(date.getMonth() + 1),
    value(date.getDate()),
    '_',
    value(date.getHours()),
    value(date.getMinutes()),
    value(date.getSeconds()),
  ].join('');
};

const mapFileDetail = (response: FileInfoResponse): FileDetail => {
  const size = readOptionalNumber(response.fileSize, response.size);
  const width = readOptionalNumber(response.width);
  const height = readOptionalNumber(response.height);
  const duration = readOptionalNumber(response.duration);

  return {
    dateLabel: formatDateLabel(response.tokenAt ?? response.date ?? response.mtime),
    deviceName: response.deviceName,
    duration,
    fileType: normalizeFileType(response.fileType ?? response.type),
    height,
    location: formatLocation(response),
    md5: response.MD5 ?? response.md5,
    name: response.fileName ?? response.name,
    sizeLabel: size === undefined ? undefined : formatFileSize(size),
    width,
  };
};

const formatLocation = (response: FileInfoResponse): string | undefined => {
  const parts = [response.country, response.province, response.city, response.addr ?? response.address]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? Array.from(new Set(parts)).join(' · ') : undefined;
};

const normalizeFileType = (fileType?: string): string | undefined => {
  return fileType?.toUpperCase?.();
};

const formatDateLabel = (value?: number | string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFileSize = (size: number): string => {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const readOptionalNumber = (...values: Array<number | string | undefined | null>): number | undefined => {
  for (const value of values) {
    const numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};
