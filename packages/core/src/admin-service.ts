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

export interface AdminDuplicateFileDeletePayload {
  galleryIds: number[];
  id: number;
  md5: string;
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
  operatorId?: number | string;
}

export interface AdminDeletedFileRecord {
  fileName: string;
  filePath: string;
  id: number;
  md5: string;
}

export interface AdminDeletedFileGroup {
  addr?: string;
  day: string;
  list: AdminDeletedFileRecord[];
}

export interface AdminDeletedFilesResult {
  duplicateFiles: UnknownRecord;
  groups: AdminDeletedFileGroup[];
  totalCount: number;
  ver?: number;
}

export interface AdminSkippedFolderLog {
  folderPath: string;
  msg: string;
}

export interface AdminInfoItem {
  label: string;
  value: string;
}

export interface AdminActiveTaskOverview {
  stage?: AdminTaskStage;
  tasks: AdminTask[];
  thumbTaskMaxNum?: number;
}

export interface AdminDatabaseReindexInfo {
  current: number;
  status?: string;
  total: number;
}

export interface AdminLogRecord {
  level: string;
  message: string;
  timestamp?: string;
}

export interface AdminMaintenanceTaskDefinition {
  destructive?: boolean;
  label: string;
  value: string;
}

export interface AdminSystemConfigInfo {
  cacheVer?: number;
  categoryOneId?: number;
  cpuThreadNum: number;
  dbTZ?: string;
  faceRegVer?: string;
  items: AdminInfoItem[];
  taskMaxThreadNum: number;
}

export interface AdminSystemConfigRecord {
  description?: string;
  key: string;
  type?: string;
  updatedAt?: string;
  value: string;
}

export interface AdminTestApiPayload {
  api_key: string;
  type: 'facial' | 'ocr';
  uri: string;
}

