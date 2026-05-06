import { Check, ShieldCheck, Wifi } from 'lucide-react';
import { useMemo, useState } from 'react';

import { fetchApiInfo } from '../services/auth-service';
import { NAVIGATION_ITEMS } from '../shared/app-config';
import { renderWorkspacePageIcon } from '../shared/navigation-icons';
import { THEME_NAMES, THEME_TOKENS } from '../shared/theme';
import type { ApiInfo, ThemeName, WorkspacePage } from '../shared/types';
import {
  getServerAddressCandidates,
  readServerAddressPreferences,
  writeServerAddressPreferences,
  type WorkspaceMobileMenuPreferences,
  type WorkspaceServerAddressPreferenceRole,
} from '../shared/workspace-preferences';
import { useSessionStore } from '../stores/session-store';

interface SettingsPageProps {
  activeTheme: ThemeName;
  mobileMenuPages: WorkspacePage[];
  onChangeMobileMenu: (preferences: WorkspaceMobileMenuPreferences) => void;
  onChangeTheme: (theme: ThemeName) => void;
  onShowToast: (message: string) => void;
}

type ServerTestTarget = WorkspaceServerAddressPreferenceRole;

const MOBILE_MENU_MIN_COUNT = 3;
const MOBILE_MENU_MAX_COUNT = 6;

/**
 * Renders workspace settings that already have real local behavior.
 */
