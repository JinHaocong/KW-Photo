import { createAsyncConcurrencyLimiter } from '@kwphoto/core';

import { getDesktopBridge } from '../platform/desktop-bridge';
import type { FolderDirectory } from './types';
import { createBrowserMediaUrl } from './media-url';
import {
  readLocalCachePreferences as readWorkspaceLocalCachePreferences,
  writeLocalCachePreferences as writeWorkspaceLocalCachePreferences,
} from './workspace-preferences';
import type { WorkspaceLocalCachePreferences } from './workspace-preferences';

export type LocalCacheResourceKind =
  | 'directory'
  | 'folder-cover'
  | 'file-thumbnail'
  | 'file-hd-thumbnail'
  | 'image-preview'
  | 'video-poster'
  | 'video-preview';

export type LocalCachePreferences = WorkspaceLocalCachePreferences;

export interface LocalCacheFolderRef {
  folderId?: number;
  folderKey: string;
  folderName: string;
  folderPath: string;
  scope: string;
}

export interface LocalCacheFolderSummary extends LocalCacheFolderRef {
  coverCount: number;
  directoryCount: number;
  itemCount: number;
  mediaCount: number;
  hdThumbnailCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  size: number;
  thumbnailCount: number;
  updatedAt: number;
  videoPosterCount: number;
}

export interface LocalCacheStats {
  coverCount: number;
  directoryCount: number;
  hdThumbnailCount: number;
  latestCachedAt?: number;
  mediaCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  thumbnailCount: number;
  totalCount: number;
  totalSize: number;
  unusedCount: number;
  unusedSize: number;
  usefulCount: number;
  usefulSize: number;
  videoPosterCount: number;
}

export interface LocalCacheStorageInfo {
  backend: 'app-data' | 'indexeddb';
  blobsPath?: string;
  description: string;
  indexPath?: string;
  label: string;
  rootPath?: string;
}

export interface LocalCacheChangeDetail {
  folderScopeKeys?: string[];
  key?: string;
  reason: 'clear-all' | 'clear-scope' | 'clear-unused' | 'delete-folder' | 'preferences' | 'write';
  scope?: string;
}

interface LocalCacheResourceRecord {
  blob?: Blob;
  contentType?: string;
  createdAt: number;
  directory?: FolderDirectory;
  directoryDigest?: string;
  fileId?: number;
  folderId?: number;
  folderKey: string;
  folderName: string;
  folderPath: string;
  folderScopeKey: string;
  hasBlob?: boolean;
  key: string;
  kind: LocalCacheResourceKind;
  kindLabel?: string;
  md5?: string;
  scope: string;
  size: number;
  updatedAt: number;
  url?: string;
  variant?: string;
}

interface CacheMediaResourceParams {
  fileId?: number;
  folder: LocalCacheFolderRef;
  kind: Exclude<LocalCacheResourceKind, 'directory'>;
  md5?: string;
  url: string;
  variant?: string;
}

interface ReadCachedMediaParams extends Omit<CacheMediaResourceParams, 'url'> {
  url?: string;
}

interface NativeLocalCacheReadRecordResult {
  blobBytes?: number[];
  record?: NativeLocalCacheResourceRecord;
}

interface NativeLocalCacheResourceRecord extends Omit<LocalCacheResourceRecord, 'blob'> {
  blobFileName?: string;
  hasBlob?: boolean;
}

interface NativeLocalCacheStorageInfo {
  blobsDir: string;
  indexPath: string;
  rootDir: string;
}

interface NativeLocalCacheInspection {
  records: NativeLocalCacheResourceRecord[];
  unusedCount: number;
  unusedSize: number;
}

interface NativeMediaFetchResult {
  blobBytes: number[];
  contentType?: string;
  statusCode: number;
}

interface FetchedMediaBlob {
  blob: Blob;
  contentType?: string;
}

interface LocalCachePayloadInspection {
  staleRecordKeys: Set<string>;
  usefulRecords: LocalCacheResourceRecord[];
  usefulSizeByKey: Map<string, number>;
  unusedCount: number;
  unusedSize: number;
}

const LOCAL_CACHE_DB_NAME = 'kwphoto-local-cache';
const LOCAL_CACHE_DB_VERSION = 2;
const LOCAL_CACHE_STORE = 'resources';
const LOCAL_CACHE_EVENT = 'kwphoto-local-cache-change';
const MEDIA_FETCH_CONCURRENCY = 6;
const MEDIA_FETCH_QUEUE_CLEARED_ERROR = new Error('Media fetch queue cleared');