export interface AdminTestApiResult {
  err?: string;
  pass: boolean;
  response?: unknown;
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
  progressTotal?: number;
  progressValue?: number;
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

export const ADMIN_SYSTEM_CONFIG_KEYS = {
  classifyApi: 'CLASSIFY_API_CONFIG',
  faceApi: 'FACE_API_CONFIG',
  faceApiVersion: 'FACE_API_VERSION',
  faceRegApi: 'FACE_REG_API_CONFIG',
  gpsApi: 'GPS_API_CONFIG',
  hdThumb: 'HD_THUMB_CONFIG',
  hdThumbFolderPath: 'HD_THUMB_FOLDER_PATH_CONFIG',
  ocrApi: 'OCR_API_CONFIG',
  pgAutoBackup: 'PG_AUTO_BACKUP_CONFIG',
  showMemory: 'SHOW_MEMORY_CONFIG',
  similarFiles: 'SIMILAR_FILES_CONFIG',
  systemLanguage: 'SYSTEM_LANGUAGE',
  taskMaxThread: 'TASK_MAX_THREAD',
  transcode: 'TRANSCODE_CONFIG',
  transcodeFolderPath: 'TRANSCODE_FOLDER_PATH_CONFIG',
  trashShareInUsers: 'FUNC_TRASH_SHARE_IN_USERS',
} as const;

export const ADMIN_TASK_TYPE_LABELS: Record<string, string> = {
  adminDeleteUserSetCover_address: '清除地点相册手动封面',
  adminDeleteUserSetCover_classify: '清除场景相册手动封面',
  bindRawFile: '扫描RAW文件',
  checkDescriptorPass: '检查人脸特征状态',
  clearAlbumInvalidFileId: '清理相册无效文件',
  clearAllJobs: '清空后台任务',
  clearDataAfterDeleteFilesPermanently: '清理永久删除文件数据',
  cleanGarbageData: '清理缓存文件',
  cleanNoGalleryData: '清理已删除图库数据',
  clipTask: 'CLIP识别',
  detectFileCategories: '识别场景',
  detectFileFaces: '识别人脸',
  detectFileFacesV2: '识别人脸V2',
  fileSimilarTask: '相似照片识别',
  fillGpsInfo: '识别GPS信息',
  fillGpsInfoFix: '检测识别GPS信息失败的照片',
  fixHDRVideoThumbs: '检测并更新HDR视频缩略图',
  fixNotSRGBPhotoThumbs: '检测并更新照片缩略图',
  fixThumb: '修复无法显示的缩略图',
  genPeople: '生成人物相册',
  genPeopleBase: '生成人物特征对比数据',
  genPeopleCover: '刷新人物封面',
  generatePhotoThumb: '生成照片缩略图',
  generateVideoPreview: '生成视频预览图',
  imageHdThumb: '生成高清预览图',
  ocrTask: '文本识别',
  reGenPeople: '重建所有人物相册',
  reGenPeopleBase: '重建特征对比数据及人物相册',
  refreshExif: '刷新EXIF信息',
  refreshThumb: '重新生成全部文件缩略图',
  refreshTimelineCache: '刷新时间线缓存',
  resetAllFaceDescriptor: '重建全部人脸数据',
  resetAllGpsInfo: '重新生成地点相册',
  resetFailedCategories: '检测未识别的场景照片',
  resetFailedClip: '检测未识别的CLIP照片',
  resetFailedFaceDescriptor: '检测未识别的人脸照片',
  resetFailedImageHdThumb: '检测生成高清预览图失败的照片',
  resetFailedOCR: '检测未识别的文本照片',
  resetFailedSimilar: '检测未识别的相似照片',
  resetFailedVideoTranscode: '检测生成转码文件失败的视频',
  resetFileCategories: '清空并重新识别所有场景',
  resetFileClip: '清空并重新识别所有CLIP',
  resetFileOcr: '清空并重新识别所有文本',
  resetFileSimilar: '清空并重新检测所有相似照片',
  resetImageHdThumb: '重新生成全部照片高清预览图',
  resetVideoTranscode: '重新生成全部视频转码文件',
  scanFiles: '扫描文件',
  scanFilesForUpload: '扫描上传文件',
  scanLivePhotos: '扫描Live Photo',
  syncAllAlbumAutoLink: '同步自动相册关联',
  testLimit: '测试任务限制',
  updateAllFilesGalleryIds: '更新目录列表',
  upgradeCacheFolder: '升级缩略图目录结构',
  videoTranscode: '视频转码',
};

export const ADMIN_MAINTENANCE_TASKS: readonly AdminMaintenanceTaskDefinition[] = [
  { label: '【缩略图】- 修复无法显示的缩略图', value: 'fixThumb' },
  { label: '【缩略图】- 重新生成全部文件的缩略图（仅用于缩略图文件被删除的情况）', value: 'refreshThumb', destructive: true },
  { label: '【缩略图】- 升级目录结构（分散存多个目录，避免单目录下文件数量过多）', value: 'upgradeCacheFolder' },
  { label: '【缩略图】- 检测并更新HDR视频缩略图（仅用于HDR视频缩略图颜色错误的情况）', value: 'fixHDRVideoThumbs' },
  { label: '【缩略图】- 检测并更新照片缩略图（仅用于照片缩略图颜色泛白的情况）', value: 'fixNotSRGBPhotoThumbs' },
  { label: '【EXIF】- 刷新所有文件的exif信息（在外部修改过文件元数据后可执行）', value: 'refreshExif' },
  { label: '【地点相册】- 检测识别GPS信息失败的照片', value: 'fillGpsInfoFix' },
  { label: '【地点相册】- 重新生成地点相册（清空现有的GPS识别数据，重新运行GPS信息识别）', value: 'resetAllGpsInfo', destructive: true },
  { label: '【地点相册】- 清除手动设置的封面（让地点恢复自动变化封面）', value: 'adminDeleteUserSetCover_address', destructive: true },
  { label: '【场景识别】- 检测是否有未识别的照片', value: 'resetFailedCategories' },
  { label: '【场景识别】- 清空识别结果，然后重新识别所有照片', value: 'resetFileCategories', destructive: true },
  { label: '【场景相册】- 清除手动设置的封面（让场景恢复自动变化封面）', value: 'adminDeleteUserSetCover_classify', destructive: true },
  { label: '【工具】- 清理已删除图库的数据（清理已删除图库的文件数据）', value: 'cleanNoGalleryData', destructive: true },
  { label: '【工具】- 清理缓存文件（清理在外部删除的文件的数据及缩略图）', value: 'cleanGarbageData', destructive: true },
  { label: '【工具】- 清空后台任务', value: 'clearAllJobs', destructive: true },
  { label: '【高清预览图】- 检测是否有生成高清预览图失败的照片', value: 'resetFailedImageHdThumb' },
  { label: '【高清预览图】- 重新生成全部照片的高清预览图（仅用于高清预览图文件被删除的情况）', value: 'resetImageHdThumb', destructive: true },
  { label: '【视频转码】- 检测是否有生成转码文件失败的视频', value: 'resetFailedVideoTranscode' },
  { label: '【视频转码】- 重新生成全部视频的转码文件（仅用于转码文件被删除的情况）', value: 'resetVideoTranscode', destructive: true },
  { label: '【文本识别】- 检测是否有未识别的照片', value: 'resetFailedOCR' },
  { label: '【文本识别】- 清空识别结果，然后重新识别所有照片', value: 'resetFileOcr', destructive: true },
  { label: '【CLIP识别】- 检测是否有未识别的照片', value: 'resetFailedClip' },
  { label: '【CLIP识别】- 清空识别结果，然后重新识别所有照片', value: 'resetFileClip', destructive: true },
  { label: '【相似照片识别】- 检测是否有未识别的文件', value: 'resetFailedSimilar' },
  { label: '【相似照片识别】- 清空检测结果，然后重新检测所有文件', value: 'resetFileSimilar', destructive: true },
  { label: '【人物相册】- 检测是否有未识别的照片', value: 'resetFailedFaceDescriptor' },
  { label: '【人物相册】- 刷新人物封面（当人物封面不显示时可执行）', value: 'genPeopleCover' },
  { label: '【人物相册】- 重建所有人物相册（重新生成人物相册）', value: 'reGenPeople', destructive: true },
  { label: '【人物相册】- 重建特征对比数据及人物相册（重新人脸特征对比 + 重新生成人物相册）', value: 'reGenPeopleBase', destructive: true },
  { label: '【人物相册】- 重建全部数据（重新识别人脸 + 重新人脸特征对比 + 重新生成人物相册）', value: 'resetAllFaceDescriptor', destructive: true },
] as const;

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
  'resetFailedSimilar',
  'scanFiles',
  'scanFilesForUpload',
  'scanLivePhotos',
  'updateAllFilesGalleryIds',
  'videoTranscode',
]);

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
 * Deletes one duplicate file record through the gallery cleanup endpoint.
 * @param options Authenticated API client options.
 * @param payload Duplicate file id, md5 and gallery ids required by the server.
 */
