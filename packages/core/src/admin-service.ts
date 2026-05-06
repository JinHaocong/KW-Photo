import type { ApiClientOptions } from './api-client';
import { createApiClient } from './api-client';

export type AdminTaskStatus = 'active' | 'waiting' | 'completed' | 'failed' | 'paused';

export interface AdminGallery {
  adminOnly?: boolean;
  cover?: number;
  fileCount?: number;
  folders: AdminGalleryFolder[];
  funcExclude: string[];
  hidden?: boolean;
  id?: number | string;
  name: string;
  path: string;
  scanLabel: string;
  statusLabel: string;
  updatedAt?: string;
  weights?: number;
}

export interface AdminGalleryFolder {
  cover?: string;
  id?: number | string;
  name: string;
  path: string;
}

export interface AdminGalleryMutationPayload {
  cover?: number;
  fileDeleteOnlyAdmin?: boolean;
  folders: string[];
  func_exclude?: string[];
  hide: boolean;
  name: string;
  userIds?: number | number[];
  weights?: number;
}

export interface AdminGalleryStat {
  photo: number;
  totalSize: number;
  video: number;
}

export interface AdminGalleryUserLink {
  galleryId: number;
  userId: number;
}

export interface AdminSkippedFolderLog {
  folderPath: string;
  msg: string;
}

export interface AdminInfoItem {
  label: string;
  value: string;
}

export interface AdminTask {
  detail?: string;
  id: number | string;
  name: string;
  progressLabel: string;
  statusLabel: string;
  updatedAt?: string;
}

export interface AdminTaskCounts {
  active: number;
  completed: number;
  failed: number;
  paused: number;
  waiting: number;
}

export interface AdminUserRecord {
  id?: number | string;
  lastLogin?: string;
  roleLabel: string;
  securityLabel: string;
  username: string;
}

type UnknownRecord = Record<string, unknown>;

const TASK_STATUS_PATH_MAP: Record<AdminTaskStatus, string> = {
  active: '/fileTask/jobs/active',
  completed: '/fileTask/jobs/completed',
  failed: '/fileTask/jobs/failed',
  paused: '/fileTask/jobs/paused',
  waiting: '/fileTask/jobs/waiting',
};

/**
 * Fetches galleries from the admin gallery API and normalizes common payload shapes.
 * @param options Authenticated API client options.
 * @returns Normalized gallery rows.
 */
export const fetchAdminGalleries = async (options: ApiClientOptions): Promise<AdminGallery[]> => {
  const client = createApiClient(options);

  try {
    return normalizeGalleryList(await client.request<unknown>('/gallery/all'));
  } catch {
    return normalizeGalleryList(await client.request<unknown>('/gallery'));
  }
};

/**
 * Triggers a server-side gallery scan for one gallery.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id.
 * @param scanType Optional scan mode.
 */
export const scanAdminGallery = (
  options: ApiClientOptions,
  galleryId: number | string,
  scanType?: 'check',
): Promise<unknown> => {
  return createApiClient(options).request<unknown>(`/gallery/scan/${galleryId}`, {
    query: scanType ? { type: scanType } : undefined,
  });
};

/**
 * Fetches a single gallery detail before editing.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id.
 * @returns Normalized gallery detail.
 */
export const fetchAdminGalleryDetail = async (
  options: ApiClientOptions,
  galleryId: number | string,
): Promise<AdminGallery> => {
  return normalizeGallery(await createApiClient(options).request<unknown>(`/gallery/${galleryId}`), 0);
};

/**
 * Creates a gallery with the server CreateGalleryDto field names.
 * @param options Authenticated API client options.
 * @param payload Gallery mutation payload.
 */
export const createAdminGallery = (
  options: ApiClientOptions,
  payload: AdminGalleryMutationPayload,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery', {
    body: { ...payload },
    method: 'POST',
  });
};

/**
 * Updates a gallery with the server UpdateGalleryDto field names.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id.
 * @param payload Gallery mutation payload.
 */
export const updateAdminGallery = (
  options: ApiClientOptions,
  galleryId: number | string,
  payload: AdminGalleryMutationPayload,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>(`/gallery/${galleryId}`, {
    body: { ...payload },
    method: 'PATCH',
  });
};

/**
 * Deletes a gallery by id.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id.
 */
export const deleteAdminGallery = (options: ApiClientOptions, galleryId: number | string): Promise<unknown> => {
  return createApiClient(options).request<unknown>(`/gallery/${galleryId}`, { method: 'DELETE' });
};

/**
 * Updates gallery sort weight.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id.
 * @param weights Numeric sort weight.
 */
