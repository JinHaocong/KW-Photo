import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ApiInfo } from '@kwphoto/core';
import { fetchApiInfo, getApiErrorMessage } from '@kwphoto/core';

import {
  getAllowedMobileNavItems,
  getMobileMenuMinCount,
  MOBILE_MENU_MAX_COUNT,
  REQUIRED_MOBILE_MENU_PAGE,
} from './mobile-navigation';
import type {
  MobilePreferences,
  MobileServerAddressRole,
  MobileThemeName,
} from './mobile-storage';
import {
  getMobileServerAddressCandidates,
  mergeMobilePreferences,
  normalizeMobileServerAddress,
  normalizeMobileServerAddressList,
  readMobilePreferences,
  resetMobileBehaviorPreferences,
} from './mobile-storage';
import {
  clearMobileLocalCache,
  createMobileLocalCacheScope,
  readMobileCacheStats,
} from './mobile-local-cache';
import type { MobileCacheStats } from './mobile-local-cache';
import {
  DEFAULT_MOBILE_THEME,
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  MOBILE_THEME_NAMES,
  MOBILE_THEME_TOKENS,
} from './mobile-theme';
import { MobilePullRefreshScrollView } from './MobileLoadingState';
import type { MobilePage, MobileSession } from './mobile-types';

interface MobileSettingsPageProps {
  activeTheme: MobileThemeName;
  mobileMenuPages: MobilePage[];
  onApplyServerUrl: (serverUrl: string) => Promise<void>;
  onChangeActiveTheme: (theme: MobileThemeName) => void;
  onChangeMobileMenuPages: (pages: MobilePage[]) => void;
  onLogout: () => void;
  session: MobileSession;
}

type ServerTestTarget = MobileServerAddressRole;
type MenuIconName = ComponentProps<typeof Ionicons>['name'];

const SETTINGS_MESSAGE_VISIBLE_MS = 2200;

/**
 * Renders mobile settings synchronized with the Web settings feature set.
 */
