import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { MobileCacheFolderSummary, MobileCacheStats } from '../mobile-local-cache';
import type { MobileAdminTab } from '../mobile-storage';

export type AdminIconName = ComponentProps<typeof Ionicons>['name'];
export type AdminTab = MobileAdminTab;

export interface CacheFolderTotals {
  coverCount: number;
  directoryCount: number;
  hdThumbnailCount: number;
  itemCount: number;
  mediaCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  size: number;
  thumbnailCount: number;
}

export interface CacheFolderTreeNode {
  branchTotals: CacheFolderTotals;
  children: CacheFolderTreeNode[];
  depth: number;
  folder: MobileCacheFolderSummary;
  id: string;
  name: string;
  path: string;
  totals: CacheFolderTotals;
}

export interface CacheMetaPillData {
  icon: AdminIconName;
  label: string;
  value: number;
}

export interface AdminTabMetaSummary {
  cacheStats: MobileCacheStats;
  galleryCount: number;
  taskCounts: import('@kwphoto/core').AdminTaskCounts;
  userCount: number;
}

export interface AdminTabLayout {
  width: number;
  x: number;
}

export interface GalleryEditorState {
  adminOnly: boolean;
  folderInput: string;
  folders: string[];
  funcExclude: string[];
  hidden: boolean;
  name: string;
  selectedUserIds: string[];
  weights: string;
}