export const updateAdminGalleryWeight = (
  options: ApiClientOptions,
  galleryId: number | string,
  weights: number,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery/updateWeights', {
    body: { id: Number(galleryId), weights },
    method: 'POST',
  });
};

/**
 * Fetches gallery statistics. Use "all" for the global total.
 * @param options Authenticated API client options.
 * @param galleryId Gallery id or "all".
 * @returns Normalized gallery statistics.
 */
export const fetchAdminGalleryStat = async (
  options: ApiClientOptions,
  galleryId: number | string,
): Promise<AdminGalleryStat> => {
  return normalizeGalleryStat(await createApiClient(options).request<unknown>(`/gallery/stat/${galleryId}`));
};

/**
 * Starts duplicate file detection for the selected gallery ids.
 * @param options Authenticated API client options.
 * @param galleryIds Gallery id list.
 */
export const findAdminDuplicateFiles = (
  options: ApiClientOptions,
  galleryIds: number[],
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery/findDuplicateFiles', {
    body: { galleryIds },
    method: 'POST',
  });
};

/**
 * Exports deleted file previews on the server.
 * @param options Authenticated API client options.
 */
export const exportAdminDeletedFiles = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery/exportDeletedFiles', { method: 'POST' });
};

/**
 * Fetches skipped-folder scan logs.
 * @param options Authenticated API client options.
 * @returns Normalized skipped-folder logs.
 */
export const fetchAdminSkippedFolderLogs = async (
  options: ApiClientOptions,
): Promise<AdminSkippedFolderLog[]> => {
  const payload = await createApiClient(options).request<unknown>('/gallery/skippedFolderLogs', { method: 'POST' });

  return normalizeListPayload(payload).map((item) => {
    const record = toRecord(item);

    return {
      folderPath: readString(record, ['folderPath', 'path']) || '-',
      msg: readString(record, ['msg', 'message', 'reason']) || '未提供原因',
    };
  });
};

/**
 * Fetches root directories available for gallery folder selection.
 * @param options Authenticated API client options.
 * @returns Root directory paths.
 */
export const fetchAdminGalleryRootDirs = async (options: ApiClientOptions): Promise<string[]> => {
  return normalizeStringList(await createApiClient(options).request<unknown>('/gallery/rootDirs'));
};

/**
 * Fetches child directories under one gallery path.
 * @param options Authenticated API client options.
 * @param path Parent path.
 * @returns Child directory paths.
 */
export const fetchAdminGallerySubDirs = async (
  options: ApiClientOptions,
  path: string,
): Promise<string[]> => {
  return normalizeStringList(
    await createApiClient(options).request<unknown>('/gallery/subDirs', {
      query: { path },
    }),
  );
};

/**
 * Fetches gallery-user relations for preselecting users in edit mode.
 * @param options Authenticated API client options.
 * @returns Gallery-user relation rows.
 */
export const fetchAdminGalleryUserLinks = async (options: ApiClientOptions): Promise<AdminGalleryUserLink[]> => {
  const payload = await createApiClient(options).request<unknown>('/gallery/galleryUsers');

  return normalizeListPayload(payload)
    .map((item) => {
      const record = toRecord(item);

      return {
        galleryId: readNumber(record, ['galleryId']),
        userId: readNumber(record, ['userId']),
      };
    })
    .filter((item) => item.galleryId > 0 && item.userId > 0);
};

/**
 * Fetches current server task counters.
 * @param options Authenticated API client options.
 * @returns Task counts grouped by queue status.
 */
export const fetchAdminTaskCounts = async (options: ApiClientOptions): Promise<AdminTaskCounts> => {
  const payload = await createApiClient(options).request<unknown>('/fileTask/jobs/Counts');
  const record = unwrapRecord(payload);

  return {
    active: readNumber(record, ['active', 'activeCount', 'running', 'runningCount']),
    completed: readNumber(record, ['completed', 'completedCount', 'complete', 'completeCount']),
    failed: readNumber(record, ['failed', 'failedCount', 'fail', 'failCount']),
    paused: readNumber(record, ['paused', 'pausedCount', 'pause', 'pauseCount']),
    waiting: readNumber(record, ['waiting', 'waitingCount', 'wait', 'waitCount']),
  };
};

/**
 * Fetches one task queue by status.
 * @param options Authenticated API client options.
 * @param status Task queue status.
 * @returns Normalized task rows.
 */
export const fetchAdminTasks = async (
  options: ApiClientOptions,
  status: AdminTaskStatus,
): Promise<AdminTask[]> => {
  const payload = await createApiClient(options).request<unknown>(TASK_STATUS_PATH_MAP[status]);

  return normalizeTaskList(payload);
};

