import { useEffect, useMemo, useState } from 'react';

import { AppShell } from './components/AppShell';
import { CommandPalette } from './components/CommandPalette';
import { ConnectionGate } from './components/ConnectionGate';
import { FloatingActionMenu } from './components/FloatingActionMenu';
import { LogoutConfirmDialog } from './components/LogoutConfirmDialog';
import { ShareDialog } from './components/ShareDialog';
import { SplashScreen } from './components/SplashScreen';
import { UploadDrawer } from './components/UploadDrawer';
import { WorkspaceContent } from './components/WorkspaceContent';
import { useUploadCenter } from './hooks/useUploadCenter';
import { applyTheme, THEME_NAMES } from './shared/theme';
import type { CommandItem, ThemeName, ViewMode, WorkspacePage } from './shared/types';
import {
  loadWorkspacePreferences,
  saveWorkspacePreferences,
  writeMobileMenuPreferences,
  type WorkspaceMobileMenuPreferences,
} from './shared/workspace-preferences';
import { useSessionStore } from './stores/session-store';

/**
 * Root application component for the cross-platform MT Photos client.
 */
const App = () => {
  const apiInfo = useSessionStore((state) => state.apiInfo);
  const connect = useSessionStore((state) => state.connect);
  const error = useSessionStore((state) => state.error);
  const hydrate = useSessionStore((state) => state.hydrate);
  const login = useSessionStore((state) => state.login);
  const logout = useSessionStore((state) => state.logout);
  const refresh = useSessionStore((state) => state.refresh);
  const serverUrl = useSessionStore((state) => state.serverUrl);
  const sessionStatus = useSessionStore((state) => state.status);
  const tokens = useSessionStore((state) => state.tokens);
  const user = useSessionStore((state) => state.user);
  const splashVisible = sessionStatus === 'booting' || (sessionStatus === 'checking' && Boolean(tokens?.refreshToken));
  const initialWorkspacePreferences = useMemo(() => loadWorkspacePreferences(), []);
  const [activePage, setActivePage] = useState<WorkspacePage>(initialWorkspacePreferences.activePage);
  const [activeTheme, setActiveTheme] = useState<ThemeName>(initialWorkspacePreferences.activeTheme);
  const [mobileMenuPages, setMobileMenuPages] = useState<WorkspacePage[]>(
    initialWorkspacePreferences.mobileMenu.pages,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(initialWorkspacePreferences.viewMode);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandKeyword, setCommandKeyword] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [splashMounted, setSplashMounted] = useState(splashVisible);
  const [toast, setToast] = useState('');
  const {
    closeUpload,
    drawerProps: uploadDrawerProps,
    openUpload,
    refreshKey: uploadRefreshKey,
  } = useUploadCenter({
    onShowToast: setToast,
    refresh,
    serverUrl,
  });

  const commands = useMemo<CommandItem[]>(
    () => [
      {
        icon: '▦',
        title: '打开照片时间线',
        description: '进入当前图库月份照片墙',
        action: () => setActivePage('photos'),
      },
      {
        icon: '▤',
        title: '打开文件夹',
        description: '查看真实目录、封面和文件夹上传',
        action: () => setActivePage('folders'),
      },
      {
        icon: '⇧',
        title: '打开上传中心',
        description: '查看上传队列和失败重试',
        action: () => openUpload(),
      },
      {
        icon: '⤴',
        title: '创建分享',
        description: '为当前选择生成分享链接',
        action: () => setShareOpen(true),
      },
      {
        icon: '⌕',
        title: 'CLIP 语义搜索',
        description: '搜索自然语言描述的照片',
        action: () => setActivePage('search'),
      },
      {
        icon: '⚙',
        title: '管理中心',
        description: '图库扫描、任务、用户和配置',
        action: () => setActivePage('admin'),
      },
    ].filter((command) => command.title !== '管理中心' || user?.isAdmin),
    [openUpload, user?.isAdmin],
  );

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (splashVisible) {
      setSplashMounted(true);
      return undefined;
    }

    if (!splashMounted) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSplashMounted(false), 260);

    return () => window.clearTimeout(timer);
  }, [splashMounted, splashVisible]);

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    saveWorkspacePreferences({
      activePage,
      activeTheme,
      mobileMenu: { pages: mobileMenuPages },
      viewMode,
    });
  }, [activePage, activeTheme, mobileMenuPages, viewMode]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && activePage === 'admin' && user && !user.isAdmin) {
      setActivePage('folders');
    }
  }, [activePage, sessionStatus, user]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    /**
     * Handles global shortcuts from the PRD.
     */
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (isEditableTarget(event.target) && event.key !== 'Escape') {
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === 'Escape') {
        setCommandOpen(false);
        closeUpload();
        setShareOpen(false);
        setLogoutConfirmOpen(false);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a') {
        return;
      }

      if (event.key === 'Delete') {
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeUpload]);

  /**
   * Changes page and opens page-owned drawers when necessary.
   */
  const handleChangePage = (page: WorkspacePage): void => {
    setActivePage(page);
    setFabOpen(false);

    if (page === 'upload') {
      openUpload();
    } else {
      closeUpload();
    }

  };

  /**
   * Cycles through the configured sage theme palette.
   */
  const handleCycleTheme = (): void => {
    const currentIndex = THEME_NAMES.indexOf(activeTheme);
    setActiveTheme(THEME_NAMES[(currentIndex + 1) % THEME_NAMES.length]);
  };

  /**
   * Updates mobile tabbar settings and lets the shared parser enforce limits.
   */
  const handleChangeMobileMenu = (preferences: WorkspaceMobileMenuPreferences): void => {
    writeMobileMenuPreferences(preferences);
    setMobileMenuPages(loadWorkspacePreferences().mobileMenu.pages);
  };

  /**
   * Clears the authenticated workspace after explicit logout confirmation.
   */
  const handleConfirmLogout = (): void => {
    setLogoutConfirmOpen(false);
    setCommandOpen(false);
    closeUpload();
    setShareOpen(false);
    setFabOpen(false);
    logout();
  };

  if (sessionStatus === 'booting') {
    return (
      <>
        <main className="app-boot-underlay" />
        {splashMounted ? <SplashScreen visible={splashVisible} /> : null}
      </>
    );
  }

  if (sessionStatus !== 'authenticated') {
    return (
      <>
        <ConnectionGate
          apiInfo={apiInfo}
          defaultServerUrl={serverUrl}
          error={error}
          onConnect={connect}
          onLogin={login}
          status={sessionStatus}
        />
        {splashMounted ? <SplashScreen visible={splashVisible} /> : null}
      </>
    );
  }

  return (
    <>
      <AppShell
        activePage={activePage}
        activeTheme={activeTheme}
        apiInfo={apiInfo}
        mobileMenuPages={mobileMenuPages}
        onChangePage={handleChangePage}
        onChangeTheme={setActiveTheme}
        onChangeViewMode={setViewMode}
        onLogout={() => setLogoutConfirmOpen(true)}
        onOpenCommand={() => setCommandOpen(true)}
        onOpenUpload={() => openUpload()}
        serverUrl={serverUrl}
        user={user}
        viewMode={viewMode}
      >
        <section className="workspace">
          <WorkspaceContent
            activePage={activePage}
            activeTheme={activeTheme}
            mobileMenuPages={mobileMenuPages}
            onChangeMobileMenu={handleChangeMobileMenu}
            onChangeTheme={setActiveTheme}
            onOpenShare={() => setShareOpen(true)}
            onOpenUpload={openUpload}
            onShowToast={setToast}
            uploadRefreshKey={uploadRefreshKey}
            uploadTasks={uploadDrawerProps.tasks}
          />
        </section>
      </AppShell>

      <FloatingActionMenu
        onCycleTheme={handleCycleTheme}
        onOpenCommand={() => setCommandOpen(true)}
        onOpenUpload={() => openUpload()}
        onToggle={() => setFabOpen((current) => !current)}
        open={fabOpen}
      />

      <CommandPalette
        commands={commands}
        keyword={commandKeyword}
        onChangeKeyword={setCommandKeyword}
        onClose={() => {
          setCommandOpen(false);
          setCommandKeyword('');
        }}
        open={commandOpen}
      />
      <UploadDrawer {...uploadDrawerProps} />
      <ShareDialog
        onClose={() => setShareOpen(false)}
        onCreate={() => {
          setShareOpen(false);
          setToast('分享链接已生成并复制');
        }}
        open={shareOpen}
        selectedCount={0}
      />
      <LogoutConfirmDialog
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        open={logoutConfirmOpen}
      />

      {toast ? (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      ) : null}
      {splashMounted ? <SplashScreen visible={splashVisible} /> : null}
    </>
  );
};

export default App;

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();

  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};
