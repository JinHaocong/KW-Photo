import { Database, HardDrive, Image as ImageIcon, Server, ShieldCheck, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { CacheManagementPanel } from '../components/CacheManagementPanel';
import { AdminGalleryPanel } from '../components/admin/AdminGalleryPanel';
import { AdminOverviewPanel } from '../components/admin/AdminOverviewPanel';
import { AdminSystemPanel } from '../components/admin/AdminSystemPanel';
import { AdminTasksPanel } from '../components/admin/AdminTasksPanel';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import type { AdminTab } from '../components/admin/admin-types';
import { useLocalCachePreferences } from '../hooks/useLocalCachePreferences';
import { createLocalCacheScope } from '../shared/local-cache';
import type { UploadTask } from '../shared/types';
import { readAdminPreferences, writeAdminPreferences } from '../shared/workspace-preferences';
import { useSessionStore } from '../stores/session-store';

interface AdminPageProps {
  onShowToast: (message: string) => void;
  uploadTasks: UploadTask[];
}

const ADMIN_TABS: Array<{ description: string; icon: ReactNode; key: AdminTab; label: string }> = [
  { description: '服务、账号、缓存', icon: <Server size={18} />, key: 'overview', label: '总览' },
  { description: '图库列表与扫描', icon: <ImageIcon size={18} />, key: 'gallery', label: '图库管理' },
  { description: '队列与上传任务', icon: <HardDrive size={18} />, key: 'tasks', label: '后台任务' },
  { description: '用户与权限', icon: <Users size={18} />, key: 'users', label: '用户管理' },
  { description: '本地缓存明细', icon: <Database size={18} />, key: 'cache', label: '缓存管理' },
  { description: '系统、授权、诊断', icon: <ShieldCheck size={18} />, key: 'system', label: '系统状态' },
];

/**
 * Renders the management center as a first-class workspace page.
 */
export const AdminPage = ({ onShowToast, uploadTasks }: AdminPageProps) => {
  const initialAdminPreferences = useMemo(() => readAdminPreferences(), []);
  const [activeTab, setActiveTab] = useState<AdminTab>(initialAdminPreferences.activeTab);
  const apiInfo = useSessionStore((state) => state.apiInfo);
  const refresh = useSessionStore((state) => state.refresh);
  const serverUrl = useSessionStore((state) => state.serverUrl);
  const tokens = useSessionStore((state) => state.tokens);
  const user = useSessionStore((state) => state.user);
  const { cacheEnabled, setCacheEnabled } = useLocalCachePreferences();
  const cacheScope = createLocalCacheScope({ serverUrl, userId: user?.id });
  const apiOptions = useMemo(
    () => ({
      baseUrl: serverUrl,
      getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
      onUnauthorized: refresh,
    }),
    [refresh, serverUrl],
  );

  useEffect(() => {
    writeAdminPreferences({ activeTab });
  }, [activeTab]);

  return (
    <div className="admin-page">
      <div className="admin-grid">
        <nav className="admin-menu" aria-label="管理中心模块">
          {ADMIN_TABS.map((tab) => (
            <button
              className={activeTab === tab.key ? 'is-active' : ''}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              <div className="admin-menu-icon">{tab.icon}</div>
              <div className="admin-menu-copy">
                <span>{tab.label}</span>
                <small>{tab.description}</small>
              </div>
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {activeTab === 'overview' ? (
            <AdminOverviewPanel
              apiInfo={apiInfo}
              cacheEnabled={cacheEnabled}
              cacheScope={cacheScope}
              onOpenTab={setActiveTab}
              serverUrl={serverUrl}
              tokens={tokens}
              uploadTasks={uploadTasks}
              user={user}
            />
          ) : null}

          {activeTab === 'gallery' ? (
            <AdminGalleryPanel apiOptions={apiOptions} currentUser={user} onShowToast={onShowToast} />
          ) : null}

          {activeTab === 'tasks' ? (
            <AdminTasksPanel
              apiOptions={apiOptions}
              onShowToast={onShowToast}
              uploadTasks={uploadTasks}
            />
          ) : null}

          {activeTab === 'users' ? (
            <AdminUsersPanel apiOptions={apiOptions} currentUser={user} />
          ) : null}

          {activeTab === 'cache' ? (
            <CacheManagementPanel
              cacheEnabled={cacheEnabled}
              description="查看当前账号按文件夹维度沉淀的目录、缩略图、原图和视频缓存，并支持清理单个文件夹。"
              onShowToast={onShowToast}
              onToggleCache={(enabled) => {
                setCacheEnabled(enabled);
                onShowToast(enabled ? '本地缓存已开启' : '本地缓存已关闭');
              }}
              scope={cacheScope}
              title="缓存管理"
            />
          ) : null}

          {activeTab === 'system' ? (
            <AdminSystemPanel
              apiInfo={apiInfo}
              apiOptions={apiOptions}
              onShowToast={onShowToast}
              serverUrl={serverUrl}
              user={user}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};