/**
 * Pauses the backend file task queue.
 * @param options Authenticated API client options.
 */
export const pauseAdminTasks = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/fileTask/jobs/pause', { method: 'POST' });
};

/**
 * Resumes the backend file task queue.
 * @param options Authenticated API client options.
 */
export const resumeAdminTasks = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/fileTask/jobs/resume', { method: 'POST' });
};

/**
 * Fetches users from the admin user API.
 * @param options Authenticated API client options.
 * @returns Normalized user rows.
 */
export const fetchAdminUsers = async (options: ApiClientOptions): Promise<AdminUserRecord[]> => {
  const payload = await createApiClient(options).request<unknown>('/users');

  return normalizeUserList(payload);
};

/**
 * Fetches server system status and returns compact key-value rows.
 * @param options Authenticated API client options.
 * @returns Displayable system info rows.
 */
export const fetchAdminSystemStatus = async (options: ApiClientOptions): Promise<AdminInfoItem[]> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/systemStatus', {
    method: 'POST',
  });

  return normalizeInfoItems(payload);
};

/**
 * Fetches license information when the server exposes it.
 * @param options Authenticated API client options.
 * @returns Displayable license info rows.
 */
export const fetchAdminLicenseInfo = async (options: ApiClientOptions): Promise<AdminInfoItem[]> => {
  const payload = await createApiClient(options).request<unknown>('/gateway/licenseInfo');

  return normalizeInfoItems(payload);
};

const normalizeGalleryList = (payload: unknown): AdminGallery[] => {
  return normalizeListPayload(payload).map((item, index) => normalizeGallery(item, index));
};

const normalizeGallery = (item: unknown, index: number): AdminGallery => {
  const record = toRecord(item);
  const folders = normalizeGalleryFolders(record);
  const id = readStringOrNumber(record, ['id', 'galleryId', 'uuid']);
  const name = readString(record, ['name', 'title', 'galleryName']) || `图库 ${index + 1}`;
  const path = readString(record, ['path', 'folderPath', 'root', 'rootPath']) || folders[0]?.path || '未提供路径';

  return {
    adminOnly: readOptionalBoolean(record, ['fileDeleteOnlyAdmin', 'adminOnly', 'onlyAdmin']),
    cover: readOptionalNumber(record, ['cover']),
    fileCount: readOptionalNumber(record, ['fileCount', 'filesCount', 'fileNum', 'count']),
    folders,
    funcExclude: normalizeStringList(record.func_exclude),
    hidden: readOptionalBoolean(record, ['hide', 'hidden']),
    id,
    name,
    path,
    scanLabel: readString(record, ['scanStatus', 'lastScanStatus', 'taskStatus']) || '待确认',
    statusLabel: readStatusLabel(record),
    updatedAt: readString(record, ['updatedAt', 'updateAt', 'mtime', 'lastScanAt', 'scanAt']),
    weights: readOptionalNumber(record, ['weights', 'weight', 'sort']),
  };
};

const normalizeGalleryFolders = (record: UnknownRecord): AdminGalleryFolder[] => {
  const folders = normalizeListPayload(record.folders ?? record.folderList ?? record.galleryFolders);

  return folders.map((item, index) => {
    if (typeof item === 'string') {
      return {
        name: getLastPathSegment(item) || `文件夹 ${index + 1}`,
        path: item,
      };
    }

    const folder = toRecord(item);
    const path = readString(folder, ['path', 'folderPath', 'rootPath']) || '-';

    return {
      cover: readString(folder, ['cover', 's_cover']),
      id: readStringOrNumber(folder, ['id', 'folderId', 'galleryFolderId']),
      name: readString(folder, ['name', 'galleryName']) || getLastPathSegment(path) || `文件夹 ${index + 1}`,
      path,
    };
  });
};

const normalizeGalleryStat = (payload: unknown): AdminGalleryStat => {
  const record = unwrapRecord(payload);

  return {
    photo: readNumber(record, ['photo', 'photoCount', 'imageCount']),
    totalSize: readNumber(record, ['totalSize', 'size', 'fileSize']),
    video: readNumber(record, ['video', 'videoCount']),
  };
};

const normalizeTaskList = (payload: unknown): AdminTask[] => {
  return normalizeListPayload(payload).map((item, index) => {
    const record = toRecord(item);

    return {
      detail: readString(record, ['failedReason', 'error', 'message', 'msg', 'data']),
      id: readStringOrNumber(record, ['id', 'jobId', 'taskId', 'name']) ?? index + 1,
      name: readString(record, ['name', 'jobName', 'taskName', 'type']) || `任务 ${index + 1}`,
      progressLabel: formatProgress(record),
      statusLabel: readString(record, ['status', 'state', 'queue']) || '未知',
      updatedAt: readString(record, ['updatedAt', 'timestamp', 'finishedOn', 'processedOn']),
    };
  });
};