export const SettingsPage = ({
  activeTheme,
  mobileMenuPages,
  onChangeMobileMenu,
  onChangeTheme,
  onShowToast,
}: SettingsPageProps) => {
  const serverUrl = useSessionStore((state) => state.serverUrl);
  const switchServerUrl = useSessionStore((state) => state.switchServerUrl);
  const user = useSessionStore((state) => state.user);
  const initialServerPreferences = useMemo(() => readServerAddressPreferences(), []);
  const [primaryUrl, setPrimaryUrl] = useState(initialServerPreferences.primaryUrl || serverUrl);
  const [backupUrl, setBackupUrl] = useState(initialServerPreferences.backupUrl);
  const [preferred, setPreferred] = useState<WorkspaceServerAddressPreferenceRole>(
    initialServerPreferences.preferred,
  );
  const [addressHistory, setAddressHistory] = useState<string[]>(initialServerPreferences.history);
  const [testingTarget, setTestingTarget] = useState<ServerTestTarget>();
  const [testResult, setTestResult] = useState<Partial<Record<ServerTestTarget, string>>>({});
  const availableNavigationItems = useMemo(
    () => NAVIGATION_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin),
    [user?.isAdmin],
  );
  const visibleAddressHistory = useMemo(
    () => normalizeAddressList([primaryUrl, backupUrl, serverUrl, ...addressHistory]),
    [addressHistory, backupUrl, primaryUrl, serverUrl],
  );

  /**
   * Saves the server address configuration into workspace preferences.
   */
  const handleSaveServerAddresses = async (): Promise<void> => {
    if (!primaryUrl.trim() && !backupUrl.trim()) {
      onShowToast('请至少配置一个服务端地址');
      return;
    }

    writeServerAddressPreferences({
      backupUrl,
      history: addressHistory,
      preferred,
      primaryUrl,
    });
    syncServerAddressState();

    const savedPreferences = readServerAddressPreferences();
    const candidates = getServerAddressCandidates(savedPreferences);

    await applyServerAddressCandidates(candidates);
  };

  /**
   * Tests one configured server address by reading its public API info.
   */
  const handleTestServer = async (target: ServerTestTarget, url: string): Promise<void> => {
    const normalizedUrl = normalizeServerAddress(url);

    if (!normalizedUrl) {
      onShowToast('请先填写服务端地址');
      return;
    }

    setTestingTarget(target);

    try {
      const apiInfo = await fetchApiInfo(normalizedUrl);
      setTestResult((current) => ({
        ...current,
        [target]: formatApiInfo(apiInfo),
      }));
      onShowToast(`${target === 'primary' ? '主地址' : '备用地址'}连通正常`);
    } catch {
      setTestResult((current) => ({
        ...current,
        [target]: '连接失败，请检查地址或网络',
      }));
      onShowToast('服务端连接失败');
    } finally {
      setTestingTarget(undefined);
    }
  };

  /**
   * Applies a saved server address to either the primary or backup slot.
   */
  const handleUseHistoryAddress = async (target: ServerTestTarget, url: string): Promise<void> => {
    const nextPrimaryUrl = target === 'primary' ? url : primaryUrl;
    const nextBackupUrl = target === 'backup' ? url : backupUrl;

    writeServerAddressPreferences({
      backupUrl: nextBackupUrl,
      history: addressHistory,
      preferred,
      primaryUrl: nextPrimaryUrl,
    });
    syncServerAddressState();

    const savedPreferences = readServerAddressPreferences();

    if (savedPreferences.preferred === target) {
      await applyServerAddressCandidates(getServerAddressCandidates(savedPreferences));
      return;
    }

    onShowToast(target === 'primary' ? '已设为主地址' : '已设为备用地址');
  };

  /**
   * Tests addresses in priority order and switches the global session URL to the first reachable one.
   */
  const applyServerAddressCandidates = async (candidates: string[]): Promise<void> => {
    if (candidates.length === 0) {
      onShowToast('服务端地址配置已保存');
      return;
    }

    const currentServerUrl = normalizeServerAddress(serverUrl);

    for (const candidate of candidates) {
      try {
        await switchServerUrl(candidate);
        onShowToast(
          candidate === currentServerUrl
            ? '服务端地址配置已保存，当前地址连通正常'
            : `服务端地址已切换到 ${candidate}`,
        );
        return;
      } catch {
        // Continue to the next configured address; the final toast explains if all fail.
      }
    }

    onShowToast('地址已保存，但主地址和备用地址当前都无法连通，已保留当前请求地址');
  };

  /**
   * Toggles one mobile tabbar item while enforcing product constraints.
   */
  const handleToggleMobileMenuPage = (page: WorkspacePage): void => {
    if (page === 'settings') {
      return;
    }

    const exists = mobileMenuPages.includes(page);
    const nextPages = exists
      ? mobileMenuPages.filter((item) => item !== page)
      : [...mobileMenuPages, page];

    if (exists && nextPages.length < MOBILE_MENU_MIN_COUNT) {
      onShowToast('移动端底部菜单至少展示 3 个');
      return;
    }

    if (!exists && nextPages.length > MOBILE_MENU_MAX_COUNT) {
      onShowToast('移动端底部菜单最多展示 6 个');
      return;
    }

    onChangeMobileMenu({ pages: nextPages });
  };

  /**
   * Reloads persisted server address state after helper-level normalization.
   */
  const syncServerAddressState = (): void => {
    const savedPreferences = readServerAddressPreferences();

    setPrimaryUrl(savedPreferences.primaryUrl);
    setBackupUrl(savedPreferences.backupUrl);
    setPreferred(savedPreferences.preferred);
    setAddressHistory(savedPreferences.history);
  };

  return (
    <div className="settings-page">
      <section className="settings-section">
        <div className="settings-section__title">
          <div>
            <strong>服务端地址配置</strong>
            <span>保存后主地址和备用地址都会加入服务端地址列表。</span>
          </div>
          <button className="primary-btn" onClick={() => void handleSaveServerAddresses()} type="button">
            保存地址
          </button>
        </div>

        <div className="settings-form-grid">
          <label className="settings-field">
            主地址
            <div className="settings-input-action">
              <input
                onChange={(event) => setPrimaryUrl(event.target.value)}
                placeholder="https://photo.example.com"
                value={primaryUrl}
              />
              <button
                className="secondary-btn"
                disabled={testingTarget === 'primary'}
                onClick={() => void handleTestServer('primary', primaryUrl)}
                type="button"
              >
                <Wifi size={15} />
                {testingTarget === 'primary' ? '检测中' : '测试'}
              </button>
            </div>
            {testResult.primary ? <span>{testResult.primary}</span> : null}
          </label>

          <label className="settings-field">
            备用地址
            <div className="settings-input-action">
              <input
                onChange={(event) => setBackupUrl(event.target.value)}
                placeholder="https://backup.example.com"
                value={backupUrl}
              />
              <button
                className="secondary-btn"
                disabled={testingTarget === 'backup'}
                onClick={() => void handleTestServer('backup', backupUrl)}
                type="button"
              >
                <Wifi size={15} />
                {testingTarget === 'backup' ? '检测中' : '测试'}
              </button>
            </div>
            {testResult.backup ? <span>{testResult.backup}</span> : null}
          </label>
        </div>

        <div className="settings-radio-row" role="radiogroup" aria-label="服务端优先使用">
          <span>两个地址都可访问时优先使用</span>
          <button
            className={preferred === 'primary' ? 'is-active' : ''}
            onClick={() => {
              setPreferred('primary');
              writeServerAddressPreferences({
                backupUrl,
                history: addressHistory,
                preferred: 'primary',
                primaryUrl,
              });
            }}
            type="button"
          >
            主地址
          </button>
          <button
            className={preferred === 'backup' ? 'is-active' : ''}
            onClick={() => {
              setPreferred('backup');
              writeServerAddressPreferences({
                backupUrl,
                history: addressHistory,
                preferred: 'backup',
                primaryUrl,
              });
            }}
            type="button"
          >
            备用地址
          </button>
        </div>

        <div className="settings-address-list">
          <strong>服务端地址列表</strong>
          {visibleAddressHistory.length > 0 ? (
            visibleAddressHistory.map((url) => (
              <article className="settings-address-row" key={url}>
                <span title={url}>{url}</span>
                <div>
                  <button className="secondary-btn" onClick={() => void handleUseHistoryAddress('primary', url)} type="button">
                    设为主
                  </button>
                  <button className="secondary-btn" onClick={() => void handleUseHistoryAddress('backup', url)} type="button">
                    设为备
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="settings-empty-line">暂无保存的服务端地址。</div>
          )}
        </div>
      </section>

      <section className="settings-section settings-mobile-only-section">
        <div className="settings-section__title">
          <div>
            <strong>移动端底部菜单</strong>
            <span>仅移动端生效，最少 3 个、最多 6 个，设置必须展示。</span>
          </div>
          <span className="settings-count-pill">{mobileMenuPages.length}/{MOBILE_MENU_MAX_COUNT}</span>
        </div>
        <div className="settings-chip-grid">
          {availableNavigationItems.map((item) => {
            const selected = mobileMenuPages.includes(item.page);
            const required = item.page === 'settings';

            return (
              <button
                className={selected ? 'settings-chip is-active' : 'settings-chip'}
                disabled={required}
                key={item.page}
                onClick={() => handleToggleMobileMenuPage(item.page)}
                type="button"
              >
                <span className="settings-chip__icon">
                  {renderWorkspacePageIcon(item.page, { size: 17, strokeWidth: 2.2 })}
                </span>
                <strong>{item.label}</strong>
                {selected ? <Check size={14} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <div className="settings-section__title">
          <div>
            <strong>全局主题颜色</strong>
            <span>影响按钮、选中态、封面占位和移动端导航高亮。</span>
          </div>
          <ShieldCheck size={18} />
        </div>
        <div className="settings-theme-grid">
          {THEME_NAMES.map((theme) => (
            <button
              className={theme === activeTheme ? 'settings-theme-dot is-active' : 'settings-theme-dot'}
              key={theme}
              onClick={() => {
                onChangeTheme(theme);
                onShowToast('主题颜色已更新');
              }}
              type="button"
            >
              <span style={{ background: THEME_TOKENS[theme].hex }} />
              <strong>{getThemeLabel(theme)}</strong>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

const normalizeServerAddress = (value: string): string => {
  return value.trim().replace(/\/+$/, '');
};

const normalizeAddressList = (addresses: string[]): string[] => {
  return Array.from(new Set(addresses.map(normalizeServerAddress).filter(Boolean)));
};

const formatApiInfo = (apiInfo: ApiInfo): string => {
  return `API ${apiInfo.version}${apiInfo.build ? ` #${apiInfo.build}` : ''} · ${apiInfo.platform ?? 'unknown'}`;
};

const getThemeLabel = (theme: ThemeName): string => {
  const labels: Record<ThemeName, string> = {
    blue: '蓝',
    cyan: '青',
    gray: '灰',
    green: '绿',
    indigo: '靛',
    orange: '橙',
    pink: '粉',
    purple: '紫',
    red: '红',
    rose: '玫',
    teal: '蓝绿',
    yellow: '黄',
  };

  return labels[theme];
};
