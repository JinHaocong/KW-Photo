import type { AdminSystemConfigRecord, AdminTask } from '@kwphoto/core';
import { ADMIN_SYSTEM_CONFIG_KEYS } from '@kwphoto/core';
import type { AdminIconName } from './adminTypes';

/**
 * Mobile system language choices shown in the admin system panel.
 */
export const SYSTEM_LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁体中文', value: 'zh-TW' },
  { label: 'English', value: 'en' },
] as const;

/**
 * System feature switches rendered as compact mobile config tiles.
 */
export const MOBILE_SYSTEM_CONFIGS: Array<{
  description: string;
  icon: AdminIconName;
  key: string;
  label: string;
  switchable?: boolean;
}> = [
  {
    description: '位置服务 API 与 GPS 逆地理识别',
    icon: 'location-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.gpsApi,
    label: 'GPS信息识别',
  },
  {
    description: '人物相册的人脸检测和特征识别',
    icon: 'person-circle-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.faceApi,
    label: '人脸识别',
  },
  {
    description: 'OCR、场景分类、CLIP 和相似照片能力',
    icon: 'sparkles-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.ocrApi,
    label: '智能识别',
  },
  {
    description: '视频代理文件生成和播放转码',
    icon: 'videocam-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.transcode,
    label: '视频转码',
    switchable: true,
  },
  {
    description: '照片高清预览图生成',
    icon: 'image-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.hdThumb,
    label: '高清预览图',
    switchable: true,
  },
  {
    description: '往年照片和回忆入口',
    icon: 'calendar-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.showMemory,
    label: '那年今日',
    switchable: true,
  },
  {
    description: '管理员查看多用户回收站',
    icon: 'trash-outline',
    key: ADMIN_SYSTEM_CONFIG_KEYS.trashShareInUsers,
    label: '回收站-多用户模式',
    switchable: true,
  },
];


/**
 * Keeps mobile task thread values inside the backend CPU thread limit.
 */
export const clampThreadValue = (value: number, max: number): number => {
  const safeMax = Math.max(1, Math.floor(max));
  const safeValue = Number.isFinite(value) ? Math.round(value) : 1;

  return Math.min(safeMax, Math.max(1, safeValue));
};

/**
 * Calculates a percent value for native progress bars from backend task payloads.
 */
export const getTaskProgressPercent = (task: AdminTask): number => {
  if (task.progressPercent !== undefined) {
    return task.progressPercent;
  }

  if (task.progressValue !== undefined && task.progressTotal !== undefined && task.progressTotal > 0) {
    return Math.min(100, Math.max(0, (task.progressValue / task.progressTotal) * 100));
  }

  return 0;
};

/**
 * Matches the demo task progress text, preferring value / total over a generic percent.
 */
export const formatTaskProgressText = (task: AdminTask): string => {
  if (task.progressValue !== undefined && task.progressTotal !== undefined) {
    return `${task.progressValue} / ${task.progressTotal}`;
  }

  if (task.progressLabel && task.progressLabel !== '无进度') {
    return task.progressLabel;
  }

  if (task.stage?.value !== undefined && task.stage.total !== undefined) {
    return `${task.stage.value} / ${task.stage.total}`;
  }

  return task.progressLabel || '-';
};

/**
 * Formats backend sub-task progress from the active jobs shared subData payload.
 */
export const formatTaskSubTaskText = (task: AdminTask): string => {
  if (!task.stage) {
    return task.statusLabel;
  }

  const stageName = task.stage.type ? formatTaskStageType(task.stage.type) : '子任务';
  const stageProgress = formatStageProgressText(task.stage.value, task.stage.total);

  if (stageProgress) {
    return `${stageName} ${stageProgress}`;
  }

  return task.stage.type ? stageName : task.stage.label ?? task.statusLabel;
};

/**
 * Formats a task stage value / total pair without showing invalid zero totals.
 */
