import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { FolderDirectory } from '@kwphoto/core';

export type MobileLocalCacheResourceKind =
  | 'directory'
  | 'folder-cover'
  | 'file-thumbnail'
  | 'file-hd-thumbnail'
  | 'image-preview'
  | 'video-preview';

export interface MobileLocalCacheFolderRef {
  folderId?: number;
  folderKey: string;
  folderName: string;
  folderPath: string;
  scope: string;
}

export interface MobileCacheStats {
  approximateSize: number;
  coverCount: number;
  directoryCount: number;
  latestCachedAt?: number;
  mediaCount: number;
  hdThumbnailCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  thumbnailCount: number;
}

export interface MobileCacheFolderSummary {
  coverCount: number;
  directoryCount: number;
  folderId?: number;
  folderKey: string;
  folderName: string;
  folderPath: string;
  folderScopeKey: string;
  itemCount: number;
  latestCachedAt?: number;
  mediaCount: number;
  hdThumbnailCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  scope: string;
  size: number;
  thumbnailCount: number;
}

interface MobileLocalCacheRecordMeta {
  createdAt: number;
  directoryStorageKey?: string;
  fileId?: number;
  fileUri?: string;
  folderId?: number;
  folderKey: string;
  folderName: string;
  folderPath: string;
  folderScopeKey: string;
  key: string;
  kind: MobileLocalCacheResourceKind;
  md5?: string;
  scope: string;
  size: number;
  updatedAt: number;
  url?: string;
  variant?: string;
}

interface ReadCachedMobileDirectoryParams {
  folderId?: number;
  scope: string;
}

interface WriteCachedMobileDirectoryParams {
  directory: FolderDirectory;
  folder: MobileLocalCacheFolderRef;
}

interface CacheMobileMediaResourceParams {
  fileId?: number;
  folder: MobileLocalCacheFolderRef;
  kind: Exclude<MobileLocalCacheResourceKind, 'directory'>;
  md5?: string;
  url: string;
  variant?: string;
}

interface ReadCachedMobileMediaParams extends Omit<CacheMobileMediaResourceParams, 'url'> {
  url?: string;
}

type MobileCacheChangeListener = () => void;

const MOBILE_CACHE_INDEX_KEY = 'kwphoto.mobile.local-cache.index.v1';
const MOBILE_CACHE_DATA_PREFIX = 'kwphoto.mobile.local-cache.data.v1:';
const MOBILE_CACHE_DIRECTORY_NAME = 'kwphoto-local-cache';
const LEGACY_DIRECTORY_CACHE_INDEX_KEY = 'kwphoto.mobile.directory-cache.index.v1';
const LEGACY_DIRECTORY_CACHE_PREFIX = 'kwphoto.mobile.directory-cache.v1:';
const MEDIA_CACHE_FAILURE_TTL = 60_000;

const pendingMediaRequests = new Map<string, Promise<string | undefined>>();
const mediaFailureMap = new Map<string, number>();
const cacheChangeListeners = new Set<MobileCacheChangeListener>();
let cacheIndexMutationQueue: Promise<void> = Promise.resolve();
let cacheInvalidationRevision = 0;

/**
 * Subscribes to mobile cache index changes so management screens can refresh statistics as background writes finish.
 */
export const subscribeMobileCacheChanges = (listener: MobileCacheChangeListener): (() => void) => {
  cacheChangeListeners.add(listener);

  return () => {
    cacheChangeListeners.delete(listener);
  };
};

/**
 * Creates the same account-level cache scope used by the Web workspace.
 */
export const createMobileLocalCacheScope = ({
  serverUrl,
  userId,
  username,
}: {
  serverUrl: string;
  userId?: number | string;
  username?: string;
}): string => {
  const accountKey = userId === undefined ? username || 'guest' : String(userId);

  return `${normalizeServerUrl(serverUrl)}::${accountKey}`;
};

/**
 * Builds the folder identity shared by directory, cover and media records.
 */