let databasePromise: Promise<IDBDatabase> | undefined;
const mediaCacheRequestMap = new Map<string, Promise<Blob | undefined>>();
const mediaCacheFailureMap = new Map<string, number>();
const mediaFetchLimiter = createAsyncConcurrencyLimiter(MEDIA_FETCH_CONCURRENCY);
const MEDIA_CACHE_FAILURE_TTL = 60_000;
let cacheInvalidationRevision = 0;

/**
 * Reads the local cache preference object.
 */
export const readLocalCachePreferences = (): LocalCachePreferences => {
  return readWorkspaceLocalCachePreferences();
};

/**
 * Persists the local cache preference object and notifies mounted panels.
 */
export const writeLocalCachePreferences = (preferences: LocalCachePreferences): void => {
  try {
    writeWorkspaceLocalCachePreferences(preferences);
    notifyLocalCacheChange({ reason: 'preferences' });
  } catch {
    // Private browser contexts may block storage; the UI keeps the in-memory state.
  }
};

/**
 * Subscribes to cache preference or content changes.
 */
export const subscribeLocalCacheChanges = (
  listener: (detail?: LocalCacheChangeDetail) => void,
): (() => void) => {
  const handleChange = (event: Event): void => {
    listener((event as CustomEvent<LocalCacheChangeDetail>).detail);
  };

  window.addEventListener(LOCAL_CACHE_EVENT, handleChange);

  return () => window.removeEventListener(LOCAL_CACHE_EVENT, handleChange);
};

/**
 * Broadcasts cache mutations with enough detail for mounted media hooks to drop stale Blob URLs.
 */
const notifyLocalCacheChange = (detail: LocalCacheChangeDetail): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent<LocalCacheChangeDetail>(LOCAL_CACHE_EVENT, { detail }));
};

/**
 * Invalidates in-flight media writes so a clear action cannot be repopulated by old requests.
 */
const invalidateInMemoryMediaCache = (): void => {
  cacheInvalidationRevision += 1;
  mediaCacheRequestMap.clear();
  mediaCacheFailureMap.clear();
  mediaFetchLimiter.clear(MEDIA_FETCH_QUEUE_CLEARED_ERROR);
};

/**
 * Creates a cache scope bound to the current server and account.
 */
export const createLocalCacheScope = ({
  serverUrl,
  userId,
}: {
  serverUrl: string;
  userId?: number | string;
}): string => {
  const accountKey = userId === undefined ? 'guest' : String(userId);

  return `${normalizeServerUrl(serverUrl)}::${accountKey}`;
};

/**
 * Builds a folder reference used by directory and media cache records.
 */