export const deleteAdminDuplicateFile = (
  options: ApiClientOptions,
  payload: AdminDuplicateFileDeletePayload,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gallery/deleteDuplicateFiles', {
    body: {
      MD5: payload.md5,
      galleryIds: payload.galleryIds,
      id: payload.id,
    },
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
 * Fetches files marked abnormal because the original disk file is missing.
 * @param options Authenticated API client options.
 * @returns Grouped abnormal file rows and summary count.
 */
export const fetchAdminDeletedFiles = async (
  options: ApiClientOptions,
): Promise<AdminDeletedFilesResult> => {
  const payload = await createApiClient(options).request<unknown>('/gallery/findDeletedFiles');

  return normalizeDeletedFilesResult(payload);
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
 * Fetches every raw system config record exposed by MT Photos.
 * @param options Authenticated API client options.
 * @returns Normalized config records.
 */
export const fetchAdminSystemConfigs = async (
  options: ApiClientOptions,
): Promise<AdminSystemConfigRecord[]> => {
  const payload = await createApiClient(options).request<unknown>('/system-config');

  return normalizeSystemConfigRecords(payload);
};

/**
 * Fetches the compact system-config info payload used by the demo system page.
 * @param options Authenticated API client options.
 * @returns Normalized system config info.
 */
export const fetchAdminSystemConfigInfo = async (
  options: ApiClientOptions,
): Promise<AdminSystemConfigInfo> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/configInfo', {
    method: 'POST',
  });

  return normalizeSystemConfigInfo(payload);
};