export const createMobileLocalCacheFolderRef = ({
  directory,
  folderId,
  folderName,
  folderPath,
  scope,
}: {
  directory?: FolderDirectory;
  folderId?: number;
  folderName?: string;
  folderPath?: string;
  scope: string;
}): MobileLocalCacheFolderRef => {
  const resolvedFolderId = folderId ?? directory?.folderId;
  const folderKey = resolvedFolderId && resolvedFolderId > 0 ? String(resolvedFolderId) : 'root';

  return {
    folderId: resolvedFolderId,
    folderKey,
    folderName: folderName || getDirectoryDisplayName(directory) || '全部',
    folderPath: folderPath || directory?.path || '根目录',
    scope,
  };
};

/**
 * Reads one cached directory snapshot for the current account scope.
 */
export const readCachedMobileDirectory = async ({
  folderId,
  scope,
}: ReadCachedMobileDirectoryParams): Promise<FolderDirectory | undefined> => {
  const key = createDirectoryCacheKey(scope, folderId);
  const record = await readCacheRecordMeta(key);

  if (!record?.directoryStorageKey) {
    return undefined;
  }

  const directory = parseJson<FolderDirectory>(await AsyncStorage.getItem(record.directoryStorageKey));

  if (!directory) {
    await deleteMobileLocalCacheRecord(key);
    return undefined;
  }

  return directory;
};

/**
 * Writes one directory snapshot without blocking the visible folder refresh.
 */
export const writeCachedMobileDirectory = async ({
  directory,
  folder,
}: WriteCachedMobileDirectoryParams): Promise<void> => {
  const now = Date.now();
  const key = createDirectoryCacheKey(folder.scope, folder.folderId);
  const directoryStorageKey = `${MOBILE_CACHE_DATA_PREFIX}${key}`;
  const serializedDirectory = JSON.stringify(directory);

  await AsyncStorage.setItem(directoryStorageKey, serializedDirectory);
  await upsertCacheRecordMeta({
    createdAt: now,
    directoryStorageKey,
    folderId: folder.folderId,
    folderKey: folder.folderKey,
    folderName: folder.folderName,
    folderPath: folder.folderPath,
    folderScopeKey: createFolderScopeKey(folder.scope, folder.folderKey),
    key,
    kind: 'directory',
    scope: folder.scope,
    size: serializedDirectory.length,
    updatedAt: now,
  });
};

/**
 * Reads a cached media file URI when the downloaded file still exists.
 */
export const readCachedMobileMediaUri = async (
  params: ReadCachedMobileMediaParams,
): Promise<string | undefined> => {
  const key = createMediaCacheKey(params);
  const record = await readCacheRecordMeta(key);

  if (!record?.fileUri) {
    return undefined;
  }

  if (doesFileExist(record.fileUri)) {
    return record.fileUri;
  }

  await deleteMobileLocalCacheRecord(key);
  return undefined;
};

/**
 * Downloads and stores one media resource under the Web-compatible resource kind.
 */
export const cacheMobileMediaResourceFromUrl = async (
  params: CacheMobileMediaResourceParams,
): Promise<string | undefined> => {
  const key = createMediaCacheKey(params);
  const cachedUri = await readCachedMobileMediaUri(params);

  if (cachedUri) {
    return cachedUri;
  }

  if (isRecentMediaCacheFailure(key)) {
    return undefined;
  }

  const pendingRequest = pendingMediaRequests.get(key);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = downloadAndWriteMediaCache(params, key, cacheInvalidationRevision);
  pendingMediaRequests.set(key, request);

  try {
    return await request;
  } finally {
    pendingMediaRequests.delete(key);
  }
};

/**
 * Reads the current scope cache summary for the settings page.
 */
export const readMobileCacheStats = async (scope?: string): Promise<MobileCacheStats> => {
  const records = (await readCacheRecordMetas()).filter((record) => !scope || record.scope === scope);

  return records.reduce<MobileCacheStats>(
    (summary, record) => {
      summary.approximateSize += record.size;
      summary.latestCachedAt = Math.max(summary.latestCachedAt ?? 0, record.updatedAt);

      if (record.kind === 'directory') {
        summary.directoryCount += 1;
        return summary;
      }

      summary.mediaCount += 1;
      accumulateCacheResourceCounts(summary, record);
      return summary;
    },
    createEmptyCacheStats(),
  );
};

/**
 * Lists cache usage grouped by folder, matching the Web cache management panel.
 * @param scope Optional account/server cache scope.
 * @returns Folder-level cache summaries.
 */
