import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cacheMediaResourceFromUrl,
  fetchMediaResourceBlob,
  readCachedMediaBlob,
  subscribeLocalCacheChanges,
} from '../shared/local-cache';
import type { LocalCacheChangeDetail, LocalCacheFolderRef, LocalCacheResourceKind } from '../shared/local-cache';
import { createBrowserMediaUrl } from '../shared/media-url';

interface UseCachedMediaUrlOptions {
  enabled: boolean;
  /** Delays network cache fill after the local cache miss, keeping interactions responsive. */
  fetchDelayMs?: number;
  /** When false, only reads local cache and never fetches the source URL. */
  fetchOnMiss?: boolean;
  /** When false, fetch misses as temporary Blob URLs without persisting them. */
  persistFetchedResource?: boolean;
  /** When true, exposes the browser-displayable source URL after the local cache misses. */
  showSourceOnMiss?: boolean;
  /** Defers post-load cache writes so large originals do not compete with swipe gestures. */
  rememberDelayMs?: number;
  fileId?: number;
  folder?: LocalCacheFolderRef;
  kind: Exclude<LocalCacheResourceKind, 'directory'>;
  md5?: string;
  sourceUrl?: string;
  variant?: string;
}

/**
 * Resolves a media URL from local cache first and exposes a writer for loaded resources.
 */
export const useCachedMediaUrl = ({
  enabled,
  fetchDelayMs = 0,
  fetchOnMiss = true,
  persistFetchedResource = true,
  rememberDelayMs = 0,
  showSourceOnMiss = false,
  fileId,
  folder,
  kind,
  md5,
  sourceUrl,
  variant,
}: UseCachedMediaUrlOptions) => {
  const [cachedUrl, setCachedUrl] = useState<string>();
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const [localCacheChecked, setLocalCacheChecked] = useState(false);
  const [localCacheHit, setLocalCacheHit] = useState(false);
  const [cacheInvalidationTick, setCacheInvalidationTick] = useState(0);
  const [persistSuppressedAfterClear, setPersistSuppressedAfterClear] = useState(false);
  const immediateRevokeRef = useRef(false);
  const rememberTimerRef = useRef<number | undefined>(undefined);
  const sourceDisplayUrl = useMemo(() => createBrowserMediaUrl(sourceUrl), [sourceUrl]);
  const baseMediaIdentity = useMemo(
    () => [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant].join('|'),
    [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant],
  );
  const mediaIdentity = useMemo(
    () => `${baseMediaIdentity}|${cacheInvalidationTick}`,
    [baseMediaIdentity, cacheInvalidationTick],
  );
  const [activeIdentity, setActiveIdentity] = useState(mediaIdentity);

  useEffect(() => {
    setPersistSuppressedAfterClear(false);
  }, [baseMediaIdentity]);

  useEffect(() => {
    if (!enabled || !folder) {
      return undefined;
    }

    return subscribeLocalCacheChanges((detail) => {
      if (!shouldInvalidateCachedMediaUrl(detail, folder)) {
        return;
      }

      immediateRevokeRef.current = true;
      setPersistSuppressedAfterClear(true);
      setCacheInvalidationTick((tick) => tick + 1);
    });
  }, [enabled, folder?.folderKey, folder?.scope, folder]);

  useEffect(() => {
    let cancelled = false;
    let fetchTimer: number | undefined;
    let objectUrl: string | undefined;
    let freshObjectUrl: string | undefined;

    setActiveIdentity(mediaIdentity);
    setCachedUrl(undefined);
    setCacheChecked(false);
    setCacheHit(false);
    setLocalCacheChecked(false);
    setLocalCacheHit(false);

    if (!enabled || !folder || !sourceUrl) {
      setLocalCacheChecked(true);
      setCacheChecked(true);
      return undefined;
    }

    void readCachedMediaBlob({ fileId, folder, kind, md5, url: sourceUrl, variant })
      .then((blob) => {
        if (cancelled) {
          return undefined;
        }

        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setCachedUrl(objectUrl);
          setCacheHit(true);
          setLocalCacheHit(true);
          setLocalCacheChecked(true);
          return undefined;
        }

        setLocalCacheChecked(true);
        if (!fetchOnMiss) {
          return undefined;
        }

        if (fetchDelayMs <= 0) {
          return fetchMissedMediaResource({
            fileId,
            folder,
            kind,
            md5,
            persistFetchedResource: persistFetchedResource && !persistSuppressedAfterClear,
            sourceUrl,
            variant,
          });
        }

        return new Promise<Blob | undefined>((resolve) => {
          fetchTimer = window.setTimeout(() => {
            if (cancelled) {
              resolve(undefined);
              return;
            }

            void fetchMissedMediaResource({
              fileId,
              folder,
              kind,
              md5,
              persistFetchedResource: persistFetchedResource && !persistSuppressedAfterClear,
              sourceUrl,
              variant,
            })
              .then(resolve)
              .catch(() => resolve(undefined));
          }, fetchDelayMs);
        });
      })
      .then((blob) => {
        if (!blob || cancelled) {
          return;
        }

        freshObjectUrl = URL.createObjectURL(blob);
        setCachedUrl(freshObjectUrl);
        setCacheHit(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setCacheChecked(true);
        }
      });

    return () => {
      cancelled = true;
      if (rememberTimerRef.current !== undefined) {
        window.clearTimeout(rememberTimerRef.current);
        rememberTimerRef.current = undefined;
      }
      if (fetchTimer !== undefined) {
        window.clearTimeout(fetchTimer);
      }
      const revokeObjectUrl = immediateRevokeRef.current ? revokeObjectUrlNow : revokeObjectUrlLater;

      if (objectUrl) {
        revokeObjectUrl(objectUrl);
      }
      if (freshObjectUrl) {
        revokeObjectUrl(freshObjectUrl);
      }
      if (immediateRevokeRef.current) {
        immediateRevokeRef.current = false;
      }
    };
  }, [
    enabled,
    fetchDelayMs,
    fetchOnMiss,
    fileId,
    folder,
    kind,
    md5,
    persistFetchedResource,
    persistSuppressedAfterClear,
    sourceUrl,
    variant,
    mediaIdentity,
  ]);

  const isActiveIdentity = activeIdentity === mediaIdentity;
  const activeCachedUrl = isActiveIdentity ? cachedUrl : undefined;
  const activeCacheChecked = isActiveIdentity ? cacheChecked : false;
  const activeCacheHit = isActiveIdentity ? cacheHit : false;
  const activeLocalCacheChecked = isActiveIdentity ? localCacheChecked : false;
  const activeLocalCacheHit = isActiveIdentity ? localCacheHit : false;

  /**
   * Stores the network resource after the browser has successfully loaded it.
   */
  const rememberLoadedResource = useCallback((): void => {
    if (!enabled || !persistFetchedResource || activeCacheHit || persistSuppressedAfterClear || !folder || !sourceUrl) {
      return;
    }

    const rememberResource = (): void => {
      rememberTimerRef.current = undefined;
      void cacheMediaResourceFromUrl({ fileId, folder, kind, md5, url: sourceUrl, variant });
    };

    if (rememberTimerRef.current !== undefined) {
      window.clearTimeout(rememberTimerRef.current);
    }

    if (rememberDelayMs <= 0) {
      rememberResource();
      return;
    }

    rememberTimerRef.current = window.setTimeout(rememberResource, rememberDelayMs);
  }, [
    activeCacheHit,
    enabled,
    fileId,
    folder,
    kind,
    md5,
    persistFetchedResource,
    persistSuppressedAfterClear,
    rememberDelayMs,
    sourceUrl,
    variant,
  ]);

  return {
    cacheChecked: activeCacheChecked,
    cacheHit: activeCacheHit,
    cachedUrl: activeCachedUrl,
    displayUrl: activeCachedUrl || (!enabled || (showSourceOnMiss && activeLocalCacheChecked) ? sourceDisplayUrl : undefined),
    localCacheChecked: activeLocalCacheChecked,
    localCacheHit: activeLocalCacheHit,
    rememberLoadedResource,
  };
};

