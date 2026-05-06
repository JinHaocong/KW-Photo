import { useCallback, useEffect, useState } from 'react';

import {
  readLocalCachePreferences,
  subscribeLocalCacheChanges,
  writeLocalCachePreferences,
} from '../shared/local-cache';
import type { LocalCachePreferences } from '../shared/local-cache';

/**
 * Keeps the local cache preference in sync across settings, admin and browsers.
 */
export const useLocalCachePreferences = () => {
  const [preferences, setPreferences] = useState<LocalCachePreferences>(() =>
    readLocalCachePreferences(),
  );

  useEffect(() => {
    return subscribeLocalCacheChanges(() => {
      setPreferences(readLocalCachePreferences());
    });
  }, []);

  /**
   * Updates whether local cache should be used for directory and media loading.
   */
  const setCacheEnabled = useCallback((enabled: boolean): void => {
    const nextPreferences = { enabled };

    setPreferences(nextPreferences);
    writeLocalCachePreferences(nextPreferences);
  }, []);

  return {
    cacheEnabled: preferences.enabled,
    preferences,
    setCacheEnabled,
  };
};
