import type { ApiClientOptions } from './api-client';
import { createApiClient } from './api-client';

export type FileMoveOverwriteMode = 0 | 1 | 2;

export interface MoveFilesParams {
  fileIds: number[];
  overwrite?: FileMoveOverwriteMode;
  shareAlbumId?: number;
  targetFolderId: number;
}

export interface DeleteFilesResponse {
  code?: string;
  deleteIds?: number[];
  identifiers?: Array<{ id?: number }>;
}

export interface FilePathEditResponse {
  code?: string;
  duplicateFiles?: string[];
  msg?: string;
  n?: number;
  path?: string;
}

export interface CreateFileShareParams {
  cover?: string;
  desc?: string;
  fileIds: number[];
  linkEndTime?: string | null;
  linkPwd?: string;
  showDownload: boolean;
  showExif: boolean;
}

export interface FileShareLinkResponse {
  cover?: string;
  id: number;
  key: string;
}

export interface FileAlbumSummary {
  count?: number;
  cover?: string;
  endTime?: string;
  id: number;
  name: string;
  startTime?: string;
}

export interface FavoriteAlbumState extends FileAlbumSummary {
  files: number[];
}

/**
 * Moves selected files to a target folder through the real file path edit API.
 * @param options Authenticated API client options.
 * @param params File ids, destination and conflict strategy.
 * @returns Backend operation result.
 */
export const moveFilesToFolder = (options: ApiClientOptions, params: MoveFilesParams): Promise<FilePathEditResponse> => {
  return createApiClient(options).request<FilePathEditResponse>('/gateway/filePathEdit', {
    method: 'POST',
    body: {
      distId: params.targetFolderId,
      fileIds: params.fileIds,
      overwrite: params.overwrite,
      shareAlbumId: params.shareAlbumId,
      type: 'move',
    },
  });
};

/**
 * Moves selected files to the recycle bin.
 * @param options Authenticated API client options.
 * @param fileIds File ids to delete.
 * @returns Backend delete result.
 */
export const deleteFiles = (options: ApiClientOptions, fileIds: number[]): Promise<DeleteFilesResponse> => {
  return createApiClient(options).request<DeleteFilesResponse>('/gateway/files', {
    method: 'DELETE',
    body: {
      fileIds,
    },
  });
};

/**
 * Creates an official MT Photos file share link.
 * @param options Authenticated API client options.
 * @param params Share options and selected file ids.
 * @returns Created share link metadata.
 */
export const createFileShareLink = (
  options: ApiClientOptions,
  params: CreateFileShareParams,
): Promise<FileShareLinkResponse> => {
  return createApiClient(options).request<FileShareLinkResponse>('/api-share/createFilesLink', {
    method: 'POST',
    body: {
      albumId: 0,
      count: params.fileIds.length,
      cover: params.cover ?? '',
      desc: params.desc ?? '',
      files: params.fileIds,
      link: true,
      linkEndTime: params.linkEndTime ?? null,
      linkPwd: params.linkPwd ?? '',
      showDownload: params.showDownload,
      showExif: params.showExif,
    },
  });
};

/**
 * Fetches the user's album list for the official "add to album" preview action.
 * @param options Authenticated API client options.
 * @returns Normalized album summaries.
 */
export const fetchFileAlbums = async (options: ApiClientOptions): Promise<FileAlbumSummary[]> => {
  const payload = await createApiClient(options).request<unknown>('/api-album');

  return normalizeAlbumList(payload);
};

/**
 * Fetches album ids that already contain one file.
 * @param options Authenticated API client options.
 * @param fileId Target file id.
 * @returns Album id list.
 */
export const fetchFileAlbumIds = async (options: ApiClientOptions, fileId: number): Promise<number[]> => {
  const payload = await createApiClient(options).request<unknown>(`/api-album/fileInAlbums/${fileId}`);

  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
};

/**
 * Ensures the official favorites album exists and returns its file state.
 * @param options Authenticated API client options.
 * @returns Favorites album metadata and file ids when available.
 */
export const checkFavoriteAlbum = async (options: ApiClientOptions): Promise<FavoriteAlbumState> => {
  const payload = await createApiClient(options).request<unknown>('/api-album/checkForFavorites', {
    method: 'POST',
  });
  const record = isRecord(payload) ? payload : {};

  return {
    count: readOptionalNumber(record.count),
    cover: readOptionalString(record.cover),
    files: Array.isArray(record.files)
      ? record.files.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [],
    id: readOptionalNumber(record.id) ?? 0,
    name: readOptionalString(record.name) ?? '收藏夹',
  };
};

/**
 * Adds files to one album.
 * @param options Authenticated API client options.
 * @param albumId Target album id.
 * @param fileIds File ids to add.
 * @returns Backend mutation result.
 */
export const addFilesToAlbum = (
  options: ApiClientOptions,
  albumId: number,
  fileIds: number[],
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/api-album/addFileToAlbum', {
    method: 'POST',
    body: {
      albumId,
      files: fileIds,
    },
  });
};

/**
 * Removes files from one album.
 * @param options Authenticated API client options.
 * @param albumId Target album id.
 * @param fileIds File ids to remove.
 * @returns Backend mutation result.
 */
export const removeFilesFromAlbum = (
  options: ApiClientOptions,
  albumId: number,
  fileIds: number[],
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/api-album/removeFileFromAlbum', {
    method: 'POST',
    body: {
      albumId,
      files: fileIds,
    },
  });
};

const normalizeAlbumList = (payload: unknown): FileAlbumSummary[] => {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => {
      const record = isRecord(item) ? item : {};
      const id = readOptionalNumber(record.id);
      const name = readOptionalString(record.name);

      if (!id || !name) {
        return undefined;
      }

      const album: FileAlbumSummary = {
        id,
        name,
      };
      const count = readOptionalNumber(record.count);
      const cover = readOptionalString(record.cover);
      const endTime = readOptionalString(record.endTime);
      const startTime = readOptionalString(record.startTime);

      if (count !== undefined) {
        album.count = count;
      }

      if (cover) {
        album.cover = cover;
      }

      if (endTime) {
        album.endTime = endTime;
      }

      if (startTime) {
        album.startTime = startTime;
      }

      return album;
    })
    .filter((item): item is FileAlbumSummary => Boolean(item));
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const readOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};
