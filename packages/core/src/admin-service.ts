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

export interface AdminGalleryStatRow extends AdminGalleryStat {
  autoScan: boolean;
  gallery: AdminGallery;
  galleryId: number | string;
  name: string;
  path: string;
  statError?: string;
}

export interface AdminGalleryStatsOverview {
  all: AdminGalleryStat;
  autoScanSkipIds: number[];
  rows: AdminGalleryStatRow[];
}

export interface AdminGalleryScanSettings {
  excludeFileNamePrefixes: string[];
  excludeFileTypes: string[];
  mergeJpgRaw: boolean;
  rawGenThumbSolo: boolean;
  readXmp: boolean;
  useXmp: boolean;
  videoPreview: boolean;
}

export interface AdminGalleryUserLink {
  galleryId: number;
  userId: number;
}

export interface AdminDuplicateFileRecord {
  fileName: string;
  filePath: string;
  galleryIds: number[];
  id: number;
  md5: string;
  modifiedAt?: string;
  size: number;
  status?: number;
  takenAt?: string;
}

export interface AdminFileDeleteLogPage {
  count: number;
  list: AdminFileDeleteLogRecord[];
  pageNo: number;
  pageSize: number;
}

export interface AdminFileDeleteLogRecord {
  deleteTime?: string;
  deleteType: string;
  fileName: string;
  filePath: string;
  id: number | string;
  operator: string;
}

export interface AdminSkippedFolderLog {
  folderPath: string;
  msg: string;
}

export interface AdminInfoItem {
  label: string;
  value: string;
}

export interface AdminTaskStage {
  folder?: string;
  label?: string;
  total?: number;
  type?: string;
  value?: number;
}

