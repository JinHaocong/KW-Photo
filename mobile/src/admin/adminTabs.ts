import type { AdminTabLayout, AdminTabMetaSummary, AdminTab } from './adminTypes';
import { ADMIN_TABS } from './adminConfig';
import { formatFileSize } from './adminFormatters';

/**
 * Calculates the horizontal offset that keeps the selected admin tab near the visual center.
 */
export const getCenteredAdminTabScrollX = (tabLayout: AdminTabLayout, viewportWidth: number): number => {
  return Math.max(0, tabLayout.x - (viewportWidth - tabLayout.width) / 2);
};

/**
 * Keeps tab-level status text compact so the mobile shell does not need dense tables.
 */
export const getAdminTabMeta = (tab: AdminTab, summary: AdminTabMetaSummary): string => {
  if (tab === 'gallery') {
    return `${summary.galleryCount} 个图库`;
  }

  if (tab === 'tasks') {
    return `${summary.taskCounts.active} 执行中 / ${summary.taskCounts.failed} 失败`;
  }

  if (tab === 'users') {
    return `${summary.userCount} 个用户`;
  }

  if (tab === 'cache') {
    return formatFileSize(summary.cacheStats.approximateSize);
  }

  if (tab === 'system') {
    return '系统配置';
  }

  return `${summary.galleryCount} 图库 / ${summary.taskCounts.active} 任务`;
};

export const getAdminTabLabel = (tab: AdminTab): string => {
  return ADMIN_TABS.find((item) => item.key === tab)?.label ?? '管理数据';
};
