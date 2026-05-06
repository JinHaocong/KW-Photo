import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  DirectorySelectionItem,
  DirectorySelectionKey,
} from '../../shared/directory-selection';
import {
  isFileSelectionItem,
  isFolderSelectionItem,
  pruneSelectedKeys,
} from './folder-utils';

/**
 * Manages visible directory selection and derived selected file/folder groups.
 */
export const useDirectorySelection = (selectionItems: DirectorySelectionItem[]) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<DirectorySelectionKey>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const hadDirectorySelectionRef = useRef(false);

  const selectedItems = useMemo(
    () => selectionItems.filter((item) => selectedKeys.has(item.key)),
    [selectedKeys, selectionItems],
  );
  const selectedFiles = useMemo(
    () => selectedItems.filter(isFileSelectionItem).map((item) => item.file),
    [selectedItems],
  );
  const selectedFolders = useMemo(
    () => selectedItems.filter(isFolderSelectionItem).map((item) => item.folder),
    [selectedItems],
  );
  const selectedFolderCount = useMemo(() => selectedFolders.length, [selectedFolders]);
  const selectedFileCount = selectedFiles.length;
  const allVisibleSelected =
    selectionItems.length > 0 &&
    selectionItems.every((item) => selectedKeys.has(item.key));

  useEffect(() => {
    setSelectedKeys((current) => pruneSelectedKeys(current, selectionItems));
  }, [selectionItems]);

  useEffect(() => {
    if (!selectionMode) {
      hadDirectorySelectionRef.current = false;
      return;
    }

    if (selectedItems.length > 0) {
      hadDirectorySelectionRef.current = true;
      return;
    }

    if (hadDirectorySelectionRef.current) {
      hadDirectorySelectionRef.current = false;
      setSelectionMode(false);
    }
  }, [selectedItems.length, selectionMode]);

  /**
   * Toggles the folder page selection mode and clears transient selection on exit.
   */
  const toggleSelectionMode = (): void => {
    if (selectionMode) {
      resetSelection();
      return;
    }

    setSelectionMode(true);
  };

  /**
   * Toggles one visible folder or file in the current directory selection.
   */
  const toggleSelection = (key: DirectorySelectionKey): void => {
    setSelectionMode(true);
    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  /**
   * Selects or clears every selectable card visible in the current directory.
   */
  const toggleSelectAllVisible = (): void => {
    setSelectionMode(true);
    setSelectedKeys(() => {
      if (allVisibleSelected) {
        return new Set();
      }

      return new Set(selectionItems.map((item) => item.key));
    });
  };

  const resetSelection = (): void => {
    setSelectionMode(false);
    setSelectedKeys(new Set());
  };

  return {
    allVisibleSelected,
    resetSelection,
    selectedFileCount,
    selectedFiles,
    selectedFolderCount,
    selectedFolders,
    selectedItems,
    selectedKeys,
    selectionMode,
    toggleSelectAllVisible,
    toggleSelection,
    toggleSelectionMode,
  };
};