export interface AdminTask {
  dataType?: string;
  detail?: string;
  galleryId?: number | string;
  id: number | string;
  name: string;
  progressLabel: string;
  progressPercent?: number;
  stage?: AdminTaskStage;
  startFrom?: string;
  statusLabel: string;
  taskType?: string;
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

const DEFAULT_GALLERY_SCAN_SETTINGS: AdminGalleryScanSettings = {
  excludeFileNamePrefixes: ['@', '.'],
  excludeFileTypes: [],
  mergeJpgRaw: true,
  rawGenThumbSolo: false,
  readXmp: true,
  useXmp: true,
  videoPreview: true,
};

const AUTO_SCAN_SKIP_GALLERY_KEY = 'AUTO_SCAN_SKIP_GALLERY_KEY';

const GALLERY_SCAN_SETTING_KEYS = {
  excludeFileNamePrefixes: 'EXCLUDE_FILE_START_NAME',
  excludeFileTypes: 'EXCLUDE_FILE_TYPES',
  mergeJpgRaw: 'FUNC_MERGE_JPG_RAW',
  rawGenThumbSolo: 'FUNC_RAW_GEN_THUMB_SOLO',
  readXmp: 'READ_USE_XMP',
  useXmp: 'USE_XMP',
  videoPreview: 'FUNC_VIDEO_PREVIEW',
} as const;

const LEGACY_GALLERY_SCAN_SETTING_KEYS = {
  excludeFileNamePrefixes: 'EXCLUDE_FILE_NAMES',
} as const;

const GALLERY_TASK_TYPES = new Set([
  'bindRawFile',
  'clipTask',
  'detectFileCategories',
  'detectFileFaces',
  'detectFileFacesV2',
  'fileSimilarTask',
  'fillGpsInfo',
  'fillGpsInfoFix',
  'fixHDRVideoThumbs',
  'fixNotSRGBPhotoThumbs',
  'fixThumb',
  'generatePhotoThumb',
  'generateVideoPreview',
  'imageHdThumb',
  'ocrTask',
  'refreshExif',
  'refreshThumb',
  'scanFiles',
  'scanFilesForUpload',
  'scanLivePhotos',
  'updateAllFilesGalleryIds',
  'videoTranscode',
]);

const TASK_NAME_LABELS: Record<string, string> = {
  bindRawFile: '扫描RAW文件',
  clearAlbumInvalidFileId: '清理相册无效文件',
  cleanGarbageData: '清理无效数据',
  cleanNoGalleryData: '清理无图库文件',
  clipTask: 'CLIP识别',
  detectFileCategories: '识别场景',
  detectFileFaces: '识别人脸',
  detectFileFacesV2: '识别人脸',
  fileSimilarTask: '识别相似图片',
  fillGpsInfo: '补全GPS信息',
  fillGpsInfoFix: '修复GPS信息',
  fixHDRVideoThumbs: '修复HDR视频缩略图',
  fixNotSRGBPhotoThumbs: '修复非sRGB照片缩略图',
  fixThumb: '修复缩略图',
  genPeople: '生成人物',
  genPeopleBase: '生成人物基础数据',
  genPeopleCover: '生成人物封面',
  generatePhotoThumb: '生成照片缩略图',
  generateVideoPreview: '生成视频预览',
  imageHdThumb: '生成高清缩略图',
  ocrTask: 'OCR识别',
  refreshExif: '刷新EXIF',
  refreshThumb: '刷新缩略图',
  refreshTimelineCache: '刷新时间线缓存',
  scanFiles: '扫描文件',
  scanFilesForUpload: '扫描上传文件',
  scanLivePhotos: '扫描Live Photo',
  updateAllFilesGalleryIds: '更新图库索引',
  upgradeCacheFolder: '升级缓存目录',
  videoTranscode: '视频转码',
};

const TASK_NAME_WORD_LABELS: Record<string, string> = {
  check: '检查',
  file: '文件',
  files: '文件',
  gallery: '图库',
  folder: '目录',
  folders: '目录',
  gen: '生成',
  gps: 'GPS',
  image: '图片',
  images: '图片',
  live: 'Live',
  ocr: 'OCR',
  photos: '照片',
  raw: 'RAW',
  scan: '扫描',
  task: '任务',
  thumb: '缩略图',
  thumbnail: '缩略图',
  thumbnails: '缩略图',
  video: '视频',
  videos: '视频',
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
 * Triggers the server-side scan endpoint for all galleries.
 * @param options Authenticated API client options.
 * @param scanType Optional scan mode.
 */
export const scanAdminAllGalleries = (
  options: ApiClientOptions,
  scanType?: 'check',
): Promise<unknown> => {
  return scanAdminGallery(options, 'all', scanType);
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
 * Fetches the gallery-stat dialog data used by MT Photos admin pages.
 * @param options Authenticated API client options.
 * @param galleries Optional gallery list already loaded by the caller.
 * @returns Global stat, per-gallery stat rows and auto-scan skip ids.
 */
export const fetchAdminGalleryStatsOverview = async (
  options: ApiClientOptions,
  galleries?: AdminGallery[],
): Promise<AdminGalleryStatsOverview> => {
  const galleryList = galleries && galleries.length > 0 ? galleries : await fetchAdminGalleries(options);
  const [all, autoScanSkipIds, rows] = await Promise.all([
    fetchAdminGalleryStat(options, 'all'),
    fetchAdminGalleryAutoScanSkipIds(options),
    fetchAdminGalleryStatRows(options, galleryList),
  ]);

  const skipSet = new Set(autoScanSkipIds);

  return {
    all,
    autoScanSkipIds,
    rows: rows.map((row) => ({
      ...row,
      autoScan: !skipSet.has(Number(row.galleryId)),
    })),
  };
};

/**
 * Fetches per-gallery statistics without failing the whole dialog when one gallery fails.
 * @param options Authenticated API client options.
 * @param galleries Gallery list to summarize.
 * @returns Per-gallery statistics.
 */
export const fetchAdminGalleryStatRows = async (
  options: ApiClientOptions,
  galleries: AdminGallery[],
): Promise<AdminGalleryStatRow[]> => {
  const results = await Promise.allSettled(
    galleries.map(async (gallery) => {
      const galleryId = gallery.id ?? gallery.path;
      const stat = await fetchAdminGalleryStat(options, galleryId);

      return createGalleryStatRow(gallery, stat);
    }),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }

    return createGalleryStatRow(galleries[index], {
      photo: 0,
      totalSize: 0,
      video: 0,
    }, getApiErrorText(result.reason));
  });
};

/**
 * Fetches the system-config value that stores galleries skipped by automatic scans.
 * @param options Authenticated API client options.
 * @returns Gallery ids skipped by automatic scans.
 */
export const fetchAdminGalleryAutoScanSkipIds = async (options: ApiClientOptions): Promise<number[]> => {
  try {
    const payload = await createApiClient(options).request<unknown>(`/system-config/${AUTO_SCAN_SKIP_GALLERY_KEY}`);

    return normalizeNumberListFromConfig(readConfigValue(payload));
  } catch {
    return [];
  }
};

/**
 * Persists galleries skipped by automatic scans.
 * @param options Authenticated API client options.
 * @param galleryIds Gallery ids that should be skipped by automatic scans.
 */
export const updateAdminGalleryAutoScanSkipIds = (
  options: ApiClientOptions,
  galleryIds: number[],
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config', {
    body: {
      key: AUTO_SCAN_SKIP_GALLERY_KEY,
      value: JSON.stringify(Array.from(new Set(galleryIds.filter((id) => Number.isFinite(id))))),
    },
    method: 'PATCH',
  });
};

