import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type {
  FileMoveOverwriteMode,
} from '@kwphoto/core';

import type {
  MobileFolderCardSize,
  MobileFolderSortDirection,
  MobileFolderSortField,
  MobileFolderViewMode,
} from '../mobile-storage';

export type FolderFabIconName = ComponentProps<typeof Ionicons>['name'];

export const DEFAULT_SORT_FIELD: MobileFolderSortField = 'tokenAt';
export const DEFAULT_SORT_DIRECTION: MobileFolderSortDirection = 'DESC';
export const DEFAULT_VIEW_MODE: MobileFolderViewMode = 'list';
export const DEFAULT_CARD_SIZE: MobileFolderCardSize = 'medium';

export const DIRECTORY_FLASH_LIST_DRAW_DISTANCE = 900;
export const LONG_PRESS_DELAY_MS = 520;
export const MAX_FOLDER_COVER_COUNT = 4;
export const PREVIEW_NEIGHBOR_PRELOAD_RADIUS = 3;
export const PREVIEW_NOTICE_DURATION_MS = 2200;
export const PREVIEW_SWIPE_CLOSE_DISTANCE = 58;
export const PREVIEW_SWIPE_DIRECTION_RATIO = 1.12;
export const PREVIEW_SWIPE_STEP_DISTANCE = 46;

export const SORT_FIELD_LABEL: Record<MobileFolderSortField, string> = {
  fileName: '文件名',
  fileType: '类型',
  mtime: '修改时间',
  size: '大小',
  tokenAt: '拍摄时间',
};

export const SORT_FIELD_OPTIONS: MobileFolderSortField[] = ['tokenAt', 'mtime', 'fileName', 'size', 'fileType'];
export const SYNTHETIC_SORT_FILE_GROUP_LABELS = new Set(
  SORT_FIELD_OPTIONS.map((field) => `${SORT_FIELD_LABEL[field]}排序`),
);

export const SORT_DIRECTION_LABEL: Record<MobileFolderSortDirection, string> = {
  ASC: '升序',
  DESC: '降序',
};
export const SORT_DIRECTION_OPTIONS: MobileFolderSortDirection[] = ['DESC', 'ASC'];

export const VIEW_MODE_OPTIONS: Array<{
  icon: FolderFabIconName;
  label: string;
  meta: string;
  value: MobileFolderViewMode;
}> = [
  { icon: 'grid-outline', label: '宫格', meta: '封面浏览', value: 'grid' },
  { icon: 'list-outline', label: '列表', meta: '信息密度', value: 'list' },
];

export const CARD_SIZE_OPTIONS: Array<{
  icon: FolderFabIconName;
  label: string;
  meta: string;
  value: MobileFolderCardSize;
}> = [
  { icon: 'remove-outline', label: '小', meta: '紧凑', value: 'small' },
  { icon: 'resize-outline', label: '中', meta: '默认', value: 'medium' },
  { icon: 'expand-outline', label: '大', meta: '沉浸', value: 'large' },
];

export const SORT_FIELD_ICON: Record<MobileFolderSortField, FolderFabIconName> = {
  fileName: 'text-outline',
  fileType: 'albums-outline',
  mtime: 'time-outline',
  size: 'file-tray-full-outline',
  tokenAt: 'calendar-outline',
};

export const SORT_DIRECTION_ICON: Record<MobileFolderSortDirection, FolderFabIconName> = {
  ASC: 'arrow-up-outline',
  DESC: 'arrow-down-outline',
};

export const MOVE_OVERWRITE_OPTIONS: Array<{ label: string; value: FileMoveOverwriteMode }> = [
  { label: '自动重命名', value: 2 },
  { label: '跳过冲突', value: 0 },
  { label: '覆盖文件', value: 1 },
];

export const FOLDER_GRID_GAP = 8;
export const FOLDER_GRID_COLUMN_COUNT: Record<MobileFolderCardSize, number> = {
  large: 1,
  medium: 2,
  small: 3,
};

export const VIDEO_TYPES = new Set(['MP4', 'MOV', 'WEBM', 'M4V', 'MKV', 'AVI', 'FLV', 'MTS', 'M2TS']);
export const VIDEO_FALLBACK_ASPECT_RATIO = 16 / 9;
export const DIRECT_VIDEO_PREVIEW_TYPES = new Set(['MP4', 'MOV', 'M4V']);
export const VIDEO_TYPE_KEYWORDS = [
  'video',
  'mp4',
  'mov',
  'm4v',
  'webm',
  'ogg',
  'ogv',
  'avi',
  'mkv',
  'flv',
  'mts',
  'm2ts',
  '3gp',
  'quicktime',
];

export const COVER_IMAGE_TYPES = new Set([
  'AVIF',
  'BMP',
  'GIF',
  'HEIC',
  'HEIF',
  'IMAGE',
  'JPEG',
  'JPG',
  'PNG',
  'TIF',
  'TIFF',
  'WEBP',
]);

export const FORBIDDEN_FOLDER_NAME_PATTERN = /[\\/:*?"<>|]/;
export const FOLDER_GESTURE_RESPONSE_DISTANCE = 28;
