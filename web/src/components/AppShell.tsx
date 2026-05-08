import {
  ChevronDown,
  DatabaseZap,
  LogOut,
  MonitorCog,
  Search,
  Upload,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { DesktopRuntimeInfo } from "../platform/desktop-bridge";
import { getPlatformLabel, readDesktopRuntimeInfo } from "../platform/runtime";
import { NAVIGATION_ITEMS, PAGE_COPY } from "../shared/app-config";
import { renderWorkspacePageIcon } from "../shared/navigation-icons";
import { THEME_NAMES, THEME_TOKENS } from "../shared/theme";
import type { ApiInfo, CurrentUser, NavigationItem, ThemeName, ViewMode, WorkspacePage } from "../shared/types";

interface AppShellProps {
  activePage: WorkspacePage;
  activeTheme: ThemeName;
  apiInfo?: ApiInfo;
  mobileMenuPages: WorkspacePage[];
  viewMode: ViewMode;
  children: ReactNode;
  serverUrl: string;
  user?: CurrentUser;
  onChangePage: (page: WorkspacePage) => void;
  onChangeTheme: (theme: ThemeName) => void;
  onChangeViewMode: (mode: ViewMode) => void;
  onLogout: () => void;
  onOpenCommand: () => void;
  onOpenUpload: () => void;
}

const LIBRARY_PAGES: WorkspacePage[] = ['photos', 'recent', 'albums', 'folders', 'people', 'map'];
const ACTION_PAGES: WorkspacePage[] = ['search', 'tags', 'upload', 'share', 'trash', 'hidden'];
const SYSTEM_PAGES: WorkspacePage[] = ['admin', 'settings'];
const APP_ICON_SRC = `${import.meta.env.BASE_URL}app-icon.svg`;

/**
 * Renders the desktop workspace shell shared by Web and Electron targets.
 */
export const AppShell = ({
  activePage,
  activeTheme,
  apiInfo,
  mobileMenuPages,
  viewMode,
  children,
  serverUrl,
  user,
  onChangePage,
  onChangeTheme,
  onChangeViewMode,
  onLogout,
  onOpenCommand,
  onOpenUpload,
}: AppShellProps) => {
  const [serverCardOpen, setServerCardOpen] = useState(false);
  const [desktopRuntimeInfo, setDesktopRuntimeInfo] = useState<DesktopRuntimeInfo>();
  const [title, subtitle] = PAGE_COPY[activePage];
  const visibleItems = NAVIGATION_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin);
  const mobileItems = visibleItems.filter((item) => mobileMenuPages.includes(item.page));
  const serverHost = getServerHost(serverUrl);
  const username = user?.username ?? 'MT Photos';
  const userRole = getUserRoleLabel(user);
  const platformLabel = getPlatformLabel();
  const runtimeVersion = formatRuntimeVersion(desktopRuntimeInfo);
  const cacheBackendLabel = desktopRuntimeInfo ? 'App Data' : 'IndexedDB';

  useEffect(() => {
    let mounted = true;

    void readDesktopRuntimeInfo().then((info) => {
      if (mounted) {
        setDesktopRuntimeInfo(info);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Renders one navigation row with active and permission-aware state.
   */
  const renderNavItem = (item: NavigationItem) => {
    return (
      <button
        className={item.page === activePage ? "nav-item is-active" : "nav-item"}
        key={item.page}
        onClick={() => onChangePage(item.page)}
        type="button"
      >
        <span className="nav-icon nav-icon--lucide">
          {renderWorkspacePageIcon(item.page, { size: 16, strokeWidth: 2.1 })}
        </span>
        <span className="nav-label">{item.label}</span>
        {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src={APP_ICON_SRC} alt="KW Photo" className="brand-mark" />
          <div>
            <h1>KW Photo</h1>
            <p>Desktop workspace</p>
          </div>
        </div>

        <section className={serverCardOpen ? "server-card is-open" : "server-card"}>
          <div className="server-card__top">
            <strong>{serverHost}</strong>
            <div className="server-card__actions">
              <span className="status-pill">
                <span />
                在线
              </span>
              <button
                aria-expanded={serverCardOpen}
                aria-label={serverCardOpen ? "收起服务端信息" : "展开服务端信息"}
                className="icon-btn server-card__toggle"
                onClick={() => setServerCardOpen((current) => !current)}
                type="button"
              >
                <ChevronDown size={15} />
              </button>
            </div>
          </div>
          {serverCardOpen ? (
            <div className="server-card__body">
              <p>
                API {apiInfo?.version ?? 'unknown'}
                {apiInfo?.build ? ` #${apiInfo.build}` : ''}
              </p>
              <div className="theme-row">
                {THEME_NAMES.map((theme) => (
                  <button
                    aria-label={`切换到 ${theme} 主题`}
                    className={
                      theme === activeTheme ? "theme-dot is-active" : "theme-dot"
                    }
                    key={theme}
                    onClick={() => onChangeTheme(theme)}
                    style={{ background: THEME_TOKENS[theme].hex }}
                    type="button"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="runtime-card" aria-label="运行环境">
          <div className="runtime-card__row">
            <MonitorCog size={15} />
            <span>{platformLabel}</span>
            <strong>{runtimeVersion}</strong>
          </div>
          <div className="runtime-card__row">
            <DatabaseZap size={15} />
            <span>缓存</span>
            <strong>{cacheBackendLabel}</strong>
          </div>
        </section>

        <nav className="nav-group" aria-label="主导航">
          <div className="nav-title">Library</div>
          {visibleItems.filter((item) => LIBRARY_PAGES.includes(item.page)).map(renderNavItem)}

          <div className="nav-title">Actions</div>
          {visibleItems.filter((item) => ACTION_PAGES.includes(item.page)).map(renderNavItem)}

          <div className="nav-title">System</div>
          {visibleItems.filter((item) => SYSTEM_PAGES.includes(item.page)).map(renderNavItem)}
        </nav>

        <div className="user-card">
          <div className="avatar">
            <UserRound size={17} strokeWidth={2.1} />
          </div>
          <div>
            <strong>{username}</strong>
            <p>{userRole} · 主题可切换</p>
          </div>
          <button aria-label="退出登录" className="icon-btn logout-icon-btn" onClick={onLogout} type="button">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="page-title">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="toolbar">
            <button
              className="search-box"
              onClick={onOpenCommand}
              type="button"
            >
              <Search size={16} />
              <span>搜索照片、地点、人物、OCR...</span>
              <kbd>⌘K</kbd>
            </button>
            <button className="secondary-btn" type="button">
              跳转日期
            </button>
            <div className="segmented">
              {(["timeline", "grid", "list"] as ViewMode[]).map((mode) => (
                <button
                  className={
                    mode === viewMode
                      ? "segmented-btn is-active"
                      : "segmented-btn"
                  }
                  key={mode}
                  onClick={() => onChangeViewMode(mode)}
                  type="button"
                >
                  {mode === "timeline"
                    ? "时间线"
                    : mode === "grid"
                      ? "网格"
                      : "列表"}
                </button>
              ))}
            </div>
            <button
              className="primary-btn"
              onClick={onOpenUpload}
              type="button"
            >
              <Upload size={16} />
              上传
            </button>
            <div className="account-pill" title={`当前登录：${username}`}>
              <span className="account-pill__avatar">
                <UserRound size={14} strokeWidth={2.2} />
              </span>
              <span className="account-pill__meta">
                <strong>{username}</strong>
                <em>{userRole}</em>
              </span>
            </div>
            <button
              aria-label="退出登录"
              className="logout-btn"
              onClick={onLogout}
              type="button"
            >
              <LogOut size={16} />
              <span>退出</span>
            </button>
          </div>
        </header>

        {children}
      </main>

      <nav aria-label="移动端主导航" className="mobile-tabbar">
        {mobileItems.map((item) => (
          <button
            className={item.page === activePage ? "mobile-tabbar__item is-active" : "mobile-tabbar__item"}
            key={item.page}
            onClick={() => onChangePage(item.page)}
            type="button"
          >
            <span className="mobile-tabbar__icon">{renderWorkspacePageIcon(item.page)}</span>
            <strong>{item.label}</strong>
          </button>
        ))}
      </nav>
    </div>
  );
};

const getServerHost = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl || '未连接服务端';
  }
};

/**
 * Returns the role label shown near the current login user.
 */
const getUserRoleLabel = (user?: CurrentUser): string => {
  return user?.isAdmin ? '管理员' : '普通用户';
};

const formatRuntimeVersion = (info?: DesktopRuntimeInfo): string => {
  if (!info?.versions.electron) {
    return 'Browser';
  }

  return `v${info.versions.electron}`;
};