export const MobileSettingsPage = ({
  activeTheme,
  mobileMenuPages,
  onApplyServerUrl,
  onChangeActiveTheme,
  onChangeMobileMenuPages,
  onLogout,
  session,
}: MobileSettingsPageProps) => {
  const [addressHistory, setAddressHistory] = useState<string[]>([]);
  const [applyingServer, setApplyingServer] = useState(false);
  const [backupUrl, setBackupUrl] = useState('');
  const [cacheStats, setCacheStats] = useState<MobileCacheStats>({
    approximateSize: 0,
    coverCount: 0,
    directoryCount: 0,
    hdThumbnailCount: 0,
    mediaCount: 0,
    originalImageCount: 0,
    originalVideoCount: 0,
    thumbnailCount: 0,
  });
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

  return (
    <View style={styles.screen}>
      {message ? (
        <View pointerEvents="none" style={styles.notificationLayer}>
          <View
            style={[
              styles.notificationToast,
              { backgroundColor: activeThemeToken.selection, borderColor: activeThemeToken.light },
            ]}
          >
            <Ionicons color={activeThemeToken.hex} name="information-circle-outline" size={17} />
            <Text style={[styles.notificationText, { color: activeThemeToken.hex }]}>{message}</Text>
          </View>
        </View>
      ) : null}

      <MobilePullRefreshScrollView
        contentContainerStyle={styles.content}
        onRefresh={loadSettings}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        theme={activeThemeToken}
      >
        <SectionCard
          action={
            <Pressable
              disabled={applyingServer}
              onPress={() => void handleSaveServerAddresses()}
              style={[styles.primaryButton, { backgroundColor: activeThemeToken.hex }, applyingServer ? styles.disabledButton : null]}
            >
              <Text style={styles.primaryButtonText}>{applyingServer ? '切换中' : '保存地址'}</Text>
            </Pressable>
          }
          description="保存后主地址和备用地址都会加入服务端地址列表。"
          title="服务端地址配置"
        >
          <AddressInput
            label="主地址"
            onChangeText={setPrimaryUrl}
            onTest={() => void handleTestServer('primary', primaryUrl)}
            placeholder="https://photo.example.com"
            testing={testingTarget === 'primary'}
            testResult={testResult.primary}
            value={primaryUrl}
          />
          <AddressInput
            label="备用地址"
            onChangeText={setBackupUrl}
            onTest={() => void handleTestServer('backup', backupUrl)}
            placeholder="https://backup.example.com"
            testing={testingTarget === 'backup'}
            testResult={testResult.backup}
            value={backupUrl}
          />
          <View style={styles.radioRow}>
            <Text style={styles.radioLabel}>两个地址都可访问时优先使用</Text>
            <RadioPill
              active={preferred === 'primary'}
              label="主地址"
              onPress={() => {
                setPreferred('primary');
                void mergeMobilePreferences({ preferredServerAddress: 'primary' });
              }}
              themeColor={activeThemeToken.hex}
            />
            <RadioPill
              active={preferred === 'backup'}
              label="备用地址"
              onPress={() => {
                setPreferred('backup');
                void mergeMobilePreferences({ preferredServerAddress: 'backup' });
              }}
              themeColor={activeThemeToken.hex}
            />
          </View>
          <View style={styles.addressList}>
            <Text style={styles.addressListTitle}>服务端地址列表</Text>
            {visibleAddressHistory.length > 0 ? (
              visibleAddressHistory.map((url) => (
                <View key={url} style={styles.addressRow}>
                  <Text numberOfLines={1} style={styles.addressValue}>{url}</Text>
                  <View style={styles.addressActions}>
                    <SmallActionButton label="设为主" onPress={() => void handleUseHistoryAddress('primary', url)} />
                    <SmallActionButton label="设为备" onPress={() => void handleUseHistoryAddress('backup', url)} />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyLine}>暂无保存的服务端地址。</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard
          description={`仅移动端生效，最少 ${menuMinCount} 个、最多 ${MOBILE_MENU_MAX_COUNT} 个，设置必须展示。`}
          meta={`${mobileMenuPages.length}/${MOBILE_MENU_MAX_COUNT}`}
          title="移动端底部菜单"
        >
          <View style={styles.chipGrid}>
            {availableNavItems.map((item) => {
              const selected = mobileMenuPages.includes(item.key);
              const required = item.key === REQUIRED_MOBILE_MENU_PAGE;

              return (
                <MenuChip
                  disabled={required}
                  icon={item.icon}
                  key={item.key}
                  label={item.label}
                  onPress={() => handleToggleMobileMenuPage(item.key)}
                  selected={selected}
                  themeColor={activeThemeToken.hex}
                />
              );
            })}
          </View>
        </SectionCard>

        <SectionCard
          description="影响按钮、选中态、封面占位和移动端导航高亮。"
          meta={MOBILE_THEME_TOKENS[activeTheme].label}
          title="全局主题颜色"
        >
          <View style={styles.themeGrid}>
            {MOBILE_THEME_NAMES.map((theme) => (
              <Pressable
                key={theme}
                onPress={() => handleChangeTheme(theme)}
                style={[
                  styles.themeDot,
                  theme === activeTheme ? styles.activeThemeDot : null,
                  theme === activeTheme ? { borderColor: MOBILE_THEME_TOKENS[theme].hex } : null,
                ]}
              >
                <View style={[styles.themeSwatch, { backgroundColor: MOBILE_THEME_TOKENS[theme].hex }]} />
                <Text
                  style={[
                    styles.themeDotText,
                    theme === activeTheme ? { color: MOBILE_THEME_TOKENS[theme].hex } : null,
                  ]}
                >
                  {MOBILE_THEME_TOKENS[theme].label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard
          action={
            <Pressable onPress={() => void handleToggleLocalCache()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{localCacheEnabled ? '关闭' : '开启'}</Text>
            </Pressable>
          }
          description="开启后文件夹页会先展示本地目录快照，并按文件夹细分缓存封面、列表缩略图、高清缩略图和预览媒体。"
          meta={localCacheEnabled ? '已开启' : '已关闭'}
          title="本地缓存"
        >
          <InfoRow label="目录快照" value={`${cacheStats.directoryCount} 个`} />
          <InfoRow label="文件夹封面" value={`${cacheStats.coverCount} 张`} />
          <InfoRow label="列表缩略图" value={`${cacheStats.thumbnailCount} 张`} />
          <InfoRow label="高清缩略图" value={`${cacheStats.hdThumbnailCount} 张`} />
          <InfoRow label="原图预览" value={`${cacheStats.originalImageCount} 张`} />
          <InfoRow label="视频预览" value={`${cacheStats.originalVideoCount} 个`} />
          <InfoRow label="估算大小" value={formatStorageSize(cacheStats.approximateSize)} />
          <InfoRow label="最近缓存" value={formatTimestamp(cacheStats.latestCachedAt)} />
          <Pressable onPress={confirmClearCache} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>清理本账号缓存</Text>
          </Pressable>
        </SectionCard>

        <SectionCard description="保留你在移动端的最近页面、文件夹视图、排序和管理中心 Tab。" title="用户行为持久化">
          <InfoRow label="最近页面" value={preferences.activePage ?? '未记录'} />
          <InfoRow label="管理中心" value={formatAdminTab(preferences.activeAdminTab)} />
          <InfoRow
            label="最近文件夹"
            value={preferences.currentFolderId === undefined ? '根目录或未记录' : String(preferences.currentFolderId)}
          />
          <InfoRow label="文件夹视图" value={preferences.folderViewMode === 'list' ? '列表' : '网格'} />
          <InfoRow label="卡片大小" value={formatCardSize(preferences.folderCardSize)} />
          <InfoRow label="排序" value={formatSortPreference(preferences)} />
          <InfoRow label="封面图" value={preferences.showFolderCovers === false ? '隐藏' : '显示'} />
          <InfoRow label="最近账号" value={preferences.lastUsername ?? '未记录'} />
          <InfoRow label="最近服务" value={preferences.serverUrl ?? '未记录'} />
          <Pressable onPress={confirmResetBehavior} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>重置行为记录</Text>
          </Pressable>
        </SectionCard>

        <SectionCard title="账号">
          <InfoRow label="用户名" value={session.user.username} />
          <InfoRow label="角色" value={session.user.isAdmin ? '管理员' : '普通用户'} />
          <InfoRow label="两步验证" value={session.user.otpEnable ? '已开启' : '未开启'} />
          <InfoRow label="服务版本" value={session.apiInfo.version || 'unknown'} />
          <Pressable onPress={onLogout} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>退出登录</Text>
          </Pressable>
        </SectionCard>
      </MobilePullRefreshScrollView>
    </View>
  );
};

const SectionCard = ({
  action,
  children,
  description,
  meta,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  meta?: string;
  title: string;
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
        </View>
        {action ?? (meta ? <Text style={styles.countPill}>{meta}</Text> : null)}
      </View>
      {children}
    </View>
  );
};

const AddressInput = ({
  label,
  onChangeText,
  onTest,
  placeholder,
  testing,
  testResult,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  onTest: () => void;
  placeholder: string;
  testing: boolean;
  testResult?: string;
  value: string;
}) => {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputActionRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
          style={styles.input}
          value={value}
        />
        <Pressable disabled={testing} onPress={onTest} style={[styles.testButton, testing ? styles.disabledButton : null]}>
          <Text style={styles.testButtonText}>{testing ? '检测中' : '测试'}</Text>
        </Pressable>
      </View>
      {testResult ? <Text style={styles.fieldHint}>{testResult}</Text> : null}
    </View>
  );
};

const RadioPill = ({
  active,
  label,
  onPress,
  themeColor,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  themeColor: string;
}) => {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.radioPill, active ? styles.activePill : null, active ? { borderColor: themeColor } : null]}
    >
      <Text style={[styles.radioPillText, active ? { color: themeColor } : null]}>{label}</Text>
    </Pressable>
  );
};

const MenuChip = ({
  disabled,
  icon,
  label,
  onPress,
  selected,
  themeColor,
}: {
  disabled: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  selected: boolean;
  themeColor: string;
}) => {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.menuChip,
        selected ? styles.activePill : null,
        selected ? { borderColor: themeColor } : null,
        disabled ? styles.lockedChip : null,
      ]}
    >
      <Ionicons
        color={selected ? themeColor : MOBILE_SAGE_SLATE.muted}
        name={icon as MenuIconName}
        size={17}
      />
      <Text numberOfLines={1} style={[styles.menuChipText, selected ? { color: themeColor } : null]}>
        {label}
      </Text>
      {selected ? <Text style={[styles.menuChipCheck, { color: themeColor }]}>✓</Text> : null}
    </Pressable>
  );
};

const SmallActionButton = ({ label, onPress }: { label: string; onPress: () => void }) => {
  return (
    <Pressable onPress={onPress} style={styles.smallActionButton}>
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const formatApiInfo = (apiInfo: ApiInfo): string => {
  return `API ${apiInfo.version}${apiInfo.build ? ` #${apiInfo.build}` : ''} · ${apiInfo.platform ?? 'unknown'}`;
};

const formatStorageSize = (size: number): string => {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const formatTimestamp = (timestamp?: number): string => {
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

const formatCardSize = (size?: MobilePreferences['folderCardSize']): string => {
  if (size === 'small') {
    return '小';
  }

  if (size === 'large') {
    return '大';
  }

  return '中';
};

const formatAdminTab = (tab?: MobilePreferences['activeAdminTab']): string => {
  const labels: Record<NonNullable<MobilePreferences['activeAdminTab']>, string> = {
    cache: '缓存管理',
    gallery: '图库管理',
    overview: '总览',
    system: '系统状态',
    tasks: '后台任务',
    users: '用户管理',
  };

  return tab ? labels[tab] ?? '未记录' : '未记录';
};

const formatSortPreference = (preferences: MobilePreferences): string => {
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

const styles = StyleSheet.create({
  activePill: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
  },
  activeThemeDot: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
  },
  addressActions: {
    flexDirection: 'row',
    gap: 6,
  },
  addressList: {
    gap: 8,
  },
  addressListTitle: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  addressRow: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 9,
  },
  addressValue: {
    color: MOBILE_SAGE_SLATE.body,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  card: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 11,
    padding: 13,
  },
  cardDescription: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  cardTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 15,
    fontWeight: '900',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  content: {
    gap: 12,
    paddingBottom: 76,
  },
  countPill: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '900',
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dangerButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.48,
  },
  emptyLine: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
    paddingVertical: 6,
  },
  field: {
    gap: 7,
  },
  fieldHint: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  infoLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 0.38,
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    borderTopColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  infoValue: {
    color: MOBILE_SAGE_SLATE.strong,
    flex: 0.62,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  input: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    flex: 1,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 11,
  },
  inputActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  lockedChip: {
    opacity: 0.78,
  },
  menuChip: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  menuChipCheck: {
    fontSize: 12,
    fontWeight: '900',
  },
  menuChipText: {
    color: MOBILE_SAGE_SLATE.body,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  notificationLayer: {
    alignItems: 'center',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 12,
    zIndex: 20,
  },
  notificationText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  notificationToast: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    maxWidth: '100%',
    minHeight: 40,
    paddingHorizontal: 14,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  radioLabel: {
    color: MOBILE_SAGE_SLATE.subtle,
    flexBasis: '100%',
    fontSize: 12,
    fontWeight: '900',
  },
  radioPill: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  radioPillText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  radioRow: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 10,
  },
  screen: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
    gap: 10,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionTitleCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  smallActionButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  smallActionText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  testButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  themeDot: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '31%',
    flexDirection: 'row',
    gap: 8,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  themeDotText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeSwatch: {
    borderColor: '#fff',
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
});