const formatStageProgressText = (value?: number, total?: number): string => {
  if (value !== undefined && total !== undefined && total > 0) {
    return `${value} / ${total}`;
  }

  if (value !== undefined) {
    return String(value);
  }

  if (total !== undefined && total > 0) {
    return `共 ${total}`;
  }

  return '';
};

/**
 * Maps backend task stage codes to short mobile labels.
 */
const formatTaskStageType = (type: string): string => {
  const labels: Record<string, string> = {
    scanFile: '扫描文件',
    updateFileIndex: '更新索引',
    updateFolderList: '更新目录列表',
  };

  return labels[type] ?? type;
};

/**
 * Inserts or replaces one raw system-config value in the mobile state.
 */
export const upsertSystemConfigValue = (
  configs: AdminSystemConfigRecord[],
  key: string,
  value: string,
): AdminSystemConfigRecord[] => {
  const exists = configs.some((config) => config.key === key);

  if (!exists) {
    return [...configs, { key, value }];
  }

  return configs.map((config) => (config.key === key ? { ...config, value } : config));
};

/**
 * Normalizes language config values used by different MT Photos versions.
 */
export const normalizeSystemLanguage = (value?: string): string => {
  const normalizedValue = value?.trim().replace('_', '-').toLowerCase();

  if (!normalizedValue) {
    return 'zh-CN';
  }

  if (normalizedValue.startsWith('zh-tw') || normalizedValue.startsWith('zh-hk')) {
    return 'zh-TW';
  }

  if (normalizedValue.startsWith('en')) {
    return 'en';
  }

  return 'zh-CN';
};

/**
 * Reads a boolean-ish switch from raw system-config strings or JSON.
 */
export const readSystemConfigEnabled = (value?: string): boolean => {
  const rawValue = value?.trim() ?? '';

  if (!rawValue || ['0', 'false', 'off', 'null', 'undefined', '{}', '[]'].includes(rawValue.toLowerCase())) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (typeof parsedValue === 'boolean') {
      return parsedValue;
    }

    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      const record = parsedValue as Record<string, unknown>;

      if (typeof record.enable === 'boolean') {
        return record.enable;
      }

      if (typeof record.enabled === 'boolean') {
        return record.enabled;
      }

      return Object.keys(record).length > 0;
    }

    return Array.isArray(parsedValue) ? parsedValue.length > 0 : true;
  } catch {
    return true;
  }
};

/**
 * Toggles a switch-like config without losing existing JSON fields.
 */
export const createToggledSystemConfigValue = (value: string, enabled: boolean): string => {
  const rawValue = value.trim();
  const lowerValue = rawValue.toLowerCase();

  if (['0', '1'].includes(rawValue)) {
    return enabled ? '1' : '0';
  }

  if (['true', 'false'].includes(lowerValue)) {
    return enabled ? 'true' : 'false';
  }

  if (rawValue) {
    try {
      const parsedValue = JSON.parse(rawValue) as unknown;

      if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
        return JSON.stringify({ ...(parsedValue as Record<string, unknown>), enable: enabled });
      }
    } catch {
      return enabled ? rawValue : 'false';
    }
  }

  return enabled ? 'true' : 'false';
};

/**
 * Produces a short, non-sensitive summary for raw system-config values.
 */
export const summarizeSystemConfigValue = (value: string): string => {
  const rawValue = value.trim();

  if (!rawValue) {
    return '未配置';
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      return 'JSON 配置已填写';
    }

    if (Array.isArray(parsedValue)) {
      return `${parsedValue.length} 项配置`;
    }
  } catch {
    return rawValue.length > 18 ? `${rawValue.slice(0, 8)}...${rawValue.slice(-4)}` : rawValue;
  }

  return rawValue.length > 18 ? `${rawValue.slice(0, 8)}...${rawValue.slice(-4)}` : rawValue;
};

/**
 * Extracts the optional export directory path from different backend response shapes.
 */
export const readMobileExportTargetFolderPath = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return '';
  }

  const record = payload as Record<string, unknown>;
  const target = record.targetFolderPath ?? record.path ?? record.folderPath;

  return typeof target === 'string' ? target : '';
};
