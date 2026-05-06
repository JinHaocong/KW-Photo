import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MobileAdminPage } from './MobileAdminPage';
import { MobileFoldersHome } from './MobileFoldersHome';
import { MobileLoadingState } from './MobileLoadingState';
import { MobileSettingsPage } from './MobileSettingsPage';
import { MOBILE_NAV_ITEMS, normalizeMobileMenuPages } from './mobile-navigation';
import { mergeMobilePreferences, readMobilePreferences } from './mobile-storage';
import type { MobileThemeName } from './mobile-storage';
import {
  DEFAULT_MOBILE_THEME,
  MobileThemeContext,
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  MOBILE_THEME_TOKENS,
} from './mobile-theme';
import type { MobileThemeToken } from './mobile-theme';
import type { MobilePage, MobileSession } from './mobile-types';

type TabIconName = ComponentProps<typeof Ionicons>['name'];

interface MobileWorkspaceProps {
  initialActiveTheme: MobileThemeName;
  onApplyServerUrl: (serverUrl: string) => Promise<void>;
  onChangeRootTheme: (theme: MobileThemeName) => void;
  onChangeTokens: (tokens: MobileSession['tokens']) => void;
  onLogout: () => void;
  session: MobileSession;
}

/**
 * Owns the authenticated mobile shell and keeps Web modules mapped to mobile pages.
 */