/**
 * Persists one system config key using the generic MT Photos system-config endpoint.
 * @param options Authenticated API client options.
 * @param key Config key.
 * @param value Config value stored by the server.
 */
export const updateAdminSystemConfig = (
  options: ApiClientOptions,
  key: string,
  value: string,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config', {
    body: { key, value },
    method: 'PATCH',
  });
};

/**
 * Persists multiple system config keys in one request.
 * @param options Authenticated API client options.
 * @param list Config entries.
 */
export const updateAdminSystemConfigs = (
  options: ApiClientOptions,
  list: Array<{ key: string; value: string }>,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/patchMulti', {
    body: { list },
    method: 'POST',
  });
};

/**
 * Updates the backend task CPU thread limit.
 * @param options Authenticated API client options.
 * @param value Maximum number of task worker threads.
 */
export const updateAdminTaskMaxThread = (
  options: ApiClientOptions,
  value: number,
): Promise<unknown> => {
  return updateAdminSystemConfig(options, ADMIN_SYSTEM_CONFIG_KEYS.taskMaxThread, String(value));
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
 * Fetches active backend jobs and the shared sub-task progress payload.
 * @param options Authenticated API client options.
 * @returns Active task overview for demo-style task progress.
 */
export const fetchAdminActiveTaskOverview = async (
  options: ApiClientOptions,
): Promise<AdminActiveTaskOverview> => {
  const payload = await createApiClient(options).request<unknown>('/fileTask/jobs/active');

  return normalizeActiveTaskOverview(payload);
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
 * Checks whether the backend task queue is paused.
 * @param options Authenticated API client options.
 */
export const fetchAdminTaskQueuePaused = async (options: ApiClientOptions): Promise<boolean> => {
  const payload = await createApiClient(options).request<unknown>('/fileTask/jobs/isPaused');

  return normalizeBoolean(payload);
};

/**
 * Creates one maintenance task through the demo system maintenance endpoint.
 * @param options Authenticated API client options.
 * @param type Task type.
 * @param info Optional task info.
 */
export const createAdminMaintenanceTask = (
  options: ApiClientOptions,
  type: string,
  info?: Record<string, unknown>,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/fileTask/addTask', {
    body: { force: true, info, type },
    method: 'POST',
  });
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
 * Resolves an admin user id to the username shown in cross-platform admin UI.
 * @param users Loaded admin users.
 * @param userId User id from server records.
 * @param fallback Text shown when the user cannot be found.
 */
export const formatAdminUserName = (
  users: AdminUserRecord[],
  userId?: number | string,
  fallback = '-',
): string => {
  if (userId === undefined || userId === null || userId === '') {
    return fallback;
  }

  const matchedUser = users.find((user) => String(user.id) === String(userId));

  return matchedUser?.username || fallback;
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

/**
 * Triggers a database backup on the MT Photos server.
 * @param options Authenticated API client options.
 * @returns Backup file path when returned by the server.
 */
export const createAdminDatabaseBackup = async (options: ApiClientOptions): Promise<string | undefined> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/pgDump', {
    method: 'POST',
  });
  const record = unwrapRecord(payload);
  const distPath = readString(record, ['distPath', 'path', 'filePath']);

  return distPath || undefined;
};

/**
 * Starts a database index rebuild.
 * @param options Authenticated API client options.
 */
export const rebuildAdminDatabaseIndex = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/dbReIndex', { method: 'POST' });
};

/**
 * Fetches database index rebuild progress.
 * @param options Authenticated API client options.
 */
export const fetchAdminDatabaseReindexInfo = async (
  options: ApiClientOptions,
): Promise<AdminDatabaseReindexInfo> => {
  return normalizeDatabaseReindexInfo(
    await createApiClient(options).request<unknown>('/system-config/dbReIndexInfo', {
      method: 'POST',
    }),
  );
};

/**
 * Rebuilds indexes that depend on database timezone configuration.
 * @param options Authenticated API client options.
 */