export const listMobileCacheFolders = async (scope?: string): Promise<MobileCacheFolderSummary[]> => {
  const records = (await readCacheRecordMetas()).filter((record) => !scope || record.scope === scope);
  const folderMap = new Map<string, MobileCacheFolderSummary>();

  records.forEach((record) => {
    const summary = folderMap.get(record.folderScopeKey) ?? createEmptyCacheFolderSummary(record);

    summary.itemCount += 1;
    summary.latestCachedAt = Math.max(summary.latestCachedAt ?? 0, record.updatedAt);
    summary.size += record.size;

    if (record.kind === 'directory') {
      summary.directoryCount += 1;
    } else {
      summary.mediaCount += 1;
      accumulateCacheResourceCounts(summary, record);
    }

    folderMap.set(record.folderScopeKey, summary);
  });

  return Array.from(folderMap.values()).sort((left, right) => {
    return left.folderName.localeCompare(right.folderName, 'zh-Hans-CN');
  });
};

/**
 * Deletes every cache record under the provided folder group keys.
 * @param folderScopeKeys Folder group keys from `listMobileCacheFolders`.
 */
export const deleteMobileCacheFolderGroups = async (folderScopeKeys: string[]): Promise<void> => {
  const targetKeys = new Set(folderScopeKeys);

  if (targetKeys.size === 0) {
    return;
  }

  cacheInvalidationRevision += 1;

  await enqueueCacheIndexMutation(async () => {
    const records = await readCacheRecordMetasRaw();
    const recordsToDelete = records.filter((record) => targetKeys.has(record.folderScopeKey));
    const recordsToKeep = records.filter((record) => !targetKeys.has(record.folderScopeKey));

    await Promise.all(recordsToDelete.map(deleteCachePayload));
    await writeCacheRecordMetasRaw(recordsToKeep);
  });
};

/**
 * Clears cache records for one account scope, or all mobile cache records.
 */
export const clearMobileLocalCache = async (scope?: string): Promise<void> => {
  cacheInvalidationRevision += 1;
  pendingMediaRequests.clear();
  mediaFailureMap.clear();

  await enqueueCacheIndexMutation(async () => {
    const records = await readCacheRecordMetasRaw();
    const recordsToDelete = records.filter((record) => !scope || record.scope === scope);
    const recordsToKeep = records.filter((record) => scope && record.scope !== scope);

    await Promise.all(recordsToDelete.map(deleteCachePayload));
    await writeCacheRecordMetasRaw(recordsToKeep);
  });

  await clearLegacyDirectoryCache();
};

/**
 * Downloads the media file and writes its metadata only if no clear happened mid-flight.
 */
const downloadAndWriteMediaCache = async (
  params: CacheMobileMediaResourceParams,
  key: string,
  startedRevision: number,
): Promise<string | undefined> => {
  const cacheDirectory = ensureMobileCacheDirectory();
  const targetFile = new File(cacheDirectory, createMediaFileName(key, params.kind));

  try {
    if (targetFile.exists) {
      targetFile.delete();
    }

    const downloadedFile = await File.downloadFileAsync(params.url, targetFile, { idempotent: true });
    const size = getFileSize(downloadedFile);

    if (size <= 0) {
      deleteFileUri(downloadedFile.uri);
      return undefined;
    }

    if (startedRevision !== cacheInvalidationRevision) {
      deleteFileUri(downloadedFile.uri);
      return undefined;
    }

    const now = Date.now();
    const folderScopeKey = createFolderScopeKey(params.folder.scope, params.folder.folderKey);

    await upsertCacheRecordMeta({
      createdAt: now,
      fileId: params.fileId,
      fileUri: downloadedFile.uri,
      folderId: params.folder.folderId,
      folderKey: params.folder.folderKey,
      folderName: params.folder.folderName,
      folderPath: params.folder.folderPath,
      folderScopeKey,
      key,
      kind: params.kind,
      md5: params.md5,
      scope: params.folder.scope,
      size,
      updatedAt: now,
      url: params.url,
      variant: params.variant,
    });
    mediaFailureMap.delete(key);
    return downloadedFile.uri;
  } catch {
    deleteFileUri(targetFile.uri);
    mediaFailureMap.set(key, Date.now());
    return undefined;
  }
};

const createEmptyCacheStats = (): MobileCacheStats => ({
  approximateSize: 0,
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
});