export const MobileWorkspace = ({
  initialActiveTheme,
  onApplyServerUrl,
  onChangeRootTheme,
  onChangeTokens,
  onLogout,
  session,
}: MobileWorkspaceProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const [activePage, setActivePage] = useState<MobilePage>('folders');
  const [activeTheme, setActiveTheme] = useState<MobileThemeName>(initialActiveTheme);
  const [folderRootRequest, setFolderRootRequest] = useState(0);
  const [foldersMounted, setFoldersMounted] = useState(false);
  const [mobileMenuPages, setMobileMenuPages] = useState<MobilePage[]>(
    () => normalizeMobileMenuPages(undefined, session.user.isAdmin),
  );
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const initialActiveThemeRef = useRef(initialActiveTheme);
  const onChangeRootThemeRef = useRef(onChangeRootTheme);
  const activeThemeToken = MOBILE_THEME_TOKENS[activeTheme];
  const shouldRenderFolders = activePage === 'folders' || foldersMounted;
  const activePageUsesPlaceholder = !['folders', 'admin', 'settings'].includes(activePage);
  const visibleNavItems = useMemo(
    () =>
      MOBILE_NAV_ITEMS.filter((item) =>
        (!item.adminOnly || session.user.isAdmin) && mobileMenuPages.includes(item.key),
      ),
    [mobileMenuPages, session.user.isAdmin],
  );
  const tabbarSafeAreaStyle = useMemo(
    () => ({
      paddingBottom: Math.max(8, safeAreaInsets.bottom - 12),
    }),
    [safeAreaInsets.bottom],
  );

  useEffect(() => {
    onChangeRootThemeRef.current = onChangeRootTheme;
  }, [onChangeRootTheme]);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores the last mobile page after login/session hydration.
     */
    const hydratePreferences = async (): Promise<void> => {
      const preferences = await readMobilePreferences();
      const preferredPage = preferences.activePage;
      const nextMenuPages = normalizeMobileMenuPages(preferences.mobileMenuPages, session.user.isAdmin);

      if (!mounted) {
        return;
      }

      if (preferredPage && MOBILE_NAV_ITEMS.some((item) => item.key === preferredPage)) {
        const nextPage = preferredPage === 'admin' && !session.user.isAdmin
          ? getFallbackMobilePage(nextMenuPages)
          : preferredPage;

        setActivePage(nextMenuPages.includes(nextPage) ? nextPage : getFallbackMobilePage(nextMenuPages));
      }

      const nextTheme = preferences.activeTheme ?? initialActiveThemeRef.current;

      setActiveTheme(nextTheme);
      onChangeRootThemeRef.current(nextTheme);
      setMobileMenuPages(nextMenuPages);
      setPreferencesHydrated(true);
    };

    void hydratePreferences();

    return () => {
      mounted = false;
    };
  }, [session.user.isAdmin]);

  useEffect(() => {
    if (!preferencesHydrated) {
      return;
    }

    if (activePage === 'folders') {
      setFoldersMounted(true);
    }

    if (activePage === 'admin' && !session.user.isAdmin) {
      handleNavigate(getFallbackMobilePage(mobileMenuPages));
      return;
    }

    if (!mobileMenuPages.includes(activePage)) {
      handleNavigate(getFallbackMobilePage(mobileMenuPages));
    }
  }, [activePage, mobileMenuPages, preferencesHydrated, session.user.isAdmin]);

  /**
   * Switches bottom tabs through local state; folder drill-down owns native transitions separately.
   */
  const handleNavigate = (page: MobilePage): void => {
    if (page === 'admin' && !session.user.isAdmin) {
      return;
    }

    if (page === 'folders' && activePage === 'folders') {
      setFolderRootRequest((current) => current + 1);
    }

    setActivePage(page);
    void mergeMobilePreferences({ activePage: page });
  };

  /**
   * Persists the mobile bottom menu and keeps the active page visible.
   */
  const handleChangeMobileMenuPages = (pages: MobilePage[]): void => {
    const nextPages = normalizeMobileMenuPages(pages, session.user.isAdmin);

    setMobileMenuPages(nextPages);
    void mergeMobilePreferences({ mobileMenuPages: nextPages });

    if (!nextPages.includes(activePage)) {
      handleNavigate(nextPages[0] ?? 'settings');
    }
  };

  /**
   * Applies the native workspace theme immediately and persists it for relaunch.
   */
  const handleChangeActiveTheme = (theme: MobileThemeName): void => {
    if (theme === activeTheme) {
      return;
    }

    setActiveTheme(theme);
    onChangeRootTheme(theme);
    void mergeMobilePreferences({ activeTheme: theme });
  };

  if (!preferencesHydrated) {
    return (
      <View style={styles.bootPanel}>
        <MobileLoadingState
          description="同步主题、菜单和上次停留页面"
          icon="albums-outline"
          theme={activeThemeToken}
          title="正在恢复页面状态"
        />
      </View>
    );
  }

  return (
    <MobileThemeContext.Provider value={activeThemeToken}>
      <View style={styles.shell}>
        <View style={[styles.content, activePage === 'folders' ? styles.contentFullBleed : styles.contentPadded]}>
          {shouldRenderFolders ? (
            <View style={activePage === 'folders' ? styles.pageVisible : styles.pageHidden}>
              <MobileFoldersHome
                onChangeTokens={onChangeTokens}
                onLogout={onLogout}
                rootRequestVersion={folderRootRequest}
                session={session}
              />
            </View>
          ) : null}
          {activePage === 'admin' && session.user.isAdmin ? (
            <MobileAdminPage onChangeTokens={onChangeTokens} session={session} />
          ) : null}
          {activePage === 'settings' ? (
            <MobileSettingsPage
              activeTheme={activeTheme}
              mobileMenuPages={mobileMenuPages}
              onApplyServerUrl={onApplyServerUrl}
              onChangeActiveTheme={handleChangeActiveTheme}
              onChangeMobileMenuPages={handleChangeMobileMenuPages}
              onLogout={onLogout}
              session={session}
            />
          ) : null}
          {activePageUsesPlaceholder ? (
            <MobileModulePlaceholder
              onNavigate={handleNavigate}
              page={activePage}
              theme={activeThemeToken}
            />
          ) : null}
        </View>

        <View pointerEvents="box-none" style={styles.tabbarFrame}>
          <BlurView
            intensity={74}
            style={[styles.tabbarGlass, tabbarSafeAreaStyle]}
            tint="systemUltraThinMaterialLight"
          >
            <View style={styles.tabbarContent}>
              {visibleNavItems.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleNavigate(item.key)}
                  style={[
                    styles.tabbarItem,
                    activePage === item.key ? styles.activeTabbarItem : null,
                    activePage === item.key
                      ? { backgroundColor: activeThemeToken.selection, borderColor: activeThemeToken.light }
                      : null,
                  ]}
                >
                  <Ionicons
                    color={activePage === item.key ? activeThemeToken.hex : MOBILE_SAGE_SLATE.subtle}
                    name={item.icon as TabIconName}
                    size={19}
                  />
                  <Text
                    numberOfLines={1}
                    style={[styles.tabbarLabel, activePage === item.key ? { color: activeThemeToken.hex } : null]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text numberOfLines={1} style={styles.tabbarServerUrl}>
              {session.serverUrl}
            </Text>
          </BlurView>
        </View>
      </View>
    </MobileThemeContext.Provider>
  );
};