const normalizeUserList = (payload: unknown): AdminUserRecord[] => {
  return normalizeListPayload(payload).map((item, index) => {
    const record = toRecord(item);
    const username = readString(record, ['username', 'name', 'nickname']) || `用户 ${index + 1}`;

    return {
      id: readStringOrNumber(record, ['id', 'userId', 'uid']),
      lastLogin: readString(record, ['lastLogin', 'lastLoginAt', 'loginAt']),
      roleLabel: getRoleLabel(record),
      securityLabel: getSecurityLabel(record),
      username,
    };
  });
};

const normalizeInfoItems = (payload: unknown): AdminInfoItem[] => {
  const record = unwrapRecord(payload);

  return Object.entries(record)
    .filter(([, value]) => isDisplayableValue(value))
    .map(([key, value]) => ({
      label: formatInfoKey(key),
      value: formatInfoValue(value),
    }));
};

const normalizeListPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);
  const data = record.data;

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    const nestedRecord = data as UnknownRecord;
    const nestedList = ['list', 'rows', 'items', 'records'].find((key) => Array.isArray(nestedRecord[key]));

    return nestedList ? (nestedRecord[nestedList] as unknown[]) : [];
  }

  const listKey = ['list', 'rows', 'items', 'records', 'result'].find((key) => Array.isArray(record[key]));

  return listKey ? (record[listKey] as unknown[]) : [];
};

const unwrapRecord = (payload: unknown): UnknownRecord => {
  const record = toRecord(payload);

  if (record.data && typeof record.data === 'object' && !Array.isArray(record.data)) {
    return record.data as UnknownRecord;
  }

  return record;
};

const toRecord = (value: unknown): UnknownRecord => {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};
};

const readString = (record: UnknownRecord, keys: string[]): string => {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string' && item.trim());

  return typeof value === 'string' ? value : '';
};

const readStringOrNumber = (record: UnknownRecord, keys: string[]): number | string | undefined => {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string' || typeof item === 'number');

  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
};

const readNumber = (record: UnknownRecord, keys: string[]): number => {
  return readOptionalNumber(record, keys) ?? 0;
};

const readOptionalNumber = (record: UnknownRecord, keys: string[]): number | undefined => {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'number' || typeof item === 'string');

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
};

const readOptionalBoolean = (record: UnknownRecord, keys: string[]): boolean | undefined => {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'boolean');

  return typeof value === 'boolean' ? value : undefined;
};

const readStatusLabel = (record: UnknownRecord): string => {
  const status = readString(record, ['status', 'state']);

  if (status) {
    return status;
  }

  if (record.enable === false || record.enabled === false) {
    return '已停用';
  }

  return '可用';
};

const formatProgress = (record: UnknownRecord): string => {
  const progress = readOptionalNumber(record, ['progress', 'percent', 'processedPercent']);

  if (progress !== undefined) {
    return `${Math.min(100, Math.max(0, progress)).toFixed(0)}%`;
  }

  const processed = readOptionalNumber(record, ['processed', 'processedCount']);
  const total = readOptionalNumber(record, ['total', 'totalCount']);

  if (processed !== undefined && total !== undefined && total > 0) {
    return `${processed}/${total}`;
  }

  return '无进度';
};

const getRoleLabel = (record: UnknownRecord): string => {
  if (record.isSuperAdmin === true) {
    return '超级管理员';
  }

  if (record.isAdmin === true || record.admin === true) {
    return '管理员';
  }

  return '普通用户';
};

const getSecurityLabel = (record: UnknownRecord): string => {
  if (record.otpEnable === true || record.twoFA === true || record.twoFactorEnabled === true) {
    return '已开启 2FA';
  }

  return '未开启 2FA';
};

const formatInfoKey = (key: string): string => {
  return key.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
};

const formatInfoValue = (value: unknown): string => {
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value || '-';
  }

  return JSON.stringify(value);
};

const isDisplayableValue = (value: unknown): boolean => {
  return ['string', 'number', 'boolean'].includes(typeof value);
};

const normalizeStringList = (payload: unknown): string[] => {
  return normalizeListPayload(payload)
    .map((item) => {
      if (typeof item === 'string') {
        return item;
      }

      const record = toRecord(item);

      return readString(record, ['path', 'name', 'value', 'folderPath']);
    })
    .filter((item) => item.trim());
};

const getLastPathSegment = (path: string): string => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? '';
};
