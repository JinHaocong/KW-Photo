import type { ApiClientOptions } from './api-client';
import { createApiClient } from './api-client';

export interface DownloadableFile {
  id: number;
  md5: string;
  name: string;
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
  n?: number;
}

export interface RefreshFileDescriptorResult {
  code?: string | null;
  n?: number | null;
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

/**
 * Fetches file detail information for mobile and Web preview panels.
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
  } catch {
    const detail = await client.request<FileInfoResponse>(`/gateway/fileInfoById/${options.file.id}`);

    return mapFileDetail(detail);
  }
};

/**
 * Starts the server-side video transcode task used by built-in mobile preview fallback.
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
 * Refreshes server thumbnails for one file, matching the official preview "tools" action.
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
 * Refreshes face descriptors for one file using the official file detail utility.
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
 * Refreshes EXIF-backed file metadata and returns the normalized detail payload.
 * @param options Authenticated API options and the target file identity.
 * @returns Refreshed file detail fields.
 */
export const refreshFileInfo = async (options: ApiClientOptions & { file: DownloadableFile }): Promise<FileDetail> => {
  const detail = await createApiClient(options).request<FileInfoResponse>(`/gateway/fileInfoRT/${options.file.id}`);

  return mapFileDetail(detail);
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