const MOBILE_PAGE_DESCRIPTIONS: Record<MobilePage, string> = {
  admin: '图库、任务、用户、缓存和系统状态维护。',
  albums: '相册集合、分享相册和自动相册规则。',
  folders: '按真实目录浏览、预览和整理文件。',
  hidden: '隐私文件浏览与隐藏状态管理。',
  map: '按地点查看带 GPS 信息的照片。',
  people: '人物头像墙、合并和隐藏识别结果。',
  photos: '按日期时间线浏览图库照片。',
  recent: '按导入时间查看最近新增文件。',
  search: '关键词、OCR、标签和语义搜索入口。',
  settings: '服务端、缓存、主题和菜单配置。',
  share: '创建和管理文件分享链接。',
  tags: '标签浏览、筛选和批量整理。',
  trash: '回收站文件恢复与删除确认。',
  upload: '移动端上传队列和扫描反馈。',
};

/**
 * Returns the first valid page from the persisted bottom menu.
 */
const getFallbackMobilePage = (pages: MobilePage[]): MobilePage => {
  return pages[0] ?? 'settings';
};

/**
 * Renders configured bottom-menu entries whose dedicated native screen is not wired yet.
 */
const MobileModulePlaceholder = ({
  onNavigate,
  page,
  theme,
}: {
  onNavigate: (page: MobilePage) => void;
  page: MobilePage;
  theme: MobileThemeToken;
}) => {
  const navItem = MOBILE_NAV_ITEMS.find((item) => item.key === page);
  const icon = (navItem?.icon ?? 'albums-outline') as TabIconName;
  const label = navItem?.label ?? '模块';

  return (
    <View style={styles.moduleScreen}>
      <View style={[styles.moduleCard, { borderColor: theme.light }]}>
        <View style={[styles.moduleIcon, { backgroundColor: theme.selection, borderColor: theme.light }]}>
          <Ionicons color={theme.hex} name={icon} size={26} />
        </View>
        <Text style={styles.moduleTitle}>{label}</Text>
        <Text style={styles.moduleDescription}>{MOBILE_PAGE_DESCRIPTIONS[page]}</Text>
        <View style={styles.moduleActions}>
          <Pressable
            onPress={() => onNavigate('folders')}
            style={[styles.modulePrimaryButton, { backgroundColor: theme.hex }]}
          >
            <Ionicons color="#fff" name="folder-open-outline" size={16} />
            <Text style={styles.modulePrimaryText}>文件夹</Text>
          </Pressable>
          <Pressable onPress={() => onNavigate('settings')} style={styles.moduleSecondaryButton}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="settings-outline" size={16} />
            <Text style={styles.moduleSecondaryText}>设置菜单</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeTabbarItem: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
  },
  bootPanel: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentFullBleed: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  contentPadded: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  moduleCard: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
    width: '100%',
  },
  moduleDescription: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  moduleIcon: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  modulePrimaryButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  modulePrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  moduleScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 96,
    paddingHorizontal: 14,
  },
  moduleSecondaryButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  moduleSecondaryText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  moduleTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 22,
    fontWeight: '900',
  },
  pageHidden: {
    display: 'none',
  },
  pageVisible: {
    flex: 1,
  },
  shell: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
  },
  tabbarFrame: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  tabbarGlass: {
    ...MOBILE_SAGE_SHADOWS.floating,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderTopColor: 'rgba(255, 255, 255, 0.82)',
    borderTopWidth: 1,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  tabbarContent: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 4,
    width: '100%',
  },
  tabbarItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    minHeight: 46,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  tabbarLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  tabbarServerUrl: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 8,
    fontWeight: '800',
    lineHeight: 11,
    marginTop: 2,
    opacity: 0.72,
    textAlign: 'center',
  },
});
