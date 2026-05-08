import Ionicons from '@expo/vector-icons/Ionicons';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MOBILE_MENU_MAX_COUNT,
  REQUIRED_MOBILE_MENU_PAGE,
} from './mobile-navigation';
import type {
  MobileExternalVideoPlayer,
  MobileThemeName,
} from './mobile-storage';
import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  MOBILE_THEME_NAMES,
  MOBILE_THEME_TOKENS,
} from './mobile-theme';
import type { MobilePage, MobileSession } from './mobile-types';
import {
  AddressInput,
  InfoRow,
  MenuChip,
  RadioPill,
  SectionCard,
  SmallActionButton,
} from './settings/SettingsPrimitives';
import {
  formatAdminTab,
  formatCardSize,
  formatExternalVideoPlayer,
  formatSortPreference,
  formatStorageSize,
  formatTimestamp,
} from './settings/settingsFormatters';
import { useMobileSettingsController } from './settings/hooks/useMobileSettingsController';

interface MobileSettingsPageProps {
  activeTheme: MobileThemeName;
  externalVideoPlayer: MobileExternalVideoPlayer;
  mobileMenuPages: MobilePage[];
  onApplyServerUrl: (serverUrl: string) => Promise<void>;
  onChangeExternalVideoPlayer: (player: MobileExternalVideoPlayer) => void;
  onChangeActiveTheme: (theme: MobileThemeName) => void;
  onChangeMobileMenuPages: (pages: MobilePage[]) => void;
  onLogout: () => void;
  session: MobileSession;
}

const SETTINGS_BOTTOM_TABBAR_PADDING = 132;
const SETTINGS_BOTTOM_TABBAR_SAFE_AREA_OFFSET = 98;

/**
 * Renders mobile settings synchronized with the Web settings feature set.
 */
export const MobileSettingsPage = ({
  activeTheme,
  externalVideoPlayer,
  mobileMenuPages,
  onApplyServerUrl,
  onChangeExternalVideoPlayer,
  onChangeActiveTheme,
  onChangeMobileMenuPages,
  onLogout,
  session,
}: MobileSettingsPageProps) => {
  const safeAreaInsets = useSafeAreaInsets();
  const contentBottomPadding = Math.max(
    SETTINGS_BOTTOM_TABBAR_PADDING,
    safeAreaInsets.bottom + SETTINGS_BOTTOM_TABBAR_SAFE_AREA_OFFSET,
  );
  const {
    activeThemeToken,
    applyingServer,
    availableNavItems,
    backupUrl,
    cacheStats,
    confirmClearAllCache,
    confirmClearUnusedCache,
    confirmClearUsefulCache,
    confirmResetBehavior,
    handleChangeExternalVideoPlayer,
    handleChangePreferredServerAddress,
    handleChangeTheme,
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
    setPrimaryUrl,
    testResult,
    testingTarget,
    visibleAddressHistory,
  } = useMobileSettingsController({
    activeTheme,
    externalVideoPlayer,
    mobileMenuPages,
    onApplyServerUrl,
    onChangeExternalVideoPlayer,
    onChangeActiveTheme,
    onChangeMobileMenuPages,
    session,
  });

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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        refreshControl={(
          <RefreshControl
            colors={[activeThemeToken.hex]}
            onRefresh={loadSettings}
            progressBackgroundColor="#fff"
            refreshing={loading}
            tintColor={activeThemeToken.hex}
          />
        )}
        showsVerticalScrollIndicator={false}
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
              onPress={() => void handleChangePreferredServerAddress('primary')}
              themeColor={activeThemeToken.hex}
            />
            <RadioPill
              active={preferred === 'backup'}
              label="备用地址"
              onPress={() => void handleChangePreferredServerAddress('backup')}
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
          description="开启后视频大屏会显示 Infuse 入口，用服务端原视频地址交给外部播放器。"
          meta={formatExternalVideoPlayer(externalVideoPlayer)}
          title="视频外部播放器"
        >
          <View style={styles.radioRow}>
            <RadioPill
              active={externalVideoPlayer === 'none'}
              label="关闭"
              onPress={() => handleChangeExternalVideoPlayer('none')}
              themeColor={activeThemeToken.hex}
            />
            <RadioPill
              active={externalVideoPlayer === 'infuse'}
              label="Infuse"
              onPress={() => handleChangeExternalVideoPlayer('infuse')}
              themeColor={activeThemeToken.hex}
            />
          </View>
        </SectionCard>

        <SectionCard
          action={
            <Pressable onPress={() => void handleToggleLocalCache()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{localCacheEnabled ? '关闭' : '开启'}</Text>
            </Pressable>
          }
          description="开启后文件夹页会先展示本地目录快照，并按文件夹细分缓存封面、列表缩略图、视频海报、高清缩略图和预览媒体。"
          meta={localCacheEnabled ? '已开启' : '已关闭'}
          title="本地缓存"
        >
          <InfoRow label="总缓存" value={formatStorageSize(cacheStats.totalSize)} />
          <InfoRow label="可用缓存" value={formatStorageSize(cacheStats.usefulSize)} />
          <InfoRow label="残留缓存" value={formatStorageSize(cacheStats.unusedSize)} />
          <InfoRow label="目录快照" value={`${cacheStats.directoryCount} 个`} />
          <InfoRow label="文件夹封面" value={`${cacheStats.coverCount} 张`} />
          <InfoRow label="列表缩略图" value={`${cacheStats.thumbnailCount} 张`} />
          <InfoRow label="视频海报" value={`${cacheStats.videoPosterCount} 张`} />
          <InfoRow label="高清缩略图" value={`${cacheStats.hdThumbnailCount} 张`} />
          <InfoRow label="原图预览" value={`${cacheStats.originalImageCount} 张`} />
          <InfoRow label="视频预览" value={`${cacheStats.originalVideoCount} 个`} />
          <InfoRow label="可用资源" value={`${cacheStats.usefulCount} 项`} />
          <InfoRow label="残留资源" value={`${cacheStats.unusedCount} 项`} />
          <InfoRow label="最近缓存" value={formatTimestamp(cacheStats.latestCachedAt)} />
          <Pressable onPress={confirmClearUsefulCache} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>清理可用缓存</Text>
          </Pressable>
          <Pressable onPress={confirmClearUnusedCache} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>清理残留缓存</Text>
          </Pressable>
          <Pressable onPress={confirmClearAllCache} style={styles.dangerButton}>
            <Text style={styles.dangerButtonText}>清理全部缓存</Text>
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
      </ScrollView>
    </View>
  );
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
