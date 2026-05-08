export type AdminTab = 'overview' | 'gallery' | 'tasks' | 'users' | 'cache' | 'system';

export interface AdminTabDefinition {
  description: string;
  key: AdminTab;
  label: string;
}

export const ADMIN_TAB_DEFINITIONS: readonly AdminTabDefinition[] = [
  { description: '服务、账号、缓存', key: 'overview', label: '总览' },
  { description: '图库列表与扫描', key: 'gallery', label: '图库管理' },
  { description: '任务信息与调度', key: 'tasks', label: '后台任务' },
  { description: '用户与权限', key: 'users', label: '用户管理' },
  { description: '本地缓存明细', key: 'cache', label: '缓存管理' },
  { description: '系统功能与授权', key: 'system', label: '系统配置' },
] as const;

export const ADMIN_TAB_KEYS = ADMIN_TAB_DEFINITIONS.map((tab) => tab.key);

/**
 * Checks whether a value is one of the supported management center tabs.
 */
export const isAdminTab = (value: unknown): value is AdminTab => {
  return typeof value === 'string' && ADMIN_TAB_KEYS.includes(value as AdminTab);
};