export const createLocalCacheFolderRef = ({
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
}): LocalCacheFolderRef => {
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
 * Creates a stable directory summary for cheap cache-vs-network comparisons.
 */
export const createDirectorySnapshotDigest = (directory: FolderDirectory): string => {
  const folderDigest = directory.folders
    .map((folder) => [
      folder.id,
      folder.name,
      folder.path,
      folder.fileCount,
      folder.childCount,
      folder.updatedAt,
      folder.coverFallback,
      folder.coverHashes.join(','),
      folder.trashCount,
    ].join('~'))
    .join('|');
  const fileDigest = directory.files
    .map((group) => {
      const filesDigest = group.list
        .map((file) => [
          file.id,
          file.md5,
          file.name,
          file.fileType,
          file.dateValue ?? '',
          file.modifiedValue ?? file.modifiedDateLabel ?? '',
          file.sizeValue ?? file.sizeLabel ?? '',
          file.width ?? '',
          file.height ?? '',
          file.duration ?? '',
        ].join('~'))
        .join(',');

      return [group.day, group.addr ?? '', group.list.length, filesDigest].join(':');
    })
    .join('|');
  const breadcrumbDigest = directory.breadcrumbs
    .map((item) => [item.folderId ?? item.galleryFolderId ?? item.id ?? '', item.name, item.path ?? ''].join('~'))
    .join('|');

  return [
    directory.folderId ?? 'root',
    directory.path,
    directory.trashCount,
    directory.folders.length,
    directory.files.length,
    folderDigest,
    fileDigest,
    breadcrumbDigest,
  ].join('::');
};

/**
 * Reads one cached folder directory by current scope and folder id.
 */
export const readCachedDirectory = async ({
  folderId,
  scope,
}: {
  folderId?: number;
  scope: string;
}): Promise<FolderDirectory | undefined> => {
  const key = createDirectoryCacheKey(scope, folderId);
  const record = await readCacheRecord(key);

  return record?.directory;
};

/**
 * Writes one folder directory snapshot for instant reload and background diff updates.
 */
export const writeCachedDirectory = async ({
  directory,
  folder,
}: {
  directory: FolderDirectory;
  folder: LocalCacheFolderRef;
}): Promise<void> => {
  const now = Date.now();
  const serializedDirectory = JSON.stringify(directory);

  await writeCacheRecord({
    createdAt: now,
    directory,
    directoryDigest: createDirectorySnapshotDigest(directory),
    folderId: folder.folderId,
    folderKey: folder.folderKey,
    folderName: folder.folderName,
    folderPath: folder.folderPath,
    folderScopeKey: createFolderScopeKey(folder.scope, folder.folderKey),
    key: createDirectoryCacheKey(folder.scope, folder.folderId),
    kind: 'directory',
    kindLabel: getLocalCacheResourceKindLabel('directory'),
    scope: folder.scope,
    size: new Blob([serializedDirectory]).size,
    updatedAt: now,
  });
};

/**
 * Reads a cached media blob for object URL rendering.
 */
export const readCachedMediaBlob = async (
  params: ReadCachedMediaParams,
): Promise<Blob | undefined> => {
  const record = await readCacheRecord(createMediaCacheKey(params));

  return record?.blob;
};

/**
 * Fetches and stores one already-viewed media resource.
 */
export const cacheMediaResourceFromUrl = async (
  params: CacheMediaResourceParams,
): Promise<Blob | undefined> => {
  const key = createMediaCacheKey(params);
  const existingRecord = await readCacheRecord(key);

  if (existingRecord?.blob) {
    if (existingRecord.kind !== params.kind || !existingRecord.kindLabel) {
      await writeCacheRecord({
        ...existingRecord,
        kind: params.kind,
        kindLabel: getLocalCacheResourceKindLabel(params.kind),
        updatedAt: Date.now(),
      }).catch(() => undefined);
      notifyLocalCacheChange({
        folderScopeKeys: [existingRecord.folderScopeKey || createFolderScopeKey(params.folder.scope, params.folder.folderKey)],
        key,
        reason: 'write',
        scope: params.folder.scope,
      });
    }

    return existingRecord.blob;
  }

  if (isRecentMediaCacheFailure(key)) {
    return undefined;
  }

  const pendingRequest = mediaCacheRequestMap.get(key);

  if (pendingRequest) {
    return pendingRequest;
  }

  const requestPromise = fetchAndWriteMediaCache(params, key, cacheInvalidationRevision);
  mediaCacheRequestMap.set(key, requestPromise);

  try {
    return await requestPromise;
  } finally {
    mediaCacheRequestMap.delete(key);
  }
};

/**
 * Fetches one media resource through the runtime-safe transport without writing cache records.
 */
export const fetchMediaResourceBlob = async (url: string): Promise<Blob | undefined> => {
  try {
    const fetchedMedia = await mediaFetchLimiter.run(() => fetchMediaBlob(url));

    return fetchedMedia.blob.size > 0 ? fetchedMedia.blob : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Fetches one media resource and persists its blob under a stable cache key.
 */
const fetchAndWriteMediaCache = async (
  params: CacheMediaResourceParams,
  key: string,
  startedRevision: number,
): Promise<Blob | undefined> => {
  try {
    const fetchedMedia = await mediaFetchLimiter.run(() => fetchMediaBlob(params.url));
    const blob = fetchedMedia.blob;

    if (blob.size <= 0) {
      return undefined;
    }

    if (startedRevision !== cacheInvalidationRevision) {
      return blob;
    }

    const now = Date.now();
    const folderScopeKey = createFolderScopeKey(params.folder.scope, params.folder.folderKey);

    await writeCacheRecord({
      blob,
      contentType: blob.type || fetchedMedia.contentType,
      createdAt: now,
      fileId: params.fileId,
      folderId: params.folder.folderId,
      folderKey: params.folder.folderKey,
      folderName: params.folder.folderName,
      folderPath: params.folder.folderPath,
      folderScopeKey,
      key,
      kind: params.kind,
      kindLabel: getLocalCacheResourceKindLabel(params.kind),
      md5: params.md5,
      scope: params.folder.scope,
      size: blob.size,
      updatedAt: now,
      url: params.url,
      variant: params.variant,
    });

    notifyLocalCacheChange({
      folderScopeKeys: [folderScopeKey],
      key,
      reason: 'write',
      scope: params.folder.scope,
    });
    mediaCacheFailureMap.delete(key);
    return blob;
  } catch (error) {
    if (error !== MEDIA_FETCH_QUEUE_CLEARED_ERROR) {
      mediaCacheFailureMap.set(key, Date.now());
    }
    // Media endpoints may be displayable by <img>/<video> but unavailable to fetch because of CORS.
    return undefined;
  }
};

/**
 * Avoids hammering a media endpoint that just failed during rapid preview toggles.
 */
const isRecentMediaCacheFailure = (key: string): boolean => {
  const failedAt = mediaCacheFailureMap.get(key);

  if (!failedAt) {
    return false;
  }

  if (Date.now() - failedAt < MEDIA_CACHE_FAILURE_TTL) {
    return true;
  }

  mediaCacheFailureMap.delete(key);
  return false;
};

/**
 * Fetches media bytes with the transport available in the current runtime.
 * Web dev uses the Vite proxy; desktop builds can provide a native command to bypass WebView CORS.
 */
const fetchMediaBlob = async (url: string): Promise<FetchedMediaBlob> => {
  if (isNativeAppCacheRuntime()) {
    const result = await getRequiredDesktopLocalCacheBridge().fetchMedia({ url }) as NativeMediaFetchResult;
    const blob = new Blob([new Uint8Array(result.blobBytes)], { type: result.contentType });

    return {
      blob,
      contentType: result.contentType,
    };
  }

  const fetchUrl = createBrowserMediaUrl(url) ?? url;
  const response = await fetch(fetchUrl, {
    credentials: getMediaFetchCredentials(fetchUrl),
  });

  if (!response.ok) {
    throw new Error(`Media request failed: ${response.status}`);
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get('content-type') || undefined,
  };
};

/**
 * Reads useful indexed cache plus orphaned desktop payloads for management screens.
 */
export const readLocalCacheStats = async (scope?: string): Promise<LocalCacheStats> => {
  const inspection = await inspectLocalCachePayloads();
  const usefulRecords = inspection.usefulRecords.filter((record) => !scope || getCacheRecordScope(record) === scope);
  const stats = usefulRecords.reduce<LocalCacheStats>(
    (summary, record) => {
      const resourceKind = normalizeCacheResourceKind(record);
      const recordSize = inspection.usefulSizeByKey.get(record.key) ?? record.size;

      summary.usefulCount += 1;
      summary.usefulSize += recordSize;
      summary.latestCachedAt = Math.max(summary.latestCachedAt ?? 0, record.updatedAt);
      summary.directoryCount += resourceKind === 'directory' ? 1 : 0;
      summary.mediaCount += resourceKind === 'directory' ? 0 : 1;
      summary.coverCount += resourceKind === 'folder-cover' ? 1 : 0;
      summary.hdThumbnailCount += resourceKind === 'file-hd-thumbnail' ? 1 : 0;
      summary.originalImageCount += resourceKind === 'image-preview' ? 1 : 0;
      summary.originalVideoCount += resourceKind === 'video-preview' ? 1 : 0;
      summary.thumbnailCount += resourceKind === 'file-thumbnail' ? 1 : 0;
      summary.videoPosterCount += resourceKind === 'video-poster' ? 1 : 0;
      return summary;
    },
    createEmptyLocalCacheStats(),
  );

  if (!scope) {
    stats.unusedCount = inspection.unusedCount;
    stats.unusedSize = inspection.unusedSize;
  }

  stats.totalCount = stats.usefulCount + stats.unusedCount;
  stats.totalSize = stats.usefulSize + stats.unusedSize;
  return stats;
};

/**
 * Lists cache usage grouped by folder.
 */
export const listLocalCacheFolders = async (
  scope?: string,
): Promise<LocalCacheFolderSummary[]> => {
  const { usefulRecords: records } = await inspectLocalCachePayloads();
  const folders = new Map<string, LocalCacheFolderSummary>();

  records
    .filter((record) => !scope || getCacheRecordScope(record) === scope)
    .forEach((record) => {
      const recordScope = getCacheRecordScope(record);
      const folderKey = getCacheRecordFolderKey(record);
      const key = record.folderScopeKey || createFolderScopeKey(recordScope, folderKey);
      const current = folders.get(key) ?? {
        coverCount: 0,
        directoryCount: 0,
        folderId: record.folderId,
        folderKey,
        folderName: record.folderName || (folderKey === 'root' ? '全部' : `文件夹 ${folderKey}`),
        folderPath: record.folderPath || (folderKey === 'root' ? '根目录' : `文件夹 ${folderKey}`),
        hdThumbnailCount: 0,
        itemCount: 0,
        mediaCount: 0,
        originalImageCount: 0,
        originalVideoCount: 0,
        scope: recordScope,
        size: 0,
        thumbnailCount: 0,
        updatedAt: 0,
        videoPosterCount: 0,
      };

      const resourceKind = normalizeCacheResourceKind(record);

      current.coverCount += resourceKind === 'folder-cover' ? 1 : 0;
      current.directoryCount += resourceKind === 'directory' ? 1 : 0;
      current.mediaCount += resourceKind === 'directory' ? 0 : 1;
      current.hdThumbnailCount += resourceKind === 'file-hd-thumbnail' ? 1 : 0;
      current.originalImageCount += resourceKind === 'image-preview' ? 1 : 0;
      current.originalVideoCount += resourceKind === 'video-preview' ? 1 : 0;
      current.thumbnailCount += resourceKind === 'file-thumbnail' ? 1 : 0;
      current.videoPosterCount += resourceKind === 'video-poster' ? 1 : 0;
      current.itemCount += 1;
      current.size += record.size;
      current.updatedAt = Math.max(current.updatedAt, record.updatedAt);
      folders.set(key, current);
    });

  return Array.from(folders.values()).sort((first, second) => second.updatedAt - first.updatedAt);
};

/**
 * Deletes all cache records under one folder group.
 */
export const deleteLocalCacheFolder = async ({
  folderKey,
  scope,
}: {
  folderKey: string;
  scope: string;
}): Promise<void> => {
  const folderScopeKey = createFolderScopeKey(scope, folderKey);

  invalidateInMemoryMediaCache();
  await deleteRecordsByFolderScopeKey(folderScopeKey);
  notifyLocalCacheChange({
    folderScopeKeys: [folderScopeKey],
    reason: 'delete-folder',
    scope,
  });
};

/**
 * Deletes multiple folder cache groups and emits one refresh event.
 */
export const deleteLocalCacheFolderGroups = async (
  folders: Array<Pick<LocalCacheFolderRef, 'folderKey' | 'scope'>>,
): Promise<void> => {
  const folderScopeKeys = Array.from(
    new Set(folders.map((folder) => createFolderScopeKey(folder.scope, folder.folderKey))),
  );
  const scopes = Array.from(new Set(folders.map((folder) => folder.scope)));

  invalidateInMemoryMediaCache();
  await Promise.all(folderScopeKeys.map((folderScopeKey) => deleteRecordsByFolderScopeKey(folderScopeKey)));
  notifyLocalCacheChange({
    folderScopeKeys,
    reason: 'delete-folder',
    scope: scopes.length === 1 ? scopes[0] : undefined,
  });
};

/**
 * Deletes every cache record in the current scope, or all records when scope is omitted.
 */
export const clearLocalCache = async (scope?: string): Promise<void> => {
  invalidateInMemoryMediaCache();

  if (isNativeAppCacheRuntime()) {
    await getRequiredDesktopLocalCacheBridge().clear({ scope: scope ?? null });
    notifyLocalCacheChange({ reason: scope ? 'clear-scope' : 'clear-all', scope });
    return;
  }

  const database = await openLocalCacheDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readwrite');
    const store = transaction.objectStore(LOCAL_CACHE_STORE);

    if (!scope) {
      store.clear();
    } else {
      const scopeIndex = store.index('scope');
      const cursorRequest = scopeIndex.openCursor(IDBKeyRange.only(scope));

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;

        if (!cursor) {
          return;
        }

        cursor.delete();
        cursor.continue();
      };
    }

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

  notifyLocalCacheChange({ reason: scope ? 'clear-scope' : 'clear-all', scope });
};

/**
 * Clears all indexed cache records while leaving orphan cleanup explicit.
 */
export const clearUsefulLocalCache = async (): Promise<void> => {
  await clearLocalCache();
};

/**
 * Clears cache payloads that are no longer reachable from the index.
 */
export const clearUnusedLocalCache = async (): Promise<void> => {
  invalidateInMemoryMediaCache();

  if (isNativeAppCacheRuntime()) {
    await getRequiredDesktopLocalCacheBridge().clearUnused();
    notifyLocalCacheChange({ reason: 'clear-unused' });
    return;
  }

  const inspection = await inspectLocalCachePayloads();

  await deleteCacheRecordsByKeys(inspection.staleRecordKeys);
  notifyLocalCacheChange({ reason: 'clear-unused' });
};

/**
 * Clears both indexed cache records and orphaned payloads.
 */
export const clearAllLocalCache = async (): Promise<void> => {
  invalidateInMemoryMediaCache();

  if (isNativeAppCacheRuntime()) {
    await getRequiredDesktopLocalCacheBridge().clearAll();
    notifyLocalCacheChange({ reason: 'clear-all' });
    return;
  }

  await clearLocalCache();
};

/**
 * Reads the physical cache backend used by the current runtime.
 */
export const readLocalCacheStorageInfo = async (): Promise<LocalCacheStorageInfo> => {
  if (isNativeAppCacheRuntime()) {
    try {
      const info = await getRequiredDesktopLocalCacheBridge().storageInfo() as NativeLocalCacheStorageInfo;

      return {
        backend: 'app-data',
        blobsPath: info.blobsDir,
        description: '桌面端和移动端使用应用数据目录保存缓存文件。',
        indexPath: info.indexPath,
        label: 'App 级缓存',
        rootPath: info.rootDir,
      };
    } catch {
      return {
        backend: 'app-data',
        description: '当前运行在 Electron App 内，缓存会写入系统分配的应用数据目录。',
        label: 'App 级缓存',
      };
    }
  }

  return {
    backend: 'indexeddb',
    description: `浏览器缓存写入 IndexedDB：${LOCAL_CACHE_DB_NAME}/${LOCAL_CACHE_STORE}。`,
    label: 'IndexedDB',
  };
};

/**
 * Formats byte size for cache management surfaces.
 */
export const formatCacheSize = (size: number): string => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const createEmptyLocalCacheStats = (): LocalCacheStats => ({
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
  totalCount: 0,
  totalSize: 0,
  unusedCount: 0,
  unusedSize: 0,
  usefulCount: 0,
  usefulSize: 0,
  videoPosterCount: 0,
});

const openLocalCacheDatabase = (): Promise<IDBDatabase> => {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LOCAL_CACHE_DB_NAME, LOCAL_CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.objectStoreNames.contains(LOCAL_CACHE_STORE)
        ? request.transaction?.objectStore(LOCAL_CACHE_STORE)
        : database.createObjectStore(LOCAL_CACHE_STORE, { keyPath: 'key' });

      if (!store) {
        return;
      }

      if (!store.indexNames.contains('scope')) {
        store.createIndex('scope', 'scope', { unique: false });
      }

      if (!store.indexNames.contains('folderScopeKey')) {
        store.createIndex('folderScopeKey', 'folderScopeKey', { unique: false });
      }

      if (!store.indexNames.contains('kind')) {
        store.createIndex('kind', 'kind', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error);
    };
  });

  return databasePromise;
};

