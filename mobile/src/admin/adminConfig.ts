import { ADMIN_TAB_DEFINITIONS } from '@kwphoto/core';
import type { AdminGalleryScanSettings, AdminTaskStatus } from '@kwphoto/core';

import type { AdminIconName, AdminTab } from './adminTypes';

type ScanSettingSwitchKey = keyof Pick<
  AdminGalleryScanSettings,
  'mergeJpgRaw' | 'rawGenThumbSolo' | 'readXmp' | 'useXmp' | 'videoPreview'
>;



export const TASK_TABS: AdminTaskStatus[] = ['active', 'waiting', 'failed', 'paused', 'completed'];
export const ACTIVE_TASK_EMPTY_LIMIT = 5;
export const ACTIVE_TASK_REFETCH_INTERVAL = 2000;
export const ADMIN_NOTIFICATION_VISIBLE_MS = 2200;
export const ADMIN_PAGE_EDGE_PADDING = 4;

export const TASK_STATUS_LABELS: Record<AdminTaskStatus, string> = {
  active: '执行中',
  completed: '已完成',
  failed: '失败',
  paused: '暂停',
  waiting: '等待中',
};

export const RECOGNITION_TASKS = [
  { label: '人脸识别', value: 'face' },
  { label: 'CLIP识别', value: 'CLIP' },
  { label: '文本识别', value: 'ocr' },
  { label: '场景识别', value: 'category' },
  { label: '相似识别', value: 'similar' },
] as const;

export const EMPTY_SCAN_SETTINGS: AdminGalleryScanSettings = {
  excludeFileNamePrefixes: [],
  excludeFileTypes: [],
  mergeJpgRaw: true,
  rawGenThumbSolo: false,
  readXmp: true,
  useXmp: true,
  videoPreview: true,
};

export const SCAN_SETTING_SWITCHES: Array<{
  description: string;
  icon: AdminIconName;
  key: ScanSettingSwitchKey;
  label: string;
}> = [
  {
    description: '保存 EXIF 时同步写入同名 .xmp 文件',
    icon: 'save-outline',
    key: 'useXmp',
    label: '保存 xmp 文件',
  },
  {
    description: '扫描时读取同名 .xmp 元数据',
    icon: 'document-text-outline',
    key: 'readXmp',
    label: '读取 xmp 文件',
  },
  {
    description: '同名 JPG 与 RAW 合并展示',
    icon: 'git-merge-outline',
    key: 'mergeJpgRaw',
    label: '合并 jpg/raw',
  },
  {
    description: 'RAW 文件独立生成缩略图',
    icon: 'image-outline',
    key: 'rawGenThumbSolo',
    label: 'RAW 独立缩略图',
  },
  {
    description: '为视频生成前 5 秒预览',
    icon: 'videocam-outline',
    key: 'videoPreview',
    label: '视频预览图',
  },
];

/**
 * Keeps native icons local while labels and order come from the shared admin config.
 */
export const getAdminTabIcon = (tab: AdminTab): AdminIconName => {
  const iconMap: Record<AdminTab, AdminIconName> = {
    cache: 'server-outline',
    gallery: 'images-outline',
    overview: 'grid-outline',
    system: 'shield-checkmark-outline',
    tasks: 'pulse-outline',
    users: 'people-outline',
  };

  return iconMap[tab];
};

export const ADMIN_TABS: Array<{ description: string; icon: AdminIconName; key: AdminTab; label: string }> = [
  ...ADMIN_TAB_DEFINITIONS.map((tab) => ({
    ...tab,
    icon: getAdminTabIcon(tab.key),
  })),
];
