import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { fetchApiInfo, getApiErrorMessage } from '@kwphoto/core';

import {
  getAllowedMobileNavItems,
  getMobileMenuMinCount,
  MOBILE_MENU_MAX_COUNT,
  REQUIRED_MOBILE_MENU_PAGE,
} from '../../mobile-navigation';
import {
  DEFAULT_MOBILE_THEME,
  MOBILE_THEME_TOKENS,
} from '../../mobile-theme';
import {
  clearMobileLocalCache,
  createMobileLocalCacheScope,
  readMobileCacheStats,
} from '../../mobile-local-cache';
import type { MobileCacheStats } from '../../mobile-local-cache';
import type { MobilePage, MobileSession } from '../../mobile-types';
import type {
  MobilePreferences,
  MobileServerAddressRole,
  MobileThemeName,
} from '../../mobile-storage';
import {
  getMobileServerAddressCandidates,
  mergeMobilePreferences,
  normalizeMobileServerAddress,
  normalizeMobileServerAddressList,
  readMobilePreferences,
  resetMobileBehaviorPreferences,
} from '../../mobile-storage';
import { formatApiInfo } from '../settingsFormatters';

type ServerTestTarget = MobileServerAddressRole;

interface UseMobileSettingsControllerParams {
  activeTheme: MobileThemeName;
  mobileMenuPages: MobilePage[];
  onApplyServerUrl: (serverUrl: string) => Promise<void>;
  onChangeActiveTheme: (theme: MobileThemeName) => void;
  onChangeMobileMenuPages: (pages: MobilePage[]) => void;
  session: MobileSession;
}

const SETTINGS_MESSAGE_VISIBLE_MS = 2200;

const EMPTY_CACHE_STATS: MobileCacheStats = {
  approximateSize: 0,
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
};

/**
 * Owns mobile settings state and side effects so the page can stay layout-focused.
 */