export const rebuildAdminDatabaseTimezoneIndex = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/dbReIndexForTZ', { method: 'POST' });
};

/**
 * Fetches server logs kept in memory.
 * @param options Authenticated API client options.
 * @returns Normalized server logs.
 */
export const fetchAdminSystemLogs = async (options: ApiClientOptions): Promise<AdminLogRecord[]> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/getLogs', {
    method: 'POST',
  });

  return normalizeLogRecords(payload);
};

/**
 * Fetches the available libheif runtime versions as compact display rows.
 * @param options Authenticated API client options.
 */
export const fetchAdminLibheifVersions = async (options: ApiClientOptions): Promise<AdminInfoItem[]> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/getLibheifVersion', {
    method: 'POST',
  });

  return normalizeInfoItems(payload);
};

/**
 * Switches the server libheif runtime version.
 * @param options Authenticated API client options.
 * @param fileName Version file name returned by the server.
 */
export const updateAdminLibheifVersion = (
  options: ApiClientOptions,
  fileName: string,
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/libheifVersion', {
    body: { fileName },
    method: 'POST',
  });
};

/**
 * Clears server logs kept in memory.
 * @param options Authenticated API client options.
 */
export const clearAdminSystemLogs = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/clearLogs', { method: 'POST' });
};

/**
 * Tests an OCR or facial-recognition API configuration.
 * @param options Authenticated API client options.
 * @param payload Test payload.
 */
export const testAdminRecognitionApi = async (
  options: ApiClientOptions,
  payload: AdminTestApiPayload,
): Promise<AdminTestApiResult> => {
  return normalizeTestApiResult(
    await createApiClient(options).request<unknown>('/system-config/test/ocrApi', {
      body: { ...payload },
      method: 'POST',
    }),
  );
};

/**
 * Prepares the CLIP database table on the server.
 * @param options Authenticated API client options.
 */
export const prepareAdminClipTable = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/db/prepareCLIP', { method: 'POST' });
};

/**
 * Prepares the facial-recognition V2 database table on the server.
 * @param options Authenticated API client options.
 */
export const prepareAdminFaceRegV2Table = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/db/prepareFaceRegV2', { method: 'POST' });
};

/**
 * Switches the facial-recognition implementation version.
 * @param options Authenticated API client options.
 * @param open Whether to use V2.
 */
export const switchAdminFaceRegV2 = (options: ApiClientOptions, open: boolean): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/system-config/switchUseFaceRegV2', {
    body: { open },
    method: 'POST',
  });
};

/**
 * Fetches the offline license machine id.
 * @param options Authenticated API client options.
 */
export const fetchAdminOfflineId = async (options: ApiClientOptions): Promise<string> => {
  const payload = await createApiClient(options).request<unknown>('/system-config/offlineID', {
    method: 'POST',
  });
  const record = unwrapRecord(payload);

  return readString(record, ['oid', 'offlineId', 'id']);
};

/**
 * Binds an online or offline license key.
 * @param options Authenticated API client options.
 * @param license License text.
 * @param type Optional license mode.
 */
export const bindAdminLicense = (
  options: ApiClientOptions,
  license: string,
  type?: 'offline',
): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gateway/bindLicense', {
    body: type ? { license, type } : { license },
    method: 'POST',
  });
};

/**
 * Requests the server to verify the current license online.
 * @param options Authenticated API client options.
 */
export const verifyAdminLicenseOnline = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/gateway/verifyAuthOnline', { method: 'POST' });
};

/**
 * Starts the server-side manual upgrade flow.
 * @param options Authenticated API client options.
 */
export const runAdminManualUpgrade = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/install/upgrade', { method: 'POST' });
};

/**
 * Requests a server reload after maintenance or upgrade operations.
 * @param options Authenticated API client options.
 */
