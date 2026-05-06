import { useEffect, useMemo, useState } from 'react';

import type { FolderCardSize, FolderSortField, SortDirection } from '../../shared/types';
import {
  loadFolderViewPreference,
  saveFolderViewPreference,
} from './folder-view-preferences';

/**
 * Keeps folder view preferences in local state and persists them per account.
 */
export const useFolderViewPreference = (userId?: number) => {
  const initialViewPreference = useMemo(() => loadFolderViewPreference(userId), [userId]);
  const [folderCardSize, setFolderCardSize] = useState<FolderCardSize>(initialViewPreference.cardSize);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialViewPreference.sort.direction);
  const [sortField, setSortField] = useState<FolderSortField>(initialViewPreference.sort.field);
  const [showFolderCovers, setShowFolderCovers] = useState(initialViewPreference.showFolderCovers);

  useEffect(() => {
    const nextPreference = loadFolderViewPreference(userId);

    setSortField(nextPreference.sort.field);
    setSortDirection(nextPreference.sort.direction);
    setFolderCardSize(nextPreference.cardSize);
    setShowFolderCovers(nextPreference.showFolderCovers);
  }, [userId]);

  useEffect(() => {
    saveFolderViewPreference(userId, {
      cardSize: folderCardSize,
      showFolderCovers,
      sort: {
        direction: sortDirection,
        field: sortField,
      },
    });
  }, [folderCardSize, showFolderCovers, sortDirection, sortField, userId]);

  return {
    folderCardSize,
    setFolderCardSize,
    setShowFolderCovers,
    setSortDirection,
    setSortField,
    showFolderCovers,
    sortDirection,
    sortField,
  };
};