const createEmptyCacheFolderSummary = (record: MobileLocalCacheRecordMeta): MobileCacheFolderSummary => ({
  coverCount: 0,
  directoryCount: 0,
  folderId: record.folderId,
  folderKey: record.folderKey,
  folderName: record.folderName,
  folderPath: record.folderPath,
  folderScopeKey: record.folderScopeKey,
  hdThumbnailCount: 0,
  itemCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  scope: record.scope,
  size: 0,
  thumbnailCount: 0,
});

const readCacheRecordMeta = async (key: string): Promise<MobileLocalCacheRecordMeta | undefined> => {
  return (await readCacheRecordMetas()).find((record) => record.key === key);
};

const readCacheRecordMetas = async (): Promise<MobileLocalCacheRecordMeta[]> => {
  await cacheIndexMutationQueue.catch(() => undefined);

  return readCacheRecordMetasRaw();
};

const readCacheRecordMetasRaw = async (): Promise<MobileLocalCacheRecordMeta[]> => {
  return parseJson<MobileLocalCacheRecordMeta[]>(await AsyncStorage.getItem(MOBILE_CACHE_INDEX_KEY)) ?? [];
};

const writeCacheRecordMetasRaw = async (records: MobileLocalCacheRecordMeta[]): Promise<void> => {
  await AsyncStorage.setItem(MOBILE_CACHE_INDEX_KEY, JSON.stringify(records));
  notifyMobileCacheChanged();
};

const enqueueCacheIndexMutation = <TResult,>(mutation: () => Promise<TResult>): Promise<TResult> => {
  const queuedMutation = cacheIndexMutationQueue.then(mutation, mutation);

  cacheIndexMutationQueue = queuedMutation.then(
    () => undefined,
    () => undefined,
  );

  return queuedMutation;
};

const notifyMobileCacheChanged = (): void => {
  cacheChangeListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Cache listeners are UI refresh hooks and must not break cache writes.
    }
  });
};

const upsertCacheRecordMeta = async (record: MobileLocalCacheRecordMeta): Promise<void> => {
  await enqueueCacheIndexMutation(async () => {
    const records = await readCacheRecordMetasRaw();
    const previousRecord = records.find((item) => item.key === record.key);
    const nextRecord = previousRecord
      ? { ...record, createdAt: previousRecord.createdAt }
      : record;
    const nextRecords = [
      ...records.filter((item) => item.key !== record.key),
      nextRecord,
    ];

    await writeCacheRecordMetasRaw(nextRecords);
  });
};

const deleteMobileLocalCacheRecord = async (key: string): Promise<void> => {
  await enqueueCacheIndexMutation(async () => {
    const records = await readCacheRecordMetasRaw();
    const record = records.find((item) => item.key === key);

    if (record) {
      await deleteCachePayload(record);
    }

    await writeCacheRecordMetasRaw(records.filter((item) => item.key !== key));
  });
};

const deleteCachePayload = async (record: MobileLocalCacheRecordMeta): Promise<void> => {
  if (record.directoryStorageKey) {
    await AsyncStorage.removeItem(record.directoryStorageKey);
  }

  deleteFileUri(record.fileUri);
};

const clearLegacyDirectoryCache = async (): Promise<void> => {
  const legacyKeys = parseJson<string[]>(await AsyncStorage.getItem(LEGACY_DIRECTORY_CACHE_INDEX_KEY)) ?? [];
  const safeLegacyKeys = legacyKeys.filter((key) => key.startsWith(LEGACY_DIRECTORY_CACHE_PREFIX));

  await AsyncStorage.multiRemove([...safeLegacyKeys, LEGACY_DIRECTORY_CACHE_INDEX_KEY]);
};

const ensureMobileCacheDirectory = (): Directory => {
  const directory = new Directory(Paths.cache, MOBILE_CACHE_DIRECTORY_NAME);

  if (!directory.exists) {
    directory.create({ idempotent: true, intermediates: true });
  }

  return directory;
};

const doesFileExist = (uri: string): boolean => {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
};

const deleteFileUri = (uri?: string): void => {
  if (!uri) {
    return;
  }

  try {
    const file = new File(uri);

    if (file.exists) {
      file.delete();
    }
  } catch {
    // Cache cleanup should not block user-facing settings actions.
  }
};