const readCacheRecord = async (key: string): Promise<LocalCacheResourceRecord | undefined> => {
  if (isNativeAppCacheRuntime()) {
    return readNativeCacheRecord(key);
  }

  const database = await openLocalCacheDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readonly');
    const request = transaction.objectStore(LOCAL_CACHE_STORE).get(key);

    request.onsuccess = () => resolve(request.result as LocalCacheResourceRecord | undefined);
    request.onerror = () => reject(request.error);
  });
};

const writeCacheRecord = async (record: LocalCacheResourceRecord): Promise<void> => {
  if (isNativeAppCacheRuntime()) {
    return writeNativeCacheRecord(record);
  }

  const database = await openLocalCacheDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readwrite');

    transaction.objectStore(LOCAL_CACHE_STORE).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const readAllCacheRecords = async (): Promise<LocalCacheResourceRecord[]> => {
  if (isNativeAppCacheRuntime()) {
    return readNativeCacheRecords();
  }

  const database = await openLocalCacheDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readonly');
    const request = transaction.objectStore(LOCAL_CACHE_STORE).getAll();

    request.onsuccess = () => resolve(request.result as LocalCacheResourceRecord[]);
    request.onerror = () => reject(request.error);
  });
};

const inspectLocalCachePayloads = async (): Promise<LocalCachePayloadInspection> => {
  if (isNativeAppCacheRuntime()) {
    const inspection = await getRequiredDesktopLocalCacheBridge().inspect() as NativeLocalCacheInspection;
    const records = inspection.records.map((record) => fromNativeCacheRecord(record));

    return inspectCacheRecords(records, inspection.unusedCount, inspection.unusedSize);
  }

  return inspectCacheRecords(await readAllCacheRecords(), 0, 0);
};