/**
 * Starts duplicate file detection for the selected gallery ids.
 * @param options Authenticated API client options.
 * @param galleryIds Gallery id list.
 */
export const findAdminDuplicateFiles = (
  options: ApiClientOptions,
  galleryIds: number[],
): Promise<AdminDuplicateFileRecord[]> => {
  return createApiClient(options).request<unknown>('/gallery/findDuplicateFiles', {
    body: { galleryIds },
    method: 'POST',
  }).then(normalizeDuplicateFileList);
};

/**
 * Exports deleted file previews on the server.
 * @param options Authenticated API client options.
 */
export const exportAdminDeletedFiles = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery/exportDeletedFiles', { method: 'POST' });
};

/**
 * Fetches paged file-delete logs shown by the gallery management page.
 * @param options Authenticated API client options.
 * @param pageNo Page index starting at 1.
 * @param pageSize Number of rows per page.
 */
export const fetchAdminFileDeleteLogs = async (
  options: ApiClientOptions,
  pageNo = 1,
  pageSize = 20,
): Promise<AdminFileDeleteLogPage> => {
  const payload = await createApiClient(options).request<unknown>('/file-delete-log', {
    query: { pageNo, pageSize },
  });
  const record = unwrapRecord(payload);
  const list = normalizeListPayload(record.list ?? record.data ?? payload).map((item, index) => (
    normalizeFileDeleteLog(item, index)
  ));

  return {
    count: readNumber(record, ['count', 'total', 'totalCount']),
    list,
    pageNo,
    pageSize,
  };
};

/**
 * Clears all file-delete logs recorded by the server.
 * @param options Authenticated API client options.
 */
export const clearAdminFileDeleteLogs = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/file-delete-log/clearData', { method: 'POST' });
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
 * Fetches global gallery scan settings from system configuration records.
 * @param options Authenticated API client options.
 * @returns Normalized gallery scan settings.
 */
export const fetchAdminGalleryScanSettings = async (
  options: ApiClientOptions,
): Promise<AdminGalleryScanSettings> => {
  return normalizeGalleryScanSettings(await createApiClient(options).request<unknown>('/system-config'));
};

/**
 * Persists global gallery scan settings through the batch config endpoint.
 * @param options Authenticated API client options.
 * @param settings Gallery scan settings edited by the admin UI.
 */