const getFileSize = (file: { info?: () => { size?: number | null }; size?: number }): number => {
  try {
    return file.info?.().size ?? file.size ?? 0;
  } catch {
    return file.size ?? 0;
  }
};

const createDirectoryCacheKey = (scope: string, folderId?: number): string => {
  return `${scope}::directory::${folderId && folderId > 0 ? folderId : 'root'}`;
};

const createMediaCacheKey = ({
  fileId,
  folder,
  kind,
  md5,
  url,
  variant = 'default',
}: ReadCachedMobileMediaParams): string => {
  const identity = createMediaCacheIdentity({ fileId, md5, url });

  return `${folder.scope}::media::${folder.folderKey}::${kind}::${variant}::${identity}`;
};

/**
 * Versions file caches by content identity so edited files stop hitting stale resources.
 */
const createMediaCacheIdentity = ({
  fileId,
  md5,
  url,
}: {
  fileId?: number;
  md5?: string;
  url?: string;
}): string => {
  const fileIdentity = fileId && fileId > 0 ? `file:${fileId}` : undefined;
  const contentIdentity = md5 || url;

  if (fileIdentity && contentIdentity) {
    return `${fileIdentity}:${contentIdentity}`;
  }

  return fileIdentity || contentIdentity || 'unknown';
};

const accumulateCacheResourceCounts = (
  summary: Pick<MobileCacheStats, 'coverCount' | 'hdThumbnailCount' | 'originalImageCount' | 'originalVideoCount' | 'thumbnailCount'>,
  record: MobileLocalCacheRecordMeta,
): void => {
  const category = getCacheResourceCategory(record);

  summary.coverCount += category === 'cover' ? 1 : 0;
  summary.hdThumbnailCount += category === 'hd-thumbnail' ? 1 : 0;
  summary.originalImageCount += category === 'original-image' ? 1 : 0;
  summary.originalVideoCount += category === 'original-video' ? 1 : 0;
  summary.thumbnailCount += category === 'thumbnail' ? 1 : 0;
};

/**
 * Classifies newer split cache records while keeping old variant-based records readable in statistics.
 */
const getCacheResourceCategory = (
  record: MobileLocalCacheRecordMeta,
): 'cover' | 'hd-thumbnail' | 'original-image' | 'original-video' | 'thumbnail' | 'unknown' => {
  if (record.kind === 'folder-cover') {
    return 'cover';
  }

  if (
    record.kind === 'file-hd-thumbnail' ||
    (record.kind === 'file-thumbnail' && record.variant === 'hd') ||
    (record.kind === 'image-preview' && record.variant === 'hd')
  ) {
    return 'hd-thumbnail';
  }

  if (record.kind === 'file-thumbnail') {
    return 'thumbnail';
  }

  if (record.kind === 'image-preview') {
    return 'original-image';
  }

  if (record.kind === 'video-preview') {
    return 'original-video';
  }

  return 'unknown';
};

const createFolderScopeKey = (scope: string, folderKey: string): string => {
  return `${scope}::folder::${folderKey}`;
};

const createMediaFileName = (key: string, kind: MobileLocalCacheResourceKind): string => {
  return `${kind}-${hashString(key)}.${getMediaFileExtension(kind)}`;
};

const getMediaFileExtension = (kind: MobileLocalCacheResourceKind): string => {
  if (kind === 'video-preview') {
    return 'mp4';
  }

  return 'jpg';
};

const isRecentMediaCacheFailure = (key: string): boolean => {
  const failedAt = mediaFailureMap.get(key);

  if (!failedAt) {
    return false;
  }

  if (Date.now() - failedAt < MEDIA_CACHE_FAILURE_TTL) {
    return true;
  }

  mediaFailureMap.delete(key);
  return false;
};

const getDirectoryDisplayName = (directory?: FolderDirectory): string => {
  const breadcrumbs = directory?.breadcrumbs ?? [];
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return lastBreadcrumb?.name || (directory?.folderId ? `文件夹 ${directory.folderId}` : '全部');
};

const hashString = (value: string): string => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, 31) + value.charCodeAt(index);
    hash >>>= 0;
  }

  return hash.toString(36);
};

const normalizeServerUrl = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).origin;
  } catch {
    return serverUrl.replace(/\/+$/, '');
  }
};

const parseJson = <TValue>(value: string | null | undefined): TValue | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return undefined;
  }
};
