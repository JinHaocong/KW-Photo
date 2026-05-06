import { AdminPage } from '../pages/AdminPage';
import { FoldersPage } from '../pages/FoldersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { PAGE_COPY } from '../shared/app-config';
import type { ThemeName, UploadTarget, UploadTask, WorkspacePage } from '../shared/types';
import type { WorkspaceMobileMenuPreferences } from '../shared/workspace-preferences';

interface WorkspaceContentProps {
  activePage: WorkspacePage;
  activeTheme: ThemeName;
  mobileMenuPages: WorkspacePage[];
  onChangeMobileMenu: (preferences: WorkspaceMobileMenuPreferences) => void;
  onChangeTheme: (theme: ThemeName) => void;
  onOpenShare: () => void;
  onOpenUpload: (target?: UploadTarget) => void;
  onShowToast: (message: string) => void;
  uploadRefreshKey: number;
  uploadTasks: UploadTask[];
}

/**
 * Renders the active workspace page while keeping App focused on shell state.
 */
export const WorkspaceContent = ({
  activePage,
  activeTheme,
  mobileMenuPages,
  onChangeMobileMenu,
  onChangeTheme,
  onOpenShare,
  onOpenUpload,
  onShowToast,
  uploadRefreshKey,
  uploadTasks,
}: WorkspaceContentProps) => {
  if (activePage === 'admin') {
    return <AdminPage onShowToast={onShowToast} uploadTasks={uploadTasks} />;
  }

  if (activePage === 'albums') {
    return <ModulePendingPage page={activePage} />;
  }

  if (activePage === 'folders') {
    return (
      <FoldersPage
        onOpenUpload={onOpenUpload}
        onShowToast={onShowToast}
        uploadRefreshKey={uploadRefreshKey}
      />
    );
  }

  if (activePage === 'share') {
    return <SharePage onOpenShare={onOpenShare} />;
  }

  if (activePage === 'settings') {
    return (
      <SettingsPage
        activeTheme={activeTheme}
        mobileMenuPages={mobileMenuPages}
        onChangeMobileMenu={onChangeMobileMenu}
        onChangeTheme={onChangeTheme}
        onShowToast={onShowToast}
      />
    );
  }

  if (activePage === 'trash') {
    return <TrashPage onShowToast={onShowToast} />;
  }

  return <ModulePendingPage page={activePage} />;
};

/**
 * Renders sharing management table placeholder.
 */
const SharePage = ({ onOpenShare }: { onOpenShare: () => void }) => {
  return (
    <>
      <div className="section-heading">
        <h3>分享管理</h3>
        <button className="primary-btn" onClick={onOpenShare} type="button">
          创建分享
        </button>
      </div>
      <ModulePendingPage page="share" />
    </>
  );
};

/**
 * Renders recycle-bin first screen.
 */
const TrashPage = ({ onShowToast }: { onShowToast: (message: string) => void }) => {
  return (
    <>
      <div className="section-heading">
        <h3>回收站</h3>
        <button className="secondary-btn" onClick={() => onShowToast('永久删除需要强确认')} type="button">
          永久删除所选
        </button>
      </div>
      <ModulePendingPage page="trash" />
    </>
  );
};

/**
 * Renders an empty module state before its real API is wired.
 */
const ModulePendingPage = ({ page }: { page: WorkspacePage }) => {
  const [title, subtitle] = PAGE_COPY[page];

  return (
    <div className="empty-state">
      <div className="empty-orbit" />
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <span>该模块已在接口覆盖矩阵中排期。</span>
    </div>
  );
};
