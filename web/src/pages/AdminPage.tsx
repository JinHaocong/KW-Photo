import {
  Database,
  HardDrive,
  Image as ImageIcon,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ADMIN_TAB_DEFINITIONS } from "@kwphoto/core";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { CacheManagementPanel } from "../components/CacheManagementPanel";
import { AdminGalleryPanel } from "../components/admin/AdminGalleryPanel";
import { AdminOverviewPanel } from "../components/admin/AdminOverviewPanel";
import { AdminSystemPanel } from "../components/admin/AdminSystemPanel";
import { AdminTasksPanel } from "../components/admin/AdminTasksPanel";
import { AdminUsersPanel } from "../components/admin/AdminUsersPanel";
import type { AdminTab } from "../components/admin/admin-types";
import { useLocalCachePreferences } from "../hooks/useLocalCachePreferences";
import type { UploadTask } from "../shared/types";
import {
  readAdminPreferences,
  writeAdminPreferences,
} from "../shared/workspace-preferences";
import { useSessionStore } from "../stores/session-store";

interface AdminPageProps {
  onShowToast: (message: string) => void;
  uploadTasks: UploadTask[];
}

/**
 * Keeps platform-specific tab icons while sharing labels and ordering with mobile.
 */
const getAdminTabIcon = (tab: AdminTab): ReactNode => {
  const iconMap: Record<AdminTab, ReactNode> = {
    cache: <Database size={18} />,
    gallery: <ImageIcon size={18} />,
    overview: <Server size={18} />,
    system: <ShieldCheck size={18} />,
    tasks: <HardDrive size={18} />,
    users: <Users size={18} />,
  };

  return iconMap[tab];
};

const ADMIN_TABS: Array<{
  description: string;
  icon: ReactNode;
  key: AdminTab;
  label: string;
}> = [
  ...ADMIN_TAB_DEFINITIONS.map((tab) => ({
    ...tab,
    icon: getAdminTabIcon(tab.key),
  })),
];

/**
 * Renders the management center as a first-class workspace page.
 */
export const AdminPage = ({ onShowToast, uploadTasks }: AdminPageProps) => {
  const initialAdminPreferences = useMemo(() => readAdminPreferences(), []);
  const [activeTab, setActiveTab] = useState<AdminTab>(
    initialAdminPreferences.activeTab,
  );
  const apiInfo = useSessionStore((state) => state.apiInfo);
  const ensureAuthCode = useSessionStore((state) => state.ensureAuthCode);
  const refresh = useSessionStore((state) => state.refresh);
  const serverUrl = useSessionStore((state) => state.serverUrl);
  const tokens = useSessionStore((state) => state.tokens);
  const user = useSessionStore((state) => state.user);
  const { cacheEnabled, setCacheEnabled } = useLocalCachePreferences();
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
        <nav className="admin-tabs admin-page-tabs" aria-label="管理中心模块">
          {ADMIN_TABS.map((tab) => (
            <button
              className={activeTab === tab.key ? "is-active" : ""}
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
            >
              <span className="admin-page-tabs__icon">{tab.icon}</span>
              <span className="admin-page-tabs__copy">
                <span className="admin-page-tabs__label">{tab.label}</span>
                <span className="admin-page-tabs__description">
                  {tab.description}
                </span>
              </span>
            </button>
          ))}
        </nav>

        <div className="admin-content">
          {activeTab === "overview" ? (
            <AdminOverviewPanel
              apiInfo={apiInfo}
              cacheEnabled={cacheEnabled}
              onOpenTab={setActiveTab}
              serverUrl={serverUrl}
              tokens={tokens}
              uploadTasks={uploadTasks}
              user={user}
            />
          ) : null}

          {activeTab === "gallery" ? (
            <AdminGalleryPanel
              apiOptions={apiOptions}
              authCode={tokens?.authCode}
              currentUser={user}
              onEnsureAuthCode={ensureAuthCode}
              onShowToast={onShowToast}
            />
          ) : null}

          {activeTab === "tasks" ? (
            <AdminTasksPanel
              apiOptions={apiOptions}
              onShowToast={onShowToast}
              uploadTasks={uploadTasks}
            />
          ) : null}

          {activeTab === "users" ? (
            <AdminUsersPanel apiOptions={apiOptions} currentUser={user} />
          ) : null}

          {activeTab === "cache" ? (
            <CacheManagementPanel
              cacheEnabled={cacheEnabled}
              description="查看所有账号和服务端沉淀的可用缓存与残留缓存，并支持清理单个文件夹。"
              onShowToast={onShowToast}
              onToggleCache={(enabled) => {
                setCacheEnabled(enabled);
                onShowToast(enabled ? "本地缓存已开启" : "本地缓存已关闭");
              }}
              title="缓存管理"
            />
          ) : null}

          {activeTab === "system" ? (
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
