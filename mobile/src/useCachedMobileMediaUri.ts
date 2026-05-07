import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  cacheMobileMediaResourceFromUrl,
  readCachedMobileMediaUri,
} from './mobile-local-cache';
import type {
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
  sourceUrl,
  variant,
}: UseCachedMobileMediaUriOptions) => {
  const [cacheHit, setCacheHit] = useState(false);
  const [cacheChecked, setCacheChecked] = useState(false);
  const [displayUri, setDisplayUri] = useState<string>();
  const [displayIdentity, setDisplayIdentity] = useState<string>();
  const displayIdentityRef = useRef<string | undefined>(undefined);
  const mediaIdentity = useMemo(
    () => [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant].join('|'),
    [enabled, fileId, folder?.folderKey, folder?.scope, kind, md5, sourceUrl, variant],
  );
  const rememberedIdentityRef = useRef<string | undefined>(undefined);

  /**
   * Starts one background write for a network URI and dedupes it per rendered media identity.
   */
  const persistNetworkResource = useCallback((): void => {
    if (!enabled || !folder || !sourceUrl || rememberedIdentityRef.current === mediaIdentity) {
      return;
    }

    rememberedIdentityRef.current = mediaIdentity;
    void cacheMobileMediaResourceFromUrl({ fileId, folder, kind, md5, url: sourceUrl, variant });
  }, [enabled, fileId, folder, kind, md5, mediaIdentity, sourceUrl, variant]);

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

    void readCachedMobileMediaUri({ fileId, folder, kind, md5, url: sourceUrl, variant })
      .then((cachedUri) => {
        if (cancelled) {
          return;
        }

        displayIdentityRef.current = mediaIdentity;
        setCacheHit(Boolean(cachedUri));
        setDisplayUri(cachedUri ?? sourceUrl);
        setDisplayIdentity(mediaIdentity);

        if (!cachedUri && cacheOnMiss) {
          persistNetworkResource();
        }
      })
      .catch(() => {
        if (!cancelled) {
          displayIdentityRef.current = mediaIdentity;
          setDisplayUri(sourceUrl);
          setDisplayIdentity(mediaIdentity);

          if (cacheOnMiss) {
            persistNetworkResource();
          }
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCacheChecked(true);
        }
      });

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
    sourceUrl,
    variant,
    mediaIdentity,
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
    displayUri: displayIdentity === mediaIdentity ? displayUri : undefined,
    rememberLoadedResource,
  };
};
