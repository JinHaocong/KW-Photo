import { useCallback, useEffect, useRef, useState } from 'react';

import { getApiErrorMessage } from '../../services/api-client';
import {
  fetchFolderDirectory,
  fetchRootFolders,
} from '../../services/folders-service';
import {
  createLocalCacheFolderRef,
  readCachedDirectory,
  writeCachedDirectory,
} from '../../shared/local-cache';
import type { FolderDirectory } from '../../shared/types';
import { useSessionStore } from '../../stores/session-store';
import { createEmptyDirectory } from './folder-utils';

interface UseFolderDirectoryOptions {
  cacheEnabled: boolean;
  cacheScope: string;
  currentFolderId?: number;
  refresh: () => Promise<string | undefined>;
  serverUrl: string;
  uploadRefreshKey: number;
}

interface LoadDirectoryOptions {
  forceVisibleLoading?: boolean;
}

/**
 * Loads the active folder directory and refreshes it after upload batches.
 */
export const useFolderDirectory = ({
  cacheEnabled,
  cacheScope,
  currentFolderId,
  refresh,
  serverUrl,
  uploadRefreshKey,
}: UseFolderDirectoryOptions) => {
  const [directory, setDirectory] = useState<FolderDirectory>(() => createEmptyDirectory());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const seenUploadRefreshKeyRef = useRef(uploadRefreshKey);

  const loadDirectory = useCallback(
    async (folderId?: number, options: LoadDirectoryOptions = {}): Promise<void> => {
      const requestId = requestIdRef.current + 1;

      requestIdRef.current = requestId;
      setError('');
      const cachedDirectory = cacheEnabled
        ? await readCachedDirectory({ folderId, scope: cacheScope }).catch(() => undefined)
        : undefined;

      if (requestIdRef.current !== requestId) {
        return;
      }

      if (cachedDirectory) {
        setDirectory(cachedDirectory);
        setLoading(Boolean(options.forceVisibleLoading));
      } else {
        setLoading(true);
      }

      try {
        const apiOptions = {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        };
        const nextDirectory = folderId
          ? await fetchFolderDirectory(apiOptions, folderId)
          : await fetchRootFolders(apiOptions);

        if (requestIdRef.current !== requestId) {
          return;
        }

        if (!cachedDirectory || !isSameDirectory(cachedDirectory, nextDirectory)) {
          setDirectory(nextDirectory);
        }

        if (cacheEnabled) {
          // Cache writes should never keep the visible folder in a loading state.
          void writeCachedDirectory({
            directory: nextDirectory,
            folder: createLocalCacheFolderRef({
              directory: nextDirectory,
              folderId,
              scope: cacheScope,
            }),
          }).catch(() => undefined);
        }
      } catch (requestError) {
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (!cachedDirectory) {
          setError(getApiErrorMessage(requestError));
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    },
    [cacheEnabled, cacheScope, refresh, serverUrl],
  );

  useEffect(() => {
    void loadDirectory(currentFolderId);
  }, [currentFolderId, loadDirectory]);

  useEffect(() => {
    if (seenUploadRefreshKeyRef.current === uploadRefreshKey) {
      return;
    }

    seenUploadRefreshKeyRef.current = uploadRefreshKey;
    void loadDirectory(currentFolderId);
  }, [currentFolderId, loadDirectory, uploadRefreshKey]);

  return {
    directory,
    error,
    loadDirectory,
    loading,
  };
};

/**
 * Compares cached and fresh directory snapshots before replacing visible content.
 */
const isSameDirectory = (cachedDirectory: FolderDirectory, nextDirectory: FolderDirectory): boolean => {
  return JSON.stringify(cachedDirectory) === JSON.stringify(nextDirectory);
};