const inspectCacheRecords = (
  records: LocalCacheResourceRecord[],
  unusedCount: number,
  unusedSize: number,
): LocalCachePayloadInspection => {
  const staleRecordKeys = new Set<string>();
  const usefulRecords: LocalCacheResourceRecord[] = [];
  const usefulSizeByKey = new Map<string, number>();

  records.forEach((record) => {
    const payloadSize = readCacheRecordPayloadSize(record);

    if (payloadSize.exists) {
      usefulRecords.push(record);
      usefulSizeByKey.set(record.key, payloadSize.size);
    } else {
      staleRecordKeys.add(record.key);
    }
  });

  return {
    staleRecordKeys,
    usefulRecords,
    usefulSizeByKey,
    unusedCount: staleRecordKeys.size + unusedCount,
    unusedSize,
  };
};

const readCacheRecordPayloadSize = (record: LocalCacheResourceRecord): { exists: boolean; size: number } => {
  const resourceKind = normalizeCacheResourceKind(record);

  if (resourceKind === 'directory') {
    return {
      exists: Boolean(record.directory),
      size: record.size,
    };
  }

  if (record.blob) {
    return {
      exists: true,
      size: record.blob.size,
    };
  }

  return {
    exists: record.hasBlob === true,
    size: record.hasBlob === true ? record.size : 0,
  };
};