/**
 * Defers object URL revocation to avoid React development remounts revoking a URL
 * while the browser is still decoding the image.
 */
const revokeObjectUrlLater = (url: string): void => {
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const revokeObjectUrlNow = (url: string): void => {
  URL.revokeObjectURL(url);
};

/**
 * Decides whether a mounted media hook should drop its in-memory Blob URL after cache cleanup.
 */
const shouldInvalidateCachedMediaUrl = (
  detail: LocalCacheChangeDetail | undefined,
  folder: LocalCacheFolderRef,
): boolean => {
  if (!detail) {
    return false;
  }

  if (detail.reason === 'clear-all') {
    return true;
  }

  if (detail.reason === 'clear-scope') {
    return !detail.scope || detail.scope === folder.scope;
  }

  if (detail.reason === 'delete-folder') {
    return Boolean(detail.folderScopeKeys?.includes(createFolderScopeKey(folder)));
  }

  return false;
};

const createFolderScopeKey = (folder: LocalCacheFolderRef): string => {
  return `${folder.scope}::folder::${folder.folderKey}`;
};

const fetchMissedMediaResource = ({
  fileId,
  folder,
  kind,
  md5,
  persistFetchedResource,
  sourceUrl,
  variant,
}: {
  fileId?: number;
  folder: LocalCacheFolderRef;
  kind: Exclude<LocalCacheResourceKind, 'directory'>;
  md5?: string;
  persistFetchedResource: boolean;
  sourceUrl: string;
  variant?: string;
}): Promise<Blob | undefined> => {
  if (!persistFetchedResource) {
    return fetchMediaResourceBlob(sourceUrl);
  }

  return cacheMediaResourceFromUrl({ fileId, folder, kind, md5, url: sourceUrl, variant });
};