export const reloadAdminServer = (options: ApiClientOptions): Promise<unknown> => {
  return createApiClient(options).request<unknown>('/install/reload', { method: 'POST' });
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
  const operatorId = readStringOrNumber(record, ['userId', 'operatorId', 'operator_id', 'user_id'])
    ?? readStringOrNumber(userRecord, ['id', 'userId', 'uid'])
    ?? readStringOrNumber(record, ['user']);
  const operatorName = readString(record, ['username', 'operator', 'userName', 'operatorName'])
    || readString(userRecord, ['username', 'name', 'nickname']);

  return {
    deleteTime: readString(record, ['deleteTime', 'created_at', 'createdAt', 'time']),
    deleteType: readString(record, ['deleteType', 'type', 'action']) || '-',
    fileName: readString(record, ['fileName', 'name']) || '-',
    filePath: readString(record, ['filePath', 'path']) || '-',
    id: readStringOrNumber(record, ['id', 'logId']) ?? index + 1,
    operator: operatorName || (operatorId !== undefined ? `用户 ${operatorId}` : '-'),
    operatorId,
  };
};

const normalizeDeletedFilesResult = (payload: unknown): AdminDeletedFilesResult => {
  const record = unwrapRecord(payload);
  const groups = normalizeListPayload(record.result ?? record.list ?? payload).map(normalizeDeletedFileGroup);

  return {
    duplicateFiles: toRecord(record.duplicateFiles),
    groups,
    totalCount: readNumber(record, ['totalCount', 'count', 'total']) || countDeletedFileRows(groups),
    ver: readOptionalNumber(record, ['ver', 'version']),
  };
};

const normalizeDeletedFileGroup = (item: unknown): AdminDeletedFileGroup => {
  const record = toRecord(item);

  return {
    addr: readString(record, ['addr', 'address']) || undefined,
    day: readString(record, ['day', 'date']) || '未知日期',
    list: normalizeListPayload(record.list ?? record.files).map(normalizeDeletedFile),
  };
};

const normalizeDeletedFile = (item: unknown): AdminDeletedFileRecord => {
  const record = toRecord(item);

  return {
    fileName: readString(record, ['fileName', 'name']) || '-',
    filePath: readString(record, ['filePath', 'path']) || '-',
    id: readNumber(record, ['id']),
    md5: readString(record, ['MD5', 'md5']),
  };
};

