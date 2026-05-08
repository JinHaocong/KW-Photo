import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cacheMobileMediaResourceFromUrl,
  readCachedMobileMediaUri,
  subscribeMobileCacheChanges,
} from './mobile-local-cache';
import type {
  MobileCacheChangeDetail,
  MobileLocalCacheFolderRef,
  MobileLocalCacheResourceKind,
} from './mobile-local-cache';

interface UseCachedMobileMediaUriOptions {
  cacheOnMiss?: boolean;
  enabled: boolean;
  fileId?: number;
  folder?: MobileLocalCacheFolderRef;
  /**
   * Shows the network URL immediately while the local cache lookup runs in the background.
   */
  instantNetworkFallback?: boolean;
  kind: Exclude<MobileLocalCacheResourceKind, 'directory'>;
  md5?: string;
  /** When false, waits for a queued cache download instead of exposing the network URL after a miss. */
  showSourceOnMiss?: boolean;
  sourceUrl?: string;
  variant?: string;
}

/**
 * Resolves a React Native image URI from local file cache before falling back to network.
 */
export const useCachedMobileMediaUri = ({
  cacheOnMiss = false,
  enabled,
  fileId,
  folder,
  instantNetworkFallback = false,
  kind,
  md5,
  showSourceOnMiss = true,
  sourceUrl,
  variant,
}: UseCachedMobileMediaUriOptions) => {
  const [cacheHit, setCacheHit] = useState(false);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [cacheInvalidationTick, setCacheInvalidationTick] = useState(0);
  const [displayUri, setDisplayUri] = useState<string>();
  const [displayIdentity, setDisplayIdentity] = useState<string>();
  const [persistSuppressedAfterClear, setPersistSuppressedAfterClear] = useState(false);
  const displayIdentityRef = useRef<string | undefined>(undefined);
  const baseMediaIdentity = useMemo(
    () => [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant].join('|'),
    [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant],
  );
  const mediaIdentity = useMemo(
    () => `${baseMediaIdentity}|${cacheInvalidationTick}`,
    [baseMediaIdentity, cacheInvalidationTick],
  );
  const rememberedIdentityRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setPersistSuppressedAfterClear(false);
  }, [baseMediaIdentity]);

  useEffect(() => {
    if (!enabled || !folder) {
      return undefined;
    }

    return subscribeMobileCacheChanges((detail) => {
      if (!shouldInvalidateCachedMobileMediaUri(detail, folder)) {
        return;
      }

      setPersistSuppressedAfterClear(true);
      setCacheInvalidationTick((tick) => tick + 1);
    });
  }, [enabled, folder, folder?.folderKey, folder?.scope]);

  /**
   * Downloads one network URI through the mobile cache queue.
   */
  const downloadNetworkResource = useCallback((): Promise<string | undefined> => {
    if (
      !enabled ||
      !folder ||
      !sourceUrl
    ) {
      return Promise.resolve(undefined);
    }

    return cacheMobileMediaResourceFromUrl({ fileId, folder, kind, md5, url: sourceUrl, variant });
  }, [enabled, fileId, folder, kind, md5, sourceUrl, variant]);

  /**
   * Starts one background write for a network URI and dedupes it per rendered media identity.
   */
  const persistNetworkResource = useCallback((): void => {
    if (rememberedIdentityRef.current === mediaIdentity) {
      return;
    }

    rememberedIdentityRef.current = mediaIdentity;
    void downloadNetworkResource();
  }, [downloadNetworkResource, mediaIdentity]);

  useEffect(() => {
    let cancelled = false;
    const identityChanged = displayIdentityRef.current !== mediaIdentity;

    if (identityChanged) {
      setCacheHit(false);
      setCacheChecked(false);
      setDisplayUri(instantNetworkFallback ? sourceUrl : undefined);
      setDisplayIdentity(instantNetworkFallback ? mediaIdentity : undefined);
    }

    if (!sourceUrl) {
      displayIdentityRef.current = mediaIdentity;
      setCacheChecked(true);
      setDisplayIdentity(mediaIdentity);
      return undefined;
    }

    if (!enabled || !folder) {
      displayIdentityRef.current = mediaIdentity;
      setDisplayUri(sourceUrl);
      setCacheChecked(true);
      setDisplayIdentity(mediaIdentity);
      return undefined;
    }

    /**
     * Keeps list covers blank until their queued cache download reaches the front of the line.
     */
    const resolveDisplayUri = async (): Promise<void> => {
      try {
        const cachedUri = await readCachedMobileMediaUri({ fileId, folder, kind, md5, url: sourceUrl, variant });

        if (cancelled) {
          return;
        }

        if (cachedUri) {
          displayIdentityRef.current = mediaIdentity;
          setCacheHit(true);
          setDisplayUri(cachedUri);
          setDisplayIdentity(mediaIdentity);
          return;
        }

        if (cacheOnMiss && !instantNetworkFallback && !showSourceOnMiss) {
          const downloadedUri = await downloadNetworkResource();

          if (cancelled) {
            return;
          }

          displayIdentityRef.current = mediaIdentity;
          setCacheHit(Boolean(downloadedUri));
          setDisplayUri(downloadedUri);
          setDisplayIdentity(mediaIdentity);
          return;
        }

        displayIdentityRef.current = mediaIdentity;
        setCacheHit(false);
        setDisplayUri(instantNetworkFallback || showSourceOnMiss ? sourceUrl : undefined);
        setDisplayIdentity(mediaIdentity);

        if (cacheOnMiss && !persistSuppressedAfterClear) {
          persistNetworkResource();
        }
      } catch {
        if (!cancelled) {
          displayIdentityRef.current = mediaIdentity;
          setCacheHit(false);
          setDisplayUri(instantNetworkFallback || showSourceOnMiss ? sourceUrl : undefined);
          setDisplayIdentity(mediaIdentity);

          if (cacheOnMiss && !persistSuppressedAfterClear) {
            persistNetworkResource();
          }
        }
      } finally {
        if (!cancelled) {
          setCacheChecked(true);
        }
      }
    };

    void resolveDisplayUri();

    return () => {
      cancelled = true;
    };
  }, [
    cacheOnMiss,
    enabled,
    fileId,
    folder,
    instantNetworkFallback,
    kind,
    md5,
    showSourceOnMiss,
    sourceUrl,
    variant,
    mediaIdentity,
    downloadNetworkResource,
    persistSuppressedAfterClear,
    persistNetworkResource,
  ]);

  /**
   * Persists a network-loaded image after React Native confirms the source rendered.
   */
  const rememberLoadedResource = useCallback((): void => {
    if (cacheHit) {
      return;
    }

    persistNetworkResource();
  }, [cacheHit, persistNetworkResource]);

  return {
    cacheChecked: displayIdentity === mediaIdentity ? cacheChecked : false,
    cacheHit: displayIdentity === mediaIdentity ? cacheHit : false,
    displayUri: displayIdentity === mediaIdentity
      ? displayUri
      : (instantNetworkFallback || showSourceOnMiss ? sourceUrl : undefined),
    rememberLoadedResource,
  };
};

/**
 * Decides whether one mounted mobile image should release its stale local file URI after cache cleanup.
 */
const shouldInvalidateCachedMobileMediaUri = (
  detail: MobileCacheChangeDetail | undefined,
  folder: MobileLocalCacheFolderRef,
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
    return Boolean(detail.folderScopeKeys?.includes(createMobileFolderScopeKey(folder)));
  }

  return false;
};

const createMobileFolderScopeKey = (folder: MobileLocalCacheFolderRef): string => {
  return `${folder.scope}::folder::${folder.folderKey}`;
};