const deleteCacheRecordsByKeys = async (keys: ReadonlySet<string>): Promise<void> => {
  if (keys.size === 0) {
    return;
  }

  const database = await openLocalCacheDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readwrite');
    const store = transaction.objectStore(LOCAL_CACHE_STORE);

    keys.forEach((key) => {
      store.delete(key);
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const deleteRecordsByFolderScopeKey = async (folderScopeKey: string): Promise<void> => {
  if (isNativeAppCacheRuntime()) {
    await getRequiredDesktopLocalCacheBridge().deleteFolder({ folderScopeKey });
    return;
  }

  const database = await openLocalCacheDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LOCAL_CACHE_STORE, 'readwrite');
    const index = transaction.objectStore(LOCAL_CACHE_STORE).index('folderScopeKey');
    const cursorRequest = index.openCursor(IDBKeyRange.only(folderScopeKey));

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;

      if (!cursor) {
        return;
      }

      cursor.delete();
      cursor.continue();
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const readNativeCacheRecord = async (
  key: string,
): Promise<LocalCacheResourceRecord | undefined> => {
  const result = await getRequiredDesktopLocalCacheBridge().readRecord({ key }) as NativeLocalCacheReadRecordResult;

  if (!result.record) {
    return undefined;
  }

  return fromNativeCacheRecord(result.record, result.blobBytes);
};

const writeNativeCacheRecord = async (record: LocalCacheResourceRecord): Promise<void> => {
  const blobBytes = record.blob
    ? Array.from(new Uint8Array(await record.blob.arrayBuffer()))
    : null;

  await getRequiredDesktopLocalCacheBridge().writeRecord({
    blobBytes,
    record: toNativeCacheRecord(record),
  });
};

const readNativeCacheRecords = async (): Promise<LocalCacheResourceRecord[]> => {
  const records = await getRequiredDesktopLocalCacheBridge().listRecords({
    scope: null,
  }) as NativeLocalCacheResourceRecord[];

  return records.map((record) => fromNativeCacheRecord(record));
};

const fromNativeCacheRecord = (
  record: NativeLocalCacheResourceRecord,
  blobBytes?: number[],
): LocalCacheResourceRecord => {
  const blob = blobBytes
    ? new Blob([new Uint8Array(blobBytes)], { type: record.contentType })
    : undefined;

  return {
    ...record,
    blob,
  };
};

const toNativeCacheRecord = (record: LocalCacheResourceRecord): NativeLocalCacheResourceRecord => {
  const { blob: _blob, ...metadata } = record;

  return metadata;
};

const isNativeAppCacheRuntime = (): boolean => {
  return Boolean(getDesktopBridge()?.localCache);
};

const getRequiredDesktopLocalCacheBridge = () => {
  const bridge = getDesktopBridge()?.localCache;

  if (!bridge) {
    throw new Error('Desktop local cache bridge is not available.');
  }

  return bridge;
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
}: ReadCachedMediaParams): string => {
  const identity = createMediaCacheIdentity({ fileId, md5, url });

  return `${folder.scope}::media::${folder.folderKey}::${kind}::${variant}::${identity}`;
};

/**
 * Versions file caches by content identity so edited files do not reuse stale blobs.
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

const createFolderScopeKey = (scope: string, folderKey: string): string => {
  return `${scope}::folder::${folderKey}`;
};

/**
 * Reads the cache resource kind with a key-based fallback for older records.
 */
const normalizeCacheResourceKind = (record: LocalCacheResourceRecord): LocalCacheResourceKind => {
  const inferredKind = inferCacheResourceKindFromShape(record);

  if (inferredKind) {
    return inferredKind;
  }

  if (isLocalCacheResourceKind(record.kind)) {
    return record.kind;
  }

  if (record.key.includes('::folder-cover::')) {
    return 'folder-cover';
  }

  if (record.key.includes('::file-thumbnail::')) {
    return 'file-thumbnail';
  }

  if (record.key.includes('::file-hd-thumbnail::')) {
    return 'file-hd-thumbnail';
  }

  if (record.key.includes('::image-preview::')) {
    return 'image-preview';
  }

  if (record.key.includes('::video-preview::')) {
    return 'video-preview';
  }

  if (record.key.includes('::video-poster::')) {
    return 'video-poster';
  }

  return 'directory';
};

/**
 * Infers media records created before `kind` was persisted, or records that were
 * cached with a broad media key before cover and thumbnail statistics split.
 */
const inferCacheResourceKindFromShape = (
  record: LocalCacheResourceRecord,
): LocalCacheResourceKind | undefined => {
  const variant = record.variant?.toLowerCase();
  const url = record.url?.toLowerCase() ?? '';

  if (!record.fileId && (variant === 'h220' || url.includes('/gateway/h220/'))) {
    return 'folder-cover';
  }

  if (
    record.fileId &&
    (variant === 'poster' || url.includes('/gateway/poster/'))
  ) {
    return 'video-poster';
  }

  if (
    record.fileId &&
    (variant === 'h220' || url.includes('/gateway/h220/'))
  ) {
    return 'file-thumbnail';
  }

  if (
    record.fileId &&
    (variant === 'hd' || (url.includes('/gateway/preview/') && url.includes('type=hd')))
  ) {
    return 'file-hd-thumbnail';
  }

  return undefined;
};

const isLocalCacheResourceKind = (value: unknown): value is LocalCacheResourceKind => {
  return (
    value === 'directory' ||
    value === 'folder-cover' ||
    value === 'file-thumbnail' ||
    value === 'file-hd-thumbnail' ||
    value === 'image-preview' ||
    value === 'video-poster' ||
    value === 'video-preview'
  );
};

const getLocalCacheResourceKindLabel = (kind: LocalCacheResourceKind): string => {
  const labels: Record<LocalCacheResourceKind, string> = {
    directory: '文件夹目录快照',
    'file-hd-thumbnail': '高清缩略图',
    'file-thumbnail': '文件缩略图',
    'folder-cover': '文件夹封面图',
    'image-preview': '查看原图',
    'video-poster': '视频海报',
    'video-preview': '查看原视频',
  };

  return labels[kind];
};

const getDirectoryDisplayName = (directory?: FolderDirectory): string => {
  const lastBreadcrumb = directory?.breadcrumbs.at(-1);

  return lastBreadcrumb?.name || (directory?.folderId ? `文件夹 ${directory.folderId}` : '全部');
};

const getCacheRecordScope = (record: LocalCacheResourceRecord): string => {
  return record.scope || extractCacheScopeFromKey(record.key);
};

const getCacheRecordFolderKey = (record: LocalCacheResourceRecord): string => {
  if (record.folderKey) {
    return record.folderKey;
  }

  const mediaFolderKey = record.key.split('::media::')[1]?.split('::')[0];

  if (mediaFolderKey) {
    return mediaFolderKey;
  }

  const directoryFolderKey = record.key.split('::directory::')[1];

  if (directoryFolderKey) {
    return directoryFolderKey;
  }

  return record.folderId && record.folderId > 0 ? String(record.folderId) : 'root';
};

const extractCacheScopeFromKey = (key: string): string => {
  const separator = ['::directory::', '::media::'].find((value) => key.includes(value));

  return separator ? key.slice(0, key.indexOf(separator)) : '';
};

/**
 * Cross-origin media endpoints already carry `auth_code` in the URL. Sending
 * cookies to wildcard-CORS responses makes browsers reject an otherwise 200 OK
 * image response, so only same-origin cache fetches include credentials.
 */
const getMediaFetchCredentials = (url: string): RequestCredentials => {
  try {
    return new URL(url, window.location.href).origin === window.location.origin ? 'include' : 'omit';
  } catch {
    return 'omit';
  }
};

const normalizeServerUrl = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).origin;
  } catch {
    return serverUrl.replace(/\/+$/, '');
  }
};