const countDeletedFileRows = (groups: AdminDeletedFileGroup[]): number => {
  return groups.reduce((total, group) => total + group.list.length, 0);
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

const normalizeSystemConfigRecords = (payload: unknown): AdminSystemConfigRecord[] => {
  return normalizeListPayload(payload).map((item) => {
    const record = toRecord(item);

    return {
      description: readString(record, ['description', 'desc']) || undefined,
      key: readString(record, ['key']),
      type: readString(record, ['type']) || undefined,
      updatedAt: readString(record, ['updated_at', 'updatedAt']) || undefined,
      value: readConfigPrimitiveValue(record.value),
    };
  }).filter((item) => item.key);
};

const normalizeSystemConfigInfo = (payload: unknown): AdminSystemConfigInfo => {
  const record = unwrapRecord(payload);
  const cpuThreadNum = readOptionalNumber(record, ['cpuThreadNum', 'cpu_thread_num']) ?? 1;
  const taskMaxThreadNum = readOptionalNumber(record, ['taskMaxThreadNum', 'task_max_thread_num']) ?? cpuThreadNum;

  return {
    cacheVer: readOptionalNumber(record, ['cacheVer', 'cacheVersion']),
    categoryOneId: readOptionalNumber(record, ['categoryOneId']),
    cpuThreadNum,
    dbTZ: readString(record, ['dbTZ', 'dbTz']),
    faceRegVer: readString(record, ['faceRegVer', 'faceApiVersion']),
    items: normalizeInfoItems(payload),
    taskMaxThreadNum,
  };
};

const normalizeTaskList = (payload: unknown): AdminTask[] => {
  const rootRecord = unwrapRecord(payload);
  const sharedStage = normalizeTaskStage(rootRecord.subData);

  return normalizeListPayload(payload).map((item, index) => normalizeTask(item, index, sharedStage));
};

const normalizeActiveTaskOverview = (payload: unknown): AdminActiveTaskOverview => {
  const record = unwrapRecord(payload);
  const stage = normalizeTaskStage(record.subData);

  return {
    stage,
    tasks: normalizeListPayload(payload).map((item, index) => normalizeTask(item, index, stage)),
    thumbTaskMaxNum: readOptionalNumber(record, ['THUMB_TASK_MAX_NUM', 'thumbTaskMaxNum']),
  };
};

/**
 * Normalizes Bull queue jobs into the task model consumed by Web, desktop and mobile UI.
 */
const normalizeTask = (item: unknown, index: number, sharedStage?: AdminTaskStage): AdminTask => {
  const record = toRecord(item);
  const dataRecord = toRecord(record.data);
  const taskType = readString(record, ['name', 'jobName', 'taskName', 'type']);
  const progressNumbers = readTaskProgressNumbers(record, dataRecord);

  return {
    dataType: readString(dataRecord, ['type', 'taskType', 'jobType']),
    detail: readString(record, ['failedReason', 'error', 'message', 'msg']),
    galleryId: readStringOrNumber(dataRecord, ['galleryId', 'gallery_id', 'id']),
    id: readStringOrNumber(record, ['id', 'jobId', 'taskId', 'name']) ?? index + 1,
    name: formatTaskDisplayName(taskType) || `任务 ${index + 1}`,
    progressLabel: formatTaskProgress(record, dataRecord),
    progressPercent: readTaskProgressPercent(record, dataRecord),
    progressTotal: progressNumbers.total,
    progressValue: progressNumbers.value,
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

const normalizeDatabaseReindexInfo = (payload: unknown): AdminDatabaseReindexInfo => {
  const record = unwrapRecord(payload);
  const current = readNumber(record, ['i', 'current', 'progress', 'value']);
  const total = readOptionalNumber(record, ['len', 'total', 'totalCount']) ?? (current > 100 ? current : 100);

  return {
    current,
    status: readString(record, ['status', 'message']) || undefined,
    total,
  };
};

const normalizeLogRecords = (payload: unknown): AdminLogRecord[] => {
  return normalizeListPayload(payload).map((item) => {
    const record = toRecord(item);

    return {
      level: readString(record, ['level', 'type']) || 'info',
      message: readString(record, ['message', 'msg', 'text']) || formatInfoValue(item),
      timestamp: readString(record, ['timestamp', 'time', 'createdAt']) || undefined,
    };
  });
};

const normalizeTestApiResult = (payload: unknown): AdminTestApiResult => {
  const record = unwrapRecord(payload);

  return {
    err: readString(record, ['err', 'msg', 'message']) || undefined,
    pass: normalizeBoolean(record.pass),
    response: record.response,
  };
};

const normalizeSystemConfigList = (payload: unknown): Array<{ key: string; value: string }> => {
  return normalizeListPayload(payload).map((item) => {
    const record = toRecord(item);

    return {
      key: readString(record, ['key']),
      value: readConfigPrimitiveValue(record.value),
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

  const exactLabel = ADMIN_TASK_TYPE_LABELS[value.trim()];

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

const readTaskProgressNumbers = (
  record: UnknownRecord,
  dataRecord: UnknownRecord,
): { total?: number; value?: number } => {
  const barRecord = toRecord(dataRecord.bar ?? record.bar);
  const value = readOptionalNumber(barRecord, ['value', 'processed', 'processedCount'])
    ?? readOptionalNumber(record, ['processed', 'processedCount']);
  const total = readOptionalNumber(barRecord, ['total', 'totalCount'])
    ?? readOptionalNumber(record, ['total', 'totalCount']);

  return { total, value };
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

const readConfigPrimitiveValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (value === null || value === undefined) {
    return '';
  }

  return JSON.stringify(value);
};

const normalizeBoolean = (payload: unknown): boolean => {
  if (typeof payload === 'boolean') {
    return payload;
  }

  const record = unwrapRecord(payload);
  const value = record.value ?? record.paused ?? record.isPaused ?? record.success ?? payload;

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value > 0;
  }

  if (typeof value === 'string') {
    return ['1', 'on', 'true', 'yes'].includes(value.toLowerCase());
  }

  return false;
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
