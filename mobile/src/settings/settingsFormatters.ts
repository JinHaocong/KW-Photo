import type { ApiInfo } from '@kwphoto/core';
import { ADMIN_TAB_DEFINITIONS, isAdminTab } from '@kwphoto/core';

import type { MobilePreferences } from '../mobile-storage';

export const formatApiInfo = (apiInfo: ApiInfo): string => {
  return `API ${apiInfo.version}${apiInfo.build ? ` #${apiInfo.build}` : ''} · ${apiInfo.platform ?? 'unknown'}`;
};

export const formatStorageSize = (size: number): string => {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const formatTimestamp = (timestamp?: number): string => {
  if (!timestamp) {
    return '未缓存';
  }

  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatCardSize = (size?: MobilePreferences['folderCardSize']): string => {
  if (size === 'small') {
    return '小';
  }

  if (size === 'large') {
    return '大';
  }

  return '中';
};

export const formatAdminTab = (tab?: MobilePreferences['activeAdminTab']): string => {
  if (!isAdminTab(tab)) {
    return '未记录';
  }

  return ADMIN_TAB_DEFINITIONS.find((item) => item.key === tab)?.label ?? '未记录';
};

export const formatSortPreference = (preferences: MobilePreferences): string => {
  const fieldLabel: Record<NonNullable<MobilePreferences['folderSortField']>, string> = {
    fileName: '名称',
    fileType: '类型',
    mtime: '修改',
    size: '大小',
    tokenAt: '拍摄',
  };
  const field = preferences.folderSortField ?? 'tokenAt';
  const direction = preferences.folderSortDirection === 'ASC' ? '升序' : '降序';

  return `${fieldLabel[field]} · ${direction}`;
};