export const useMobileSettingsController = ({
  activeTheme,
  mobileMenuPages,
  onApplyServerUrl,
  onChangeActiveTheme,
  onChangeMobileMenuPages,
  session,
}: UseMobileSettingsControllerParams) => {
  const [addressHistory, setAddressHistory] = useState<string[]>([]);
  const [applyingServer, setApplyingServer] = useState(false);
  const [backupUrl, setBackupUrl] = useState('');
  const [cacheStats, setCacheStats] = useState<MobileCacheStats>(EMPTY_CACHE_STATS);
  const [localCacheEnabled, setLocalCacheEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [preferences, setPreferences] = useState<MobilePreferences>({});
  const [preferred, setPreferred] = useState<MobileServerAddressRole>('primary');
  const [primaryUrl, setPrimaryUrl] = useState(session.serverUrl);
  const [testResult, setTestResult] = useState<Partial<Record<ServerTestTarget, string>>>({});
  const [testingTarget, setTestingTarget] = useState<ServerTestTarget>();
  const availableNavItems = useMemo(
    () => getAllowedMobileNavItems(session.user.isAdmin),
    [session.user.isAdmin],
  );
  const visibleAddressHistory = useMemo(
    () => normalizeMobileServerAddressList([primaryUrl, backupUrl, session.serverUrl, ...addressHistory]),
    [addressHistory, backupUrl, primaryUrl, session.serverUrl],
  );
  const menuMinCount = getMobileMenuMinCount(session.user.isAdmin);
  const activeThemeToken = MOBILE_THEME_TOKENS[activeTheme] ?? MOBILE_THEME_TOKENS[DEFAULT_MOBILE_THEME];
  const cacheScope = useMemo(
    () =>
      createMobileLocalCacheScope({
        serverUrl: session.serverUrl,
        userId: session.user.id,
        username: session.user.username,
      }),
    [session.serverUrl, session.user.id, session.user.username],
  );

  const loadSettings = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const [nextStats, nextPreferences] = await Promise.all([
        readMobileCacheStats(cacheScope),
        readMobilePreferences(),
      ]);

      setCacheStats(nextStats);
      setPreferences(nextPreferences);
      setPrimaryUrl(nextPreferences.primaryServerUrl || nextPreferences.serverUrl || session.serverUrl);
      setBackupUrl(nextPreferences.backupServerUrl ?? '');
      setPreferred(nextPreferences.preferredServerAddress ?? 'primary');
      setAddressHistory(normalizeMobileServerAddressList(nextPreferences.serverAddressHistory ?? []));
      setLocalCacheEnabled(nextPreferences.localCacheEnabled ?? true);
    } finally {
      setLoading(false);
    }
  }, [cacheScope, session.serverUrl]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setMessage('');
    }, SETTINGS_MESSAGE_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [message]);

  /**
   * Tries saved addresses in priority order and keeps the current URL if all fail.
   */
  const applyServerAddressCandidates = async (candidates: string[]): Promise<void> => {
    if (candidates.length === 0) {
      setMessage('服务端地址配置已保存');
      return;
    }

    setApplyingServer(true);

    try {
      const currentServerUrl = normalizeMobileServerAddress(session.serverUrl);

      for (const candidate of candidates) {
        try {
          await onApplyServerUrl(candidate);
          await mergeMobilePreferences({ serverUrl: candidate });
          setMessage(
            candidate === currentServerUrl
              ? '服务端地址配置已保存，当前地址连通正常'
              : `服务端地址已切换到 ${candidate}`,
          );
          return;
        } catch {
          // Keep trying the next configured address; the final message explains the fallback.
        }
      }

      setMessage('地址已保存，但主地址和备用地址当前都无法连通，已保留当前请求地址');
    } finally {
      setApplyingServer(false);
    }
  };

  /**
   * Saves primary/backup addresses and switches to the first reachable candidate.
   */
  const handleSaveServerAddresses = async (): Promise<void> => {
    const nextPrimaryUrl = normalizeMobileServerAddress(primaryUrl);
    const nextBackupUrl = normalizeMobileServerAddress(backupUrl);

    if (!nextPrimaryUrl && !nextBackupUrl) {
      setMessage('请至少配置一个服务端地址');
      return;
    }

    const nextHistory = normalizeMobileServerAddressList([...addressHistory, nextPrimaryUrl, nextBackupUrl]);

    const nextPreferences = await mergeMobilePreferences({
      backupServerUrl: nextBackupUrl,
      preferredServerAddress: preferred,
      primaryServerUrl: nextPrimaryUrl,
      serverAddressHistory: nextHistory,
    });
    setPreferences(nextPreferences);
    setPrimaryUrl(nextPrimaryUrl);
    setBackupUrl(nextBackupUrl);
    setAddressHistory(nextHistory);
    await applyServerAddressCandidates(getMobileServerAddressCandidates(nextPreferences));
  };

  /**
   * Tests one configured server address without changing the active session.
   */
  const handleTestServer = async (target: ServerTestTarget, url: string): Promise<void> => {
    const normalizedUrl = normalizeMobileServerAddress(url);

    if (!normalizedUrl) {
      setMessage('请先填写服务端地址');
      return;
    }

    setTestingTarget(target);
    setMessage('');

    try {
      const apiInfo = await fetchApiInfo(normalizedUrl);

      setTestResult((current) => ({
        ...current,
        [target]: formatApiInfo(apiInfo),
      }));
      setMessage(`${target === 'primary' ? '主地址' : '备用地址'}连通正常`);
    } catch (error) {
      setTestResult((current) => ({
        ...current,
        [target]: '连接失败，请检查地址或网络',
      }));
      setMessage(getApiErrorMessage(error));
    } finally {
      setTestingTarget(undefined);
    }
  };

  /**
   * Applies a saved history address to the requested primary or backup slot.
   */
  const handleUseHistoryAddress = async (target: ServerTestTarget, url: string): Promise<void> => {
    const nextPrimaryUrl = target === 'primary' ? url : primaryUrl;
    const nextBackupUrl = target === 'backup' ? url : backupUrl;
    const normalizedPrimaryUrl = normalizeMobileServerAddress(nextPrimaryUrl);
    const normalizedBackupUrl = normalizeMobileServerAddress(nextBackupUrl);
    const nextHistory = normalizeMobileServerAddressList([...addressHistory, normalizedPrimaryUrl, normalizedBackupUrl]);

    setPrimaryUrl(normalizedPrimaryUrl);
    setBackupUrl(normalizedBackupUrl);
    setAddressHistory(nextHistory);
    const nextPreferences = await mergeMobilePreferences({
      backupServerUrl: normalizedBackupUrl,
      preferredServerAddress: preferred,
      primaryServerUrl: normalizedPrimaryUrl,
      serverAddressHistory: nextHistory,
    });
    setPreferences(nextPreferences);

    if (preferred === target) {
      await applyServerAddressCandidates(getMobileServerAddressCandidates(nextPreferences));
      return;
    }

    setMessage(target === 'primary' ? '已设为主地址' : '已设为备用地址');
  };

  /**
   * Persists which configured address should be tried first.
   */
  const handleChangePreferredServerAddress = async (nextPreferred: MobileServerAddressRole): Promise<void> => {
    setPreferred(nextPreferred);
    await mergeMobilePreferences({ preferredServerAddress: nextPreferred });
  };

  /**
   * Persists local cache switch and lets folder pages pick it up on next mount.
   */
  const handleToggleLocalCache = async (): Promise<void> => {
    const nextEnabled = !localCacheEnabled;

    setLocalCacheEnabled(nextEnabled);
    const nextPreferences = await mergeMobilePreferences({ localCacheEnabled: nextEnabled });

    setPreferences(nextPreferences);
    setMessage(nextEnabled ? '本地缓存已开启' : '本地缓存已关闭');
  };

  /**
   * Clears cached resources for the current account scope and refreshes the summary.
   */
  const handleClearCache = async (): Promise<void> => {
    await clearMobileLocalCache(cacheScope);
    setMessage('本账号缓存已清理');
    await loadSettings();
  };

  /**
   * Resets last page, last folder and admin tab behavior without clearing login or settings.
   */
  const handleResetBehavior = async (): Promise<void> => {
    const nextPreferences = await resetMobileBehaviorPreferences();

    setPreferences(nextPreferences);
    setMessage('用户行为记录已重置');
  };

  /**
   * Mirrors Web mobile-menu constraints and updates the native bottom tabbar immediately.
   */
  const handleToggleMobileMenuPage = (page: MobilePage): void => {
    if (page === REQUIRED_MOBILE_MENU_PAGE) {
      return;
    }

    const exists = mobileMenuPages.includes(page);
    const nextPages = exists
      ? mobileMenuPages.filter((item) => item !== page)
      : [...mobileMenuPages, page];

    if (exists && nextPages.length < menuMinCount) {
      setMessage(`移动端底部菜单至少展示 ${menuMinCount} 个`);
      return;
    }

    if (!exists && nextPages.length > MOBILE_MENU_MAX_COUNT) {
      setMessage(`移动端底部菜单最多展示 ${MOBILE_MENU_MAX_COUNT} 个`);
      return;
    }

    onChangeMobileMenuPages(nextPages);
    setMessage('移动端底部菜单已更新');
  };

  /**
   * Applies the selected theme and persists it through the workspace owner.
   */
  const handleChangeTheme = (theme: MobileThemeName): void => {
    onChangeActiveTheme(theme);
    setMessage('主题颜色已更新');
  };

  /**
   * Confirms clearing behavior persistence before changing local state.
   */
  const confirmResetBehavior = (): void => {
    Alert.alert('重置行为记录', '将清除最近页面、最近文件夹和管理中心 Tab，但保留登录、缓存开关、菜单、主题和服务端地址。', [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: () => void handleResetBehavior() },
    ]);
  };

  /**
   * Confirms cache deletion so accidental taps do not remove offline first-paint data.
   */
  const confirmClearCache = (): void => {
    Alert.alert('清理本地缓存', '将清除当前账号的目录快照、封面图、缩略图和预览媒体，不影响服务端文件。', [
      { text: '取消', style: 'cancel' },
      { text: '清理', style: 'destructive', onPress: () => void handleClearCache() },
    ]);
  };

  return {
    activeThemeToken,
    applyingServer,
    availableNavItems,
    backupUrl,
    cacheStats,
    confirmClearCache,
    confirmResetBehavior,
    handleChangeTheme,
    handleChangePreferredServerAddress,
    handleSaveServerAddresses,
    handleTestServer,
    handleToggleLocalCache,
    handleToggleMobileMenuPage,
    handleUseHistoryAddress,
    loading,
    localCacheEnabled,
    loadSettings,
    menuMinCount,
    message,
    preferences,
    preferred,
    primaryUrl,
    setBackupUrl,
    setPreferred,
    setPrimaryUrl,
    testResult,
    testingTarget,
    visibleAddressHistory,
  };
};