export const updateAdminGalleryScanSettings = (
  options: ApiClientOptions,
  settings: AdminGalleryScanSettings,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/patchMulti', {
    body: {
      list: [
        {
          key: GALLERY_SCAN_SETTING_KEYS.excludeFileTypes,
          value: serializeConfigList(settings.excludeFileTypes),
        },
        {
          key: GALLERY_SCAN_SETTING_KEYS.excludeFileNamePrefixes,
          value: serializeConfigList(settings.excludeFileNamePrefixes),
        },
        { key: GALLERY_SCAN_SETTING_KEYS.useXmp, value: formatSwitchValue(settings.useXmp) },
        { key: GALLERY_SCAN_SETTING_KEYS.readXmp, value: formatSwitchValue(settings.readXmp) },
        { key: GALLERY_SCAN_SETTING_KEYS.mergeJpgRaw, value: formatSwitchValue(settings.mergeJpgRaw) },
        { key: GALLERY_SCAN_SETTING_KEYS.rawGenThumbSolo, value: formatSwitchValue(settings.rawGenThumbSolo) },
        { key: GALLERY_SCAN_SETTING_KEYS.videoPreview, value: formatSwitchValue(settings.videoPreview) },
      ],
    },
    method: 'POST',
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
 * Checks whether an active backend task belongs to the gallery scanning and indexing flow.
 */
export const isAdminGalleryTask = (
  task: Pick<AdminTask, 'dataType' | 'galleryId' | 'name' | 'startFrom' | 'taskType'>,
): boolean => {
  if (task.galleryId !== undefined || task.startFrom === 'scanFiles') {
    return true;
  }

  if (task.taskType && GALLERY_TASK_TYPES.has(task.taskType)) {
    return true;
  }

  return /scan|图库|gallery|raw|ocr|clip|thumb|transcode|similar/i.test(
    `${task.taskType ?? ''} ${task.name} ${task.dataType ?? ''}`,
  );
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

const createGalleryStatRow = (
  gallery: AdminGallery,
  stat: AdminGalleryStat,
  statError?: string,
): AdminGalleryStatRow => {
  const galleryId = gallery.id ?? gallery.path;

  return {
    ...stat,
    autoScan: true,
    gallery,
    galleryId,
    name: gallery.name,
    path: gallery.path,
    statError,
  };
};

const normalizeDuplicateFileList = (payload: unknown): AdminDuplicateFileRecord[] => {
  return normalizeListPayload(payload).map((item, index) => {
    const record = toRecord(item);

    return {
      fileName: readString(record, ['fileName', 'name']) || `重复文件 ${index + 1}`,
      filePath: readString(record, ['filePath', 'path']) || '-',
      galleryIds: normalizeNumberList(record.gallery_ids ?? record.galleryIds),
      id: readNumber(record, ['id']),
      md5: readString(record, ['MD5', 'md5']),
      modifiedAt: readString(record, ['mtime', 'modifiedAt', 'updatedAt']),
      size: readNumber(record, ['size', 'fileSize']),
      status: readOptionalNumber(record, ['status']),
      takenAt: readString(record, ['token_at', 'takenAt', 'date']),
    };
  });
};

const normalizeFileDeleteLog = (item: unknown, index: number): AdminFileDeleteLogRecord => {
  const record = toRecord(item);
  const userRecord = toRecord(record.user);

  return {
    deleteTime: readString(record, ['deleteTime', 'created_at', 'createdAt', 'time']),
    deleteType: readString(record, ['deleteType', 'type', 'action']) || '-',
    fileName: readString(record, ['fileName', 'name']) || '-',
    filePath: readString(record, ['filePath', 'path']) || '-',
    id: readStringOrNumber(record, ['id', 'logId']) ?? index + 1,
    operator: readString(record, ['username', 'operator', 'userName'])
      || readString(userRecord, ['username', 'name'])
      || String(readStringOrNumber(record, ['userId']) ?? '-'),
  };
};

const normalizeGalleryScanSettings = (payload: unknown): AdminGalleryScanSettings => {
  const configs = normalizeSystemConfigList(payload);
  const readValue = (key: string): string | undefined => configs.find((item) => item.key === key)?.value;
  const readFirstValue = (keys: string[]): string | undefined => {
    return keys.map(readValue).find((value) => value !== undefined);
  };

  return {
    excludeFileNamePrefixes: parseConfigList(
      readFirstValue([
        GALLERY_SCAN_SETTING_KEYS.excludeFileNamePrefixes,
        LEGACY_GALLERY_SCAN_SETTING_KEYS.excludeFileNamePrefixes,
      ]),
      DEFAULT_GALLERY_SCAN_SETTINGS.excludeFileNamePrefixes,
    ),
    excludeFileTypes: parseConfigList(
      readValue(GALLERY_SCAN_SETTING_KEYS.excludeFileTypes),
      DEFAULT_GALLERY_SCAN_SETTINGS.excludeFileTypes,
    ),
    mergeJpgRaw: parseSwitchValue(
      readValue(GALLERY_SCAN_SETTING_KEYS.mergeJpgRaw),
      DEFAULT_GALLERY_SCAN_SETTINGS.mergeJpgRaw,
    ),
    rawGenThumbSolo: parseSwitchValue(
      readValue(GALLERY_SCAN_SETTING_KEYS.rawGenThumbSolo),
      DEFAULT_GALLERY_SCAN_SETTINGS.rawGenThumbSolo,
    ),
    readXmp: parseSwitchValue(
      readValue(GALLERY_SCAN_SETTING_KEYS.readXmp),
      DEFAULT_GALLERY_SCAN_SETTINGS.readXmp,
    ),
    useXmp: parseSwitchValue(
      readValue(GALLERY_SCAN_SETTING_KEYS.useXmp),
      DEFAULT_GALLERY_SCAN_SETTINGS.useXmp,
    ),
    videoPreview: parseSwitchValue(
      readValue(GALLERY_SCAN_SETTING_KEYS.videoPreview),
      DEFAULT_GALLERY_SCAN_SETTINGS.videoPreview,
    ),
  };
};

const normalizeTaskList = (payload: unknown): AdminTask[] => {
  const rootRecord = unwrapRecord(payload);
  const sharedStage = normalizeTaskStage(rootRecord.subData);

  return normalizeListPayload(payload).map((item, index) => normalizeTask(item, index, sharedStage));
};

/**
 * Normalizes Bull queue jobs into the task model consumed by Web, desktop and mobile UI.
 */
const normalizeTask = (item: unknown, index: number, sharedStage?: AdminTaskStage): AdminTask => {
  const record = toRecord(item);
  const dataRecord = toRecord(record.data);
  const taskType = readString(record, ['name', 'jobName', 'taskName', 'type']);

  return {
    dataType: readString(dataRecord, ['type', 'taskType', 'jobType']),
    detail: readString(record, ['failedReason', 'error', 'message', 'msg']),
    galleryId: readStringOrNumber(dataRecord, ['galleryId', 'gallery_id', 'id']),
    id: readStringOrNumber(record, ['id', 'jobId', 'taskId', 'name']) ?? index + 1,
    name: formatTaskDisplayName(taskType) || `任务 ${index + 1}`,
    progressLabel: formatTaskProgress(record, dataRecord),
    progressPercent: readTaskProgressPercent(record, dataRecord),
    stage: sharedStage,
    startFrom: readString(dataRecord, ['startFrom', 'sourceTask', 'from']),
    statusLabel: readTaskStatusLabel(record),
    taskType,
    updatedAt: formatTaskUpdatedAt(record),
  };
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

const normalizeSystemConfigList = (payload: unknown): Array<{ key: string; value: string }> => {
  return normalizeListPayload(payload).map((item) => {
    const record = toRecord(item);

    return {
      key: readString(record, ['key']),
      value: readString(record, ['value']),
    };
  }).filter((item) => item.key);
};

const readConfigValue = (payload: unknown): string => {
  const record = unwrapRecord(payload);

  return readString(record, ['value']);
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
    const nestedList = ['list', 'rows', 'items', 'records', 'jobs', 'result'].find((key) => Array.isArray(nestedRecord[key]));

    return nestedList ? (nestedRecord[nestedList] as unknown[]) : [];
  }

  const listKey = ['list', 'rows', 'items', 'records', 'jobs', 'result'].find((key) => Array.isArray(record[key]));

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

const normalizeNumberList = (payload: unknown): number[] => {
  return normalizeListPayload(payload)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
};

const normalizeNumberListFromConfig = (value: string): number[] => {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    return normalizeNumberList(parsedValue);
  } catch {
    return value
      .split(/[,，\n]/)
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item));
  }
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

const normalizeTaskStage = (payload: unknown): AdminTaskStage | undefined => {
  const record = toRecord(payload);
  const stageRecord = toRecord(record.stage);
  const dataRecord = toRecord(record.data);
  const folder = readString(stageRecord, ['folder', 'path', 'folderPath']);
  const type = readString(stageRecord, ['type', 'stage', 'name']);
  const value = readOptionalNumber(dataRecord, ['i', 'value', 'processed', 'processedCount'])
    ?? readOptionalNumber(stageRecord, ['i', 'value', 'processed', 'processedCount']);
  const total = readOptionalNumber(dataRecord, ['total', 'totalCount'])
    ?? readOptionalNumber(stageRecord, ['total', 'totalCount']);

  if (!folder && !type && value === undefined && total === undefined) {
    return undefined;
  }

  return {
    folder: folder || undefined,
    label: formatTaskStageLabel(folder, value, total),
    total,
    type: type || undefined,
    value,
  };
};

const formatTaskStageLabel = (
  folder: string,
  value?: number,
  total?: number,
): string | undefined => {
  const parts: string[] = [];

  if (folder) {
    parts.push(folder);
  }

  if (value !== undefined && total !== undefined && total > 0) {
    parts.push(`${value}/${total}`);
  } else if (value !== undefined) {
    parts.push(String(value));
  } else if (total !== undefined && total > 0) {
    parts.push(`共 ${total}`);
  }

  return parts.length > 0 ? parts.join(' · ') : undefined;
};

const formatTaskDisplayName = (value: string): string => {
  if (!value.trim()) {
    return '';
  }

  const exactLabel = TASK_NAME_LABELS[value.trim()];

  if (exactLabel) {
    return exactLabel;
  }

  const words = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  let translatedCount = 0;
  const labels = words.map((word) => {
    const label = TASK_NAME_WORD_LABELS[word.toLowerCase()];

    if (label) {
      translatedCount += 1;
    }

    return label ?? word;
  });

  return labels.join(translatedCount === words.length ? '' : ' ');
};

const formatTaskProgress = (record: UnknownRecord, dataRecord: UnknownRecord): string => {
  const barRecord = toRecord(dataRecord.bar ?? record.bar);
  const barPercent = formatProgressPercentText(readStringOrNumber(barRecord, ['percent']));

  if (barPercent) {
    return barPercent;
  }

  const value = readOptionalNumber(barRecord, ['value', 'processed', 'processedCount']);
  const total = readOptionalNumber(barRecord, ['total', 'totalCount']);

  if (value !== undefined && total !== undefined && total > 0) {
    return `${value}/${total}`;
  }

  return formatProgress(record);
};

const readTaskProgressPercent = (
  record: UnknownRecord,
  dataRecord: UnknownRecord,
): number | undefined => {
  const barRecord = toRecord(dataRecord.bar ?? record.bar);
  const barPercent = readOptionalNumber(barRecord, ['percent']);

  if (barPercent !== undefined) {
    return clampPercent(barPercent);
  }

  const value = readOptionalNumber(barRecord, ['value', 'processed', 'processedCount']);
  const total = readOptionalNumber(barRecord, ['total', 'totalCount']);

  if (value !== undefined && total !== undefined && total > 0) {
    return clampPercent((value / total) * 100);
  }

  const progress = readOptionalNumber(record, ['progress', 'percent', 'processedPercent']);

  return progress === undefined ? undefined : clampPercent(progress);
};

const readTaskStatusLabel = (record: UnknownRecord): string => {
  const explicitStatus = readString(record, ['status', 'state', 'queue']);

  if (explicitStatus) {
    return explicitStatus;
  }

  if (readString(record, ['failedReason', 'error', 'message', 'msg'])) {
    return '失败';
  }

  if (readOptionalNumber(record, ['finishedOn']) !== undefined) {
    return '已完成';
  }

  if (readOptionalNumber(record, ['processedOn']) !== undefined) {
    return '执行中';
  }

  return '等待中';
};

const formatTaskUpdatedAt = (record: UnknownRecord): string | undefined => {
  const value = readStringOrNumber(record, ['updatedAt', 'updateAt', 'timestamp', 'finishedOn', 'processedOn']);

  if (value === undefined || value === '') {
    return undefined;
  }

  const timestamp = Number(value);

  if (Number.isFinite(timestamp) && String(value).length >= 10) {
    return new Date(timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp).toISOString();
  }

  return String(value);
};

const formatProgressPercentText = (value: number | string | undefined): string => {
  if (value === undefined) {
    return '';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${formatPercentNumber(value, Number.isInteger(value) ? 0 : 1)}%`;
  }

  if (typeof value === 'number') {
    return '';
  }

  const rawValue = value.trim();

  if (!rawValue) {
    return '';
  }

  const normalizedValue = rawValue.endsWith('%') ? rawValue.slice(0, -1) : rawValue;
  const parsedValue = Number(normalizedValue);

  if (!Number.isFinite(parsedValue)) {
    return rawValue.endsWith('%') ? rawValue : `${rawValue}%`;
  }

  return `${formatPercentNumber(parsedValue, normalizedValue.includes('.') ? 1 : 0)}%`;
};

const formatPercentNumber = (value: number, digits: number): string => {
  return clampPercent(value).toFixed(digits);
};

const clampPercent = (value: number): number => {
  return Math.min(100, Math.max(0, value));
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

const parseConfigList = (value: string | undefined, fallback: string[]): string[] => {
  if (value === undefined) {
    return fallback;
  }

  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const serializeConfigList = (values: string[]): string => {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join(',');
};

const parseSwitchValue = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return ['1', 'on', 'true', 'yes'].includes(value.toLowerCase());
};

const formatSwitchValue = (enabled: boolean): string => {
  return enabled ? 'on' : 'off';
};

const getApiErrorText = (error: unknown): string => {
  const record = toRecord(error);

  return readString(record, ['msg', 'message']) || '统计接口读取失败';
};

const getLastPathSegment = (path: string): string => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? '';
};
