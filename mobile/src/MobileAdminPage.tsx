import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import type {
  AdminGallery,
  AdminGalleryMutationPayload,
  AdminGalleryStat,
  AdminGalleryUserLink,
  AdminInfoItem,
  AdminSkippedFolderLog,
  AdminTask,
  AdminTaskCounts,
  AdminTaskStatus,
  AdminUserRecord,
  ApiClientOptions,
  AuthTokens,
  CurrentUser,
} from '@kwphoto/core';
import {
  createAdminGallery,
  deleteAdminGallery,
  exportAdminDeletedFiles,
  fetchAdminGalleries,
  fetchAdminGalleryDetail,
  fetchAdminGalleryRootDirs,
  fetchAdminGalleryStat,
  fetchAdminGallerySubDirs,
  fetchAdminGalleryUserLinks,
  fetchAdminLicenseInfo,
  fetchAdminSkippedFolderLogs,
  fetchAdminSystemStatus,
  fetchAdminTaskCounts,
  fetchAdminTasks,
  fetchAdminUsers,
  findAdminDuplicateFiles,
  getApiErrorMessage,
  pauseAdminTasks,
  resumeAdminTasks,
  scanAdminGallery,
  updateAdminGallery,
  updateAdminGalleryWeight,
} from '@kwphoto/core';

import {
  clearMobileLocalCache,
  createMobileLocalCacheScope,
  deleteMobileCacheFolderGroups,
  listMobileCacheFolders,
  readMobileCacheStats,
  subscribeMobileCacheChanges,
} from './mobile-local-cache';
import type { MobileCacheFolderSummary, MobileCacheStats } from './mobile-local-cache';
import {
  isMobileAdminTab,
  mergeMobilePreferences,
  readMobilePreferences,
} from './mobile-storage';
import type { MobileAdminTab } from './mobile-storage';
import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from './mobile-theme';
import {
  MobileLoadingState,
  MobilePullRefreshScrollView,
} from './MobileLoadingState';
import type { MobileSession } from './mobile-types';
import { useMobileApiOptions } from './useMobileApiOptions';

interface MobileAdminPageProps {
  onChangeTokens: (tokens: AuthTokens) => void;
  session: MobileSession;
}

interface GalleryEditorState {
  adminOnly: boolean;
  folderInput: string;
  folders: string[];
  funcExclude: string[];
  hidden: boolean;
  name: string;
  selectedUserIds: string[];
  weights: string;
}

interface CacheFolderTotals {
  coverCount: number;
  directoryCount: number;
  hdThumbnailCount: number;
  itemCount: number;
  mediaCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  size: number;
  thumbnailCount: number;
}

interface CacheFolderTreeNode {
  branchTotals: CacheFolderTotals;
  children: CacheFolderTreeNode[];
  depth: number;
  folder: MobileCacheFolderSummary;
  id: string;
  name: string;
  path: string;
  totals: CacheFolderTotals;
}

type AdminIconName = ComponentProps<typeof Ionicons>['name'];
type AdminTab = MobileAdminTab;

interface CacheMetaPillData {
  icon: AdminIconName;
  label: string;
  value: number;
}

interface AdminTabMetaSummary {
  cacheStats: MobileCacheStats;
  galleryCount: number;
  taskCounts: AdminTaskCounts;
  userCount: number;
}

interface AdminTabLayout {
  width: number;
  x: number;
}

const ADMIN_TABS: Array<{ description: string; icon: AdminIconName; key: AdminTab; label: string }> = [
  { description: '服务、账号、缓存', icon: 'grid-outline', key: 'overview', label: '总览' },
  { description: '图库列表与扫描', icon: 'images-outline', key: 'gallery', label: '图库管理' },
  { description: '队列与上传任务', icon: 'pulse-outline', key: 'tasks', label: '后台任务' },
  { description: '用户与权限', icon: 'people-outline', key: 'users', label: '用户管理' },
  { description: '本地缓存明细', icon: 'server-outline', key: 'cache', label: '缓存管理' },
  { description: '系统、授权、诊断', icon: 'shield-checkmark-outline', key: 'system', label: '系统状态' },
];

const TASK_TABS: AdminTaskStatus[] = ['active', 'waiting', 'failed', 'paused', 'completed'];
const ADMIN_NOTIFICATION_VISIBLE_MS = 2200;
const ADMIN_PAGE_EDGE_PADDING = 4;
const TASK_STATUS_LABELS: Record<AdminTaskStatus, string> = {
  active: '执行中',
  completed: '已完成',
  failed: '失败',
  paused: '暂停',
  waiting: '等待中',
};
const RECOGNITION_TASKS = [
  { label: '人脸识别', value: 'face' },
  { label: 'CLIP识别', value: 'CLIP' },
  { label: '文本识别', value: 'ocr' },
  { label: '场景识别', value: 'category' },
  { label: '相似识别', value: 'similar' },
];

/**
 * Renders the mobile admin center with the same tab structure and main actions as Web.
 */
export const MobileAdminPage = ({
  onChangeTokens,
  session,
}: MobileAdminPageProps) => {
  const theme = useMobileTheme();
  const apiOptions = useMobileApiOptions({
    onChangeTokens,
    serverUrl: session.serverUrl,
    tokens: session.tokens,
  });
  const cacheScope = useMemo(
    () =>
      createMobileLocalCacheScope({
        serverUrl: session.serverUrl,
        userId: session.user.id,
        username: session.user.username,
      }),
    [session.serverUrl, session.user.id, session.user.username],
  );
  const cacheStatsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadRequestIdRef = useRef(0);
  const tabLayoutsRef = useRef<Partial<Record<AdminTab, AdminTabLayout>>>({});
  const tabRailRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [actionLoading, setActionLoading] = useState('');
  const [adminPreferencesHydrated, setAdminPreferencesHydrated] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheStats, setCacheStats] = useState<MobileCacheStats>(() => createEmptyCacheStats());
  const [deleteTarget, setDeleteTarget] = useState<AdminGallery>();
  const [editorGallery, setEditorGallery] = useState<AdminGallery>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState('');
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [galleryStat, setGalleryStat] = useState<AdminGalleryStat>();
  const [licenseItems, setLicenseItems] = useState<AdminInfoItem[]>([]);
  const [loadedTabs, setLoadedTabs] = useState<Partial<Record<AdminTab, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [skippedLogs, setSkippedLogs] = useState<AdminSkippedFolderLog[]>([]);
  const [submittingEditor, setSubmittingEditor] = useState(false);
  const [systemItems, setSystemItems] = useState<AdminInfoItem[]>([]);
  const [taskCounts, setTaskCounts] = useState<AdminTaskCounts>(() => createEmptyTaskCounts());
  const [taskStatus, setTaskStatus] = useState<AdminTaskStatus>('active');
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [tabLayoutVersion, setTabLayoutVersion] = useState(0);
  const [tabRailViewportWidth, setTabRailViewportWidth] = useState(0);
  const [userLinks, setUserLinks] = useState<AdminGalleryUserLink[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [weightTarget, setWeightTarget] = useState<AdminGallery>();
  const [weightValue, setWeightValue] = useState('');
  const galleryIds = useMemo(
    () => galleries.map((gallery) => Number(gallery.id)).filter((id) => Number.isFinite(id) && id > 0),
    [galleries],
  );
  const activeTabConfig = ADMIN_TABS.find((tab) => tab.key === activeTab) ?? ADMIN_TABS[0];
  const activeTabLoaded = loadedTabs[activeTab] === true;
  const showInitialLoading = !adminPreferencesHydrated || (loading && !activeTabLoaded);
  const showRefreshLoading = adminPreferencesHydrated && loading && activeTabLoaded;
  const activeTabMeta = useMemo(
    () =>
      getAdminTabMeta(activeTab, {
        cacheStats,
        galleryCount: galleries.length,
        taskCounts,
        userCount: users.length,
      }),
    [activeTab, cacheStats, galleries.length, taskCounts, users.length],
  );

  const loadCachePreferences = useCallback(async (): Promise<void> => {
    const preferences = await readMobilePreferences();

    setCacheEnabled(preferences.localCacheEnabled ?? true);
    setCacheStats(await readMobileCacheStats(cacheScope));
  }, [cacheScope]);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores the last selected admin tab before the first admin request starts.
     */
    const hydrateAdminPreferences = async (): Promise<void> => {
      const preferences = await readMobilePreferences();

      if (!mounted) {
        return;
      }

      if (isMobileAdminTab(preferences.activeAdminTab)) {
        setActiveTab(preferences.activeAdminTab);
      }

      setAdminPreferencesHydrated(true);
    };

    void hydrateAdminPreferences();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    /**
     * Debounces cache stat reads while folder thumbnails are being persisted in batches.
     */
    const scheduleCacheStatsRefresh = (): void => {
      if (cacheStatsRefreshTimerRef.current) {
        clearTimeout(cacheStatsRefreshTimerRef.current);
      }

      cacheStatsRefreshTimerRef.current = setTimeout(() => {
        void readMobileCacheStats(cacheScope).then((nextStats) => {
          if (mounted) {
            setCacheStats(nextStats);
          }
        });
      }, 180);
    };

    const unsubscribe = subscribeMobileCacheChanges(scheduleCacheStatsRefresh);

    return () => {
      mounted = false;
      unsubscribe();

      if (cacheStatsRefreshTimerRef.current) {
        clearTimeout(cacheStatsRefreshTimerRef.current);
      }
    };
  }, [cacheScope]);

  /**
   * Changes the active admin tab and persists it as a mobile behavior preference.
   */
  const handleChangeActiveTab = useCallback((tab: AdminTab): void => {
    setActiveTab(tab);
    void mergeMobilePreferences({ activeAdminTab: tab });
  }, []);

  /**
   * Records one tab position so the active admin tab can be centered in the horizontal rail.
   */
  const handleTabLayout = useCallback((tab: AdminTab, event: LayoutChangeEvent): void => {
    const { width, x } = event.nativeEvent.layout;
    const currentLayout = tabLayoutsRef.current[tab];

    if (currentLayout?.x === x && currentLayout.width === width) {
      return;
    }

    tabLayoutsRef.current[tab] = { width, x };
    setTabLayoutVersion((version) => version + 1);
  }, []);

  const loadGalleries = useCallback(async (): Promise<void> => {
    const [galleryResult, usersResult, linksResult] = await Promise.allSettled([
      fetchAdminGalleries(apiOptions),
      fetchAdminUsers(apiOptions),
      fetchAdminGalleryUserLinks(apiOptions),
    ]);

    if (galleryResult.status === 'fulfilled') {
      setGalleries(galleryResult.value);
    } else {
      setGalleries([]);
      throw galleryResult.reason;
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value);
    }

    if (linksResult.status === 'fulfilled') {
      setUserLinks(linksResult.value);
    }
  }, [apiOptions]);

  const loadActiveTab = useCallback(async (): Promise<void> => {
    const requestId = loadRequestIdRef.current + 1;

    loadRequestIdRef.current = requestId;
    setError('');
    setLoading(true);

    try {
      if (activeTab === 'overview') {
        const [stat, counts] = await Promise.all([
          fetchAdminGalleryStat(apiOptions, 'all'),
          fetchAdminTaskCounts(apiOptions),
          loadCachePreferences(),
        ]);

        setGalleryStat(stat);
        setTaskCounts(counts);
      }

      if (activeTab === 'gallery') {
        await loadGalleries();
      }

      if (activeTab === 'tasks') {
        const [counts, nextTasks] = await Promise.all([
          fetchAdminTaskCounts(apiOptions),
          fetchAdminTasks(apiOptions, taskStatus),
        ]);

        setTaskCounts(counts);
        setTasks(nextTasks);
      }

      if (activeTab === 'users') {
        setUsers(await fetchAdminUsers(apiOptions));
      }

      if (activeTab === 'cache') {
        await loadCachePreferences();
      }

      if (activeTab === 'system') {
        const [systemResult, licenseResult] = await Promise.allSettled([
          fetchAdminSystemStatus(apiOptions),
          fetchAdminLicenseInfo(apiOptions),
        ]);

        setSystemItems(systemResult.status === 'fulfilled' ? systemResult.value : []);
        setLicenseItems(licenseResult.status === 'fulfilled' ? licenseResult.value : []);
      }
    } catch (loadError) {
      if (loadRequestIdRef.current === requestId) {
        setError(getApiErrorMessage(loadError));
      }
    } finally {
      // Ignore late responses from a previously selected tab so the current loading state stays accurate.
      if (loadRequestIdRef.current === requestId) {
        setLoadedTabs((current) => ({ ...current, [activeTab]: true }));
        setLoading(false);
      }
    }
  }, [activeTab, apiOptions, loadCachePreferences, loadGalleries, taskStatus]);

  useEffect(() => {
    if (!adminPreferencesHydrated) {
      return;
    }

    void loadActiveTab();
  }, [adminPreferencesHydrated, loadActiveTab]);

  useEffect(() => {
    const tabLayout = tabLayoutsRef.current[activeTab];

    if (!adminPreferencesHydrated || !tabLayout || tabRailViewportWidth <= 0) {
      return undefined;
    }

    const animationId = requestAnimationFrame(() => {
      tabRailRef.current?.scrollTo({
        animated: true,
        x: getCenteredAdminTabScrollX(tabLayout, tabRailViewportWidth),
      });
    });

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [activeTab, adminPreferencesHydrated, tabLayoutVersion, tabRailViewportWidth]);

  useEffect(() => {
    if (!message) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setMessage('');
    }, ADMIN_NOTIFICATION_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [message]);

  /**
   * Runs an admin mutation and keeps the top feedback area compact.
   */
  const runAdminAction = async (key: string, action: () => Promise<string | undefined>): Promise<void> => {
    setActionLoading(key);
    setError('');

    try {
      const nextMessage = await action();

      if (nextMessage) {
        setMessage(nextMessage);
      }
    } catch (actionError) {
      setError(getApiErrorMessage(actionError));
    } finally {
      setActionLoading('');
    }
  };

  /**
   * Opens the gallery editor with fresh detail when the server supports the detail endpoint.
   */
  const openEditor = async (gallery?: AdminGallery): Promise<void> => {
    if (!gallery?.id) {
      setEditorGallery(undefined);
      setEditorOpen(true);
      return;
    }

    await runAdminAction(`detail-${gallery.id}`, async () => {
      try {
        setEditorGallery(await fetchAdminGalleryDetail(apiOptions, gallery.id as number | string));
      } catch {
        setEditorGallery(gallery);
      }

      setEditorOpen(true);
      return undefined;
    });
  };

  /**
   * Creates or updates a gallery from the mobile editor.
   */
  const handleSubmitGallery = async (
    payload: AdminGalleryMutationPayload,
    gallery?: AdminGallery,
  ): Promise<void> => {
    setSubmittingEditor(true);

    try {
      if (gallery?.id) {
        await updateAdminGallery(apiOptions, gallery.id, payload);
        setMessage(`${payload.name} 已更新`);
      } else {
        await createAdminGallery(apiOptions, payload);
        setMessage(`${payload.name} 已创建`);
      }

      setEditorOpen(false);
      await loadGalleries();
    } catch (submitError) {
      setError(getApiErrorMessage(submitError));
    } finally {
      setSubmittingEditor(false);
    }
  };

  /**
   * Starts a gallery scan in normal or check mode.
   */
  const handleScanGallery = async (gallery: AdminGallery, scanType?: 'check'): Promise<void> => {
    if (gallery.id === undefined) {
      setError('当前图库没有可用 ID，无法触发扫描');
      return;
    }

    await runAdminAction(`scan-${gallery.id}-${scanType ?? 'normal'}`, async () => {
      await scanAdminGallery(apiOptions, gallery.id as number | string, scanType);
      await loadGalleries();
      return `${gallery.name} 已触发${scanType ? '检查模式' : ''}扫描`;
    });
  };

  /**
   * Updates backend queue state and refreshes task counters.
   */
  const handleTaskQueueAction = async (action: 'pause' | 'resume'): Promise<void> => {
    await runAdminAction(action, async () => {
      if (action === 'pause') {
        await pauseAdminTasks(apiOptions);
      } else {
        await resumeAdminTasks(apiOptions);
      }

      setTaskCounts(await fetchAdminTaskCounts(apiOptions));
      return action === 'pause' ? '后台任务队列已暂停' : '后台任务队列已恢复';
    });
  };

  /**
   * Persists the mobile cache switch so it matches settings behavior.
   */
  const handleToggleCache = async (): Promise<void> => {
    const nextEnabled = !cacheEnabled;

    setCacheEnabled(nextEnabled);
    await mergeMobilePreferences({ localCacheEnabled: nextEnabled });
    setMessage(nextEnabled ? '本地缓存已开启' : '本地缓存已关闭');
  };

  /**
   * Clears all cache records under the current mobile account scope.
   */
  const handleClearCache = async (): Promise<void> => {
    await runAdminAction('clear-cache', async () => {
      await clearMobileLocalCache(cacheScope);
      await loadCachePreferences();
      return '本地缓存已清理';
    });
  };

  /**
   * Clears one folder cache tree branch and refreshes the mobile cache dashboard.
   */
  const handleClearCacheFolderBranch = async (folderScopeKeys: string[], folderName: string): Promise<void> => {
    await runAdminAction(`cache-folder-${folderScopeKeys.join('|')}`, async () => {
      await deleteMobileCacheFolderGroups(folderScopeKeys);
      await loadCachePreferences();
      return `${folderName} 的缓存已清理`;
    });
  };

  return (
    <View style={styles.screen}>
      <View
        onLayout={(event) => setTabRailViewportWidth(event.nativeEvent.layout.width)}
        style={styles.tabRailFrame}
      >
        <ScrollView
          contentContainerStyle={styles.tabRail}
          horizontal
          ref={tabRailRef}
          showsHorizontalScrollIndicator={false}
        >
          {ADMIN_TABS.map((tab) => (
            <Pressable
              key={tab.key}
              onLayout={(event) => handleTabLayout(tab.key, event)}
              onPress={() => handleChangeActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key ? styles.activeTab : null,
                activeTab === tab.key ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
              ]}
            >
              <Ionicons
                color={activeTab === tab.key ? theme.hex : MOBILE_SAGE_SLATE.muted}
                name={tab.icon}
                size={17}
              />
              <View style={styles.tabCopy}>
                <Text style={[styles.tabText, activeTab === tab.key ? { color: theme.hex } : null]}>{tab.label}</Text>
                <Text numberOfLines={1} style={[styles.tabDescription, activeTab === tab.key ? { color: theme.hex } : null]}>
                  {tab.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {message ? (
        <View pointerEvents="none" style={styles.notificationLayer}>
          <View style={[styles.notificationToast, { backgroundColor: theme.selection, borderColor: theme.light }]}>
            <Ionicons color={theme.hex} name="checkmark-circle-outline" size={17} />
            <Text style={[styles.notificationText, { color: theme.hex }]}>{message}</Text>
          </View>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <MobilePullRefreshScrollView
        contentContainerStyle={styles.content}
        onRefresh={loadActiveTab}
        refreshing={showRefreshLoading}
        showsVerticalScrollIndicator={false}
        theme={theme}
      >
        <AdminSectionHeader
          meta={activeTabMeta}
          tab={activeTabConfig}
          themeColor={theme.hex}
        />
        {showInitialLoading ? <AdminLoadingState tab={activeTab} /> : (
          <>
            {activeTab === 'overview' ? (
              <OverviewPanel
                cacheEnabled={cacheEnabled}
                cacheStats={cacheStats}
                galleryStat={galleryStat}
                onOpenTab={handleChangeActiveTab}
                session={session}
                taskCounts={taskCounts}
              />
            ) : null}

            {activeTab === 'gallery' ? (
              <GalleryPanel
                actionLoading={actionLoading}
                galleries={galleries}
                galleryStat={galleryStat}
                onDeleteGallery={setDeleteTarget}
                onExportDeletedFiles={() => runAdminAction('deleted', async () => {
                  await exportAdminDeletedFiles(apiOptions);
                  return '文件删除记录导出任务已提交';
                })}
                onFetchSkippedLogs={() => runAdminAction('skipped', async () => {
                  const logs = await fetchAdminSkippedFolderLogs(apiOptions);

                  setSkippedLogs(logs);
                  return logs.length > 0 ? `发现 ${logs.length} 条跳过扫描记录` : '没有跳过扫描记录';
                })}
                onFetchStats={() => runAdminAction('stats', async () => {
                  setGalleryStat(await fetchAdminGalleryStat(apiOptions, 'all'));
                  return '图库统计已更新';
                })}
                onFindDuplicateFiles={() => runAdminAction('duplicate', async () => {
                  if (galleryIds.length === 0) {
                    return '当前没有可检查的图库';
                  }

                  await findAdminDuplicateFiles(apiOptions, galleryIds);
                  return '重复文件检查任务已提交';
                })}
                onOpenEditor={openEditor}
                onScanAll={() => runAdminAction('scan-all', async () => {
                  if (galleryIds.length === 0) {
                    return '当前没有可扫描的图库';
                  }

                  await Promise.all(galleryIds.map((galleryId) => scanAdminGallery(apiOptions, galleryId)));
                  await loadGalleries();
                  return `已触发 ${galleryIds.length} 个图库扫描`;
                })}
                onScanGallery={handleScanGallery}
                onWeightGallery={(gallery) => {
                  setWeightTarget(gallery);
                  setWeightValue(gallery.weights === undefined ? '' : String(gallery.weights));
                }}
                skippedLogs={skippedLogs}
              />
            ) : null}

            {activeTab === 'tasks' ? (
              <TaskPanel
                actionLoading={actionLoading}
                counts={taskCounts}
                onChangeStatus={setTaskStatus}
                onQueueAction={handleTaskQueueAction}
                status={taskStatus}
                tasks={tasks}
              />
            ) : null}

            {activeTab === 'users' ? <UserPanel currentUser={session.user} users={users} /> : null}

            {activeTab === 'cache' ? (
              <CachePanel
                actionLoading={actionLoading}
                cacheEnabled={cacheEnabled}
                cacheScope={cacheScope}
                stats={cacheStats}
                onClearCache={handleClearCache}
                onClearFolderBranch={handleClearCacheFolderBranch}
                onRefreshCache={loadCachePreferences}
                onToggleCache={handleToggleCache}
              />
            ) : null}

            {activeTab === 'system' ? (
              <SystemPanel
                licenseItems={licenseItems}
                session={session}
                systemItems={systemItems}
              />
            ) : null}
          </>
        )}
      </MobilePullRefreshScrollView>

      <GalleryEditorModal
        apiOptions={apiOptions}
        currentUser={session.user}
        gallery={editorGallery}
        open={editorOpen}
        submitting={submittingEditor}
        userLinks={userLinks}
        users={users}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmitGallery}
      />

      <WeightModal
        actionLoading={actionLoading}
        gallery={weightTarget}
        value={weightValue}
        onChangeValue={setWeightValue}
        onClose={() => setWeightTarget(undefined)}
        onSubmit={() => runAdminAction('weight', async () => {
          if (!weightTarget?.id) {
            return undefined;
          }

          const nextWeight = Number(weightValue);

          if (!Number.isFinite(nextWeight)) {
            return '排序权重必须是数字';
          }

          await updateAdminGalleryWeight(apiOptions, weightTarget.id, nextWeight);
          setWeightTarget(undefined);
          await loadGalleries();
          return `${weightTarget.name} 排序权重已更新`;
        })}
      />

      {deleteTarget ? (
        <ConfirmSheet
          danger
          loading={actionLoading === 'delete'}
          message={`确定删除 ${deleteTarget.name} 吗？不会直接删除磁盘文件，但会移除图库配置。`}
          title="删除图库"
          onCancel={() => setDeleteTarget(undefined)}
          onConfirm={() => runAdminAction('delete', async () => {
            if (!deleteTarget.id) {
              return undefined;
            }

            await deleteAdminGallery(apiOptions, deleteTarget.id);
            setDeleteTarget(undefined);
            await loadGalleries();
            return `${deleteTarget.name} 已删除`;
          })}
        />
      ) : null}
    </View>
  );
};

const AdminSectionHeader = ({ meta, tab, themeColor }: {
  meta: string;
  tab: (typeof ADMIN_TABS)[number];
  themeColor: string;
}) => {
  return (
    <View style={styles.sectionIntro}>
      <View style={styles.sectionIntroIcon}>
        <Ionicons color={themeColor} name={tab.icon} size={19} />
      </View>
      <View style={styles.sectionIntroCopy}>
        <Text style={styles.sectionIntroTitle}>{tab.label}</Text>
        <Text style={styles.sectionIntroMeta}>{tab.description} · {meta}</Text>
      </View>
    </View>
  );
};

const AdminLoadingState = ({ tab }: { tab: AdminTab }) => {
  const rows = tab === 'overview' ? 2 : tab === 'gallery' || tab === 'cache' ? 3 : 4;

  return (
    <View style={styles.loadingStack}>
      <MobileLoadingState
        compact
        description="同步服务端数据和本地缓存状态"
        icon="analytics-outline"
        title={`正在加载${getAdminTabLabel(tab)}`}
      />
      <View style={styles.loadingMetricGrid}>
        {Array.from({ length: tab === 'overview' ? 6 : 4 }).map((_, index) => (
          <View key={index} style={styles.skeletonMetric}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonValue} />
          </View>
        ))}
      </View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonCardTitle} />
          <View style={styles.skeletonCardLine} />
          <View style={[styles.skeletonCardLine, styles.skeletonCardLineShort]} />
        </View>
      ))}
    </View>
  );
};

const OverviewPanel = ({
  cacheEnabled,
  cacheStats,
  galleryStat,
  onOpenTab,
  session,
  taskCounts,
}: {
  cacheEnabled: boolean;
  cacheStats: MobileCacheStats;
  galleryStat?: AdminGalleryStat;
  onOpenTab: (tab: AdminTab) => void;
  session: MobileSession;
  taskCounts: AdminTaskCounts;
}) => {
  return (
    <View style={styles.cardGroup}>
      <View style={styles.metricsGrid}>
        <Metric icon="server-outline" label="服务端" meta={`API ${session.apiInfo.version || 'unknown'}`} value={getServerHost(session.serverUrl)} />
        <Metric icon="person-circle-outline" label="当前用户" meta={session.user.isAdmin ? '管理员' : '普通用户'} value={session.user.username} />
        <Metric icon="images-outline" label="照片" meta={`${galleryStat?.video ?? 0} 个视频`} value={String(galleryStat?.photo ?? 0)} />
        <Metric icon="archive-outline" label="容量" meta="图库总大小" value={formatFileSize(galleryStat?.totalSize ?? 0)} />
        <Metric icon="pulse-outline" label="后台任务" meta={`${taskCounts.failed} 个失败`} value={String(taskCounts.active)} />
        <Metric icon="server-outline" label="已缓存媒体" meta={cacheEnabled ? '缓存已开启' : '缓存已关闭'} value={String(cacheStats.mediaCount)} />
      </View>
      <View style={styles.actionList}>
        {ADMIN_TABS.filter((tab) => tab.key !== 'overview').map((tab) => (
          <Pressable key={tab.key} onPress={() => onOpenTab(tab.key)} style={styles.actionRow}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name={tab.icon} size={17} />
            <View style={styles.actionRowCopy}>
              <Text style={styles.actionRowTitle}>{tab.label}</Text>
              <Text style={styles.actionRowMeta}>{tab.description}</Text>
            </View>
            <Ionicons color={MOBILE_SAGE_SLATE.subtle} name="chevron-forward-outline" size={16} />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

const GalleryPanel = ({
  actionLoading,
  galleries,
  galleryStat,
  onDeleteGallery,
  onExportDeletedFiles,
  onFetchSkippedLogs,
  onFetchStats,
  onFindDuplicateFiles,
  onOpenEditor,
  onScanAll,
  onScanGallery,
  onWeightGallery,
  skippedLogs,
}: {
  actionLoading: string;
  galleries: AdminGallery[];
  galleryStat?: AdminGalleryStat;
  onDeleteGallery: (gallery: AdminGallery) => void;
  onExportDeletedFiles: () => void;
  onFetchSkippedLogs: () => void;
  onFetchStats: () => void;
  onFindDuplicateFiles: () => void;
  onOpenEditor: (gallery?: AdminGallery) => Promise<void>;
  onScanAll: () => void;
  onScanGallery: (gallery: AdminGallery, scanType?: 'check') => Promise<void>;
  onWeightGallery: (gallery: AdminGallery) => void;
  skippedLogs: AdminSkippedFolderLog[];
}) => {
  return (
    <View style={styles.cardGroup}>
      <View style={styles.toolbarGrid}>
        <AdminActionButton icon="checkmark-circle-outline" label="检查重复文件" loading={actionLoading === 'duplicate'} onPress={onFindDuplicateFiles} />
        <AdminActionButton danger icon="document-text-outline" label="文件删除记录" loading={actionLoading === 'deleted'} onPress={onExportDeletedFiles} />
        <AdminActionButton icon="bar-chart-outline" label="图库信息统计" loading={actionLoading === 'stats'} onPress={onFetchStats} />
        <AdminActionButton danger icon="alert-circle-outline" label="状态异常文件" loading={actionLoading === 'skipped'} onPress={onFetchSkippedLogs} />
        <AdminActionButton icon="settings-outline" label="图库扫描与设置" onPress={() => void onOpenEditor()} />
        <AdminActionButton primary icon="scan-outline" label="扫描所有图库" loading={actionLoading === 'scan-all'} onPress={onScanAll} />
      </View>

      <View style={styles.tipCard}>
        <Ionicons color={MOBILE_SAGE_SLATE.muted} name="images-outline" size={18} />
        <Text style={styles.tipText}>通过图库可以把不同文件夹的照片、视频合并展示，并授权给用户；管理员也需要授权后才能访问图库。</Text>
      </View>

      {galleryStat ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryPill}>照片：{galleryStat.photo}</Text>
          <Text style={styles.summaryPill}>视频：{galleryStat.video}</Text>
          <Text style={styles.summaryPill}>总大小：{formatFileSize(galleryStat.totalSize)}</Text>
        </View>
      ) : null}

      {skippedLogs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>状态异常文件夹</Text>
          {skippedLogs.slice(0, 5).map((log) => (
            <Text key={`${log.folderPath}-${log.msg}`} numberOfLines={2} style={styles.cardMeta}>
              {log.folderPath}：{log.msg}
            </Text>
          ))}
        </View>
      ) : null}

      {galleries.length === 0 ? <EmptyLine text="暂无图库数据" /> : null}
      {galleries.map((gallery, index) => (
        <GalleryCard
          actionLoading={actionLoading}
          gallery={gallery}
          index={index}
          key={gallery.id ?? gallery.path}
          onDeleteGallery={onDeleteGallery}
          onOpenEditor={onOpenEditor}
          onScanGallery={onScanGallery}
          onWeightGallery={onWeightGallery}
        />
      ))}

      <Pressable onPress={() => void onOpenEditor()} style={styles.addCard}>
        <View style={styles.addCardIcon}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="add-outline" size={22} />
        </View>
        <Text style={styles.addCardTitle}>添加图库</Text>
      </Pressable>
    </View>
  );
};

const GalleryCard = ({
  actionLoading,
  gallery,
  index,
  onDeleteGallery,
  onOpenEditor,
  onScanGallery,
  onWeightGallery,
}: {
  actionLoading: string;
  gallery: AdminGallery;
  index: number;
  onDeleteGallery: (gallery: AdminGallery) => void;
  onOpenEditor: (gallery?: AdminGallery) => Promise<void>;
  onScanGallery: (gallery: AdminGallery, scanType?: 'check') => Promise<void>;
  onWeightGallery: (gallery: AdminGallery) => void;
}) => {
  const toneStyle = GALLERY_TONES[index % GALLERY_TONES.length];

  return (
    <View style={styles.galleryCard}>
      <View style={[styles.galleryCover, toneStyle]}>
        <Ionicons color="rgba(255, 255, 255, 0.92)" name="images-outline" size={24} />
        <Text style={styles.galleryCoverCount}>{gallery.folders.length || 1}</Text>
      </View>
      <View style={styles.galleryBody}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text numberOfLines={1} style={styles.cardTitle}>{gallery.name}</Text>
            <Text numberOfLines={1} style={styles.cardSubtitle}>{gallery.path}</Text>
          </View>
          <Text style={styles.badge}>{gallery.hidden ? '隐藏' : '可见'}</Text>
        </View>
        <Text style={styles.cardMeta}>
          文件 {gallery.fileCount ?? 0} · 目录 {gallery.folders.length || 1} · 排序 {gallery.weights ?? '-'}
        </Text>
        <View style={styles.galleryActions}>
          <SmallAction icon="folder-open-outline" label="管理" loading={actionLoading === `detail-${gallery.id}`} onPress={() => void onOpenEditor(gallery)} />
          <SmallAction icon="refresh-outline" label="扫描" loading={actionLoading === `scan-${gallery.id}-normal`} onPress={() => void onScanGallery(gallery)} />
          <SmallAction icon="scan-outline" label="检查" loading={actionLoading === `scan-${gallery.id}-check`} onPress={() => void onScanGallery(gallery, 'check')} />
          <SmallAction icon="options-outline" label="权重" onPress={() => onWeightGallery(gallery)} />
          <SmallAction danger icon="trash-outline" label="删除" onPress={() => onDeleteGallery(gallery)} />
        </View>
      </View>
    </View>
  );
};

const TaskPanel = ({
  actionLoading,
  counts,
  onChangeStatus,
  onQueueAction,
  status,
  tasks,
}: {
  actionLoading: string;
  counts: AdminTaskCounts;
  onChangeStatus: (status: AdminTaskStatus) => void;
  onQueueAction: (action: 'pause' | 'resume') => Promise<void>;
  status: AdminTaskStatus;
  tasks: AdminTask[];
}) => {
  return (
    <View style={styles.cardGroup}>
      <View style={styles.queueActions}>
        <AdminActionButton icon="pause-outline" label="暂停队列" loading={actionLoading === 'pause'} onPress={() => void onQueueAction('pause')} />
        <AdminActionButton primary icon="play-outline" label="恢复队列" loading={actionLoading === 'resume'} onPress={() => void onQueueAction('resume')} />
      </View>
      <View style={styles.metricsGrid}>
        {TASK_TABS.map((item) => (
          <Metric key={item} icon="pulse-outline" label={TASK_STATUS_LABELS[item]} meta="服务端任务" value={String(counts[item])} />
        ))}
      </View>
      <View style={styles.statusTabs}>
        {TASK_TABS.map((item) => (
          <StatusChip
            active={status === item}
            key={item}
            label={TASK_STATUS_LABELS[item]}
            onPress={() => onChangeStatus(item)}
          />
        ))}
      </View>
      {tasks.length > 0 ? tasks.map((task) => (
        <View key={task.id} style={styles.card}>
          <Text numberOfLines={1} style={styles.cardTitle}>{task.name}</Text>
          <Text style={styles.cardMeta}>ID：{task.id}</Text>
          <Text style={styles.cardMeta}>
            {task.statusLabel} · {task.progressLabel} · {formatAdminDateTime(task.updatedAt)}
          </Text>
          {task.detail ? <Text style={styles.cardSubtitle}>{task.detail}</Text> : null}
        </View>
      )) : <EmptyLine text="当前状态下没有后台任务" />}
    </View>
  );
};

const UserPanel = ({ currentUser, users }: { currentUser?: CurrentUser; users: AdminUserRecord[] }) => {
  const visibleUsers = mergeCurrentUser(users, currentUser);

  if (visibleUsers.length === 0) {
    return <EmptyLine text="暂无用户数据" />;
  }

  return (
    <View style={styles.cardGroup}>
      {visibleUsers.map((user, index) => (
        <View key={user.id ?? `${user.username}-${index}`} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.userAvatar}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="person-outline" size={18} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>{user.username}</Text>
              <Text style={styles.cardMeta}>ID：{user.id ?? '-'}</Text>
            </View>
            <Text style={styles.badge}>{user.roleLabel}</Text>
          </View>
          <Text style={styles.cardMeta}>
            {user.securityLabel} · 最近登录：{formatAdminDateTime(user.lastLogin)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const CachePanel = ({
  actionLoading,
  cacheEnabled,
  cacheScope,
  stats,
  onClearCache,
  onClearFolderBranch,
  onRefreshCache,
  onToggleCache,
}: {
  actionLoading: string;
  cacheEnabled: boolean;
  cacheScope: string;
  stats: MobileCacheStats;
  onClearCache: () => Promise<void>;
  onClearFolderBranch: (folderScopeKeys: string[], folderName: string) => Promise<void>;
  onRefreshCache: () => Promise<void>;
  onToggleCache: () => Promise<void>;
}) => {
  const theme = useMobileTheme();
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [folders, setFolders] = useState<MobileCacheFolderSummary[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const folderTree = useMemo(() => buildCacheFolderTree(folders), [folders]);
  const cacheResourceCount = stats.directoryCount + stats.mediaCount;
  const previewResourceCount = stats.hdThumbnailCount + stats.originalImageCount + stats.originalVideoCount;
  const cacheStatusLabel = cacheEnabled ? '本地缓存已开启' : '本地缓存已关闭';
  const latestCachedLabel = formatAdminDateTime(stats.latestCachedAt);

  const refreshCacheFolders = useCallback(async (): Promise<void> => {
    setLoadingFolders(true);

    try {
      setFolders(await listMobileCacheFolders(cacheScope));
    } finally {
      setLoadingFolders(false);
    }
  }, [cacheScope]);

  useEffect(() => {
    void refreshCacheFolders();
  }, [refreshCacheFolders, stats.latestCachedAt, stats.approximateSize]);

  /**
   * Toggles one cache tree branch while keeping every branch collapsed by default.
   */
  const handleToggleTreeNode = useCallback((nodeId: string): void => {
    setExpandedNodeIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }, []);

  /**
   * Refreshes both folder tree and top-level cache statistics.
   */
  const handleRefreshCache = async (): Promise<void> => {
    await Promise.all([onRefreshCache(), refreshCacheFolders()]);
  };

  /**
   * Clears all mobile cache and refreshes folder-level rows.
   */
  const handleClearAllCache = async (): Promise<void> => {
    await onClearCache();
    await refreshCacheFolders();
  };

  /**
   * Clears a folder cache branch and refreshes folder-level rows.
   */
  const handleClearTreeNode = async (node: CacheFolderTreeNode): Promise<void> => {
    const folderScopeKeys = collectCacheTreeFolders(node).map((folder) => folder.folderScopeKey);

    await onClearFolderBranch(folderScopeKeys, node.name);
    await refreshCacheFolders();
  };

  return (
    <View style={styles.cardGroup}>
      <View style={styles.cacheHeroCard}>
        <View style={styles.cacheHeroHeader}>
          <View style={[styles.cacheHeroIcon, { backgroundColor: theme.selection }]}>
            <Ionicons color={theme.hex} name="server-outline" size={22} />
          </View>
          <View style={styles.cacheHeroCopy}>
            <Text style={styles.cacheHeroKicker}>移动端缓存</Text>
            <Text style={styles.cacheHeroTitle}>缓存管理</Text>
            <Text style={styles.cacheHeroSubtitle}>目录快照、缩略图、原图和视频会按当前账号独立保存。</Text>
          </View>
          <Pressable
            onPress={() => void onToggleCache()}
            style={[
              styles.cacheStatusSwitch,
              cacheEnabled ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
            ]}
          >
            <View style={[styles.cacheStatusDot, cacheEnabled ? { backgroundColor: theme.hex } : null]} />
            <Text style={[styles.cacheStatusSwitchText, cacheEnabled ? { color: theme.hex } : null]}>
              {cacheEnabled ? '开启' : '关闭'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.cacheHeroStats}>
          <CacheHeroStat label="占用空间" meta="近似值" value={formatFileSize(stats.approximateSize)} />
          <CacheHeroStat label="缓存资源" meta={`${folders.length} 个文件夹`} value={String(cacheResourceCount)} />
        </View>

        <View style={styles.cacheCompositionRow}>
          {getCacheCompositionPills(stats).map((item) => (
            <CacheMetaPill icon={item.icon} key={item.label} label={item.label} />
          ))}
        </View>

        <View style={styles.cacheHeroFooter}>
          <Text style={styles.cacheHeroMeta}>{cacheStatusLabel} · 最近缓存：{latestCachedLabel}</Text>
          <View style={styles.cacheHeroActions}>
            <AdminActionButton
              icon="refresh-outline"
              label="刷新"
              loading={loadingFolders}
              onPress={() => void handleRefreshCache()}
            />
            <AdminActionButton
              danger
              icon="trash-outline"
              label="清理全部"
              loading={actionLoading === 'clear-cache'}
              onPress={() => Alert.alert('清理缓存', '确定清理当前账号下的全部移动端缓存吗？', [
                { style: 'cancel', text: '取消' },
                { onPress: () => void handleClearAllCache(), style: 'destructive', text: '清理' },
              ])}
            />
          </View>
        </View>
      </View>

      <CacheSectionHeader meta={`${cacheResourceCount} 项资源 · ${formatFileSize(stats.approximateSize)}`} title="缓存组成" />
      <View style={styles.cacheDetailGrid}>
        <CacheDetailStat icon="folder-outline" label="目录快照" meta="文件夹列表首屏" value={String(stats.directoryCount)} />
        <CacheDetailStat icon="image-outline" label="列表缩略图" meta="浏览列表缩略图" value={String(stats.thumbnailCount)} />
        <CacheDetailStat icon="sparkles-outline" label="高清缩略图" meta="预览优先展示" value={String(stats.hdThumbnailCount)} />
        <CacheDetailStat icon="albums-outline" label="文件夹封面" meta="图库入口封面" value={String(stats.coverCount)} />
        <CacheDetailStat icon="expand-outline" label="原图预览" meta="图片原图资源" value={String(stats.originalImageCount)} />
        <CacheDetailStat icon="videocam-outline" label="视频预览" meta="视频原始资源" value={String(stats.originalVideoCount)} />
      </View>

      <View style={styles.cacheFolderSection}>
        <CacheSectionHeader meta={`${folderTree.length} 个入口 · ${folders.length} 个缓存文件夹`} title="缓存目录" />
        <View style={styles.cacheList}>
          {loadingFolders ? (
            <View style={styles.cacheState}>
              <ActivityIndicator color={MOBILE_SAGE_SLATE.muted} />
              <Text style={styles.emptyText}>正在读取本地缓存...</Text>
            </View>
          ) : null}

          {!loadingFolders && folders.length === 0 ? (
            <View style={styles.cacheState}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="server-outline" size={20} />
              <Text style={styles.emptyText}>还没有缓存。打开文件夹、列表缩略图、高清缩略图或原图后会自动记录。</Text>
            </View>
          ) : null}

          {!loadingFolders ? folderTree.map((node) => (
            <CacheFolderTreeRow
              actionLoading={actionLoading}
              expandedNodeIds={expandedNodeIds}
              key={node.id}
              node={node}
              onClearNode={handleClearTreeNode}
              onToggleNode={handleToggleTreeNode}
            />
          )) : null}
        </View>
      </View>
    </View>
  );
};

/**
 * Renders one compact number inside the cache hero without adding nested cards.
 */
const CacheHeroStat = ({ label, meta, value }: { label: string; meta: string; value: string }) => (
  <View style={styles.cacheHeroStat}>
    <Text numberOfLines={1} style={styles.cacheHeroStatLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.cacheHeroStatValue}>{value}</Text>
    <Text style={styles.cacheHeroStatMeta}>{meta}</Text>
  </View>
);

/**
 * Renders a reusable section title for cache subareas.
 */
const CacheSectionHeader = ({ meta, title }: { meta: string; title: string }) => (
  <View style={styles.cacheSectionHeader}>
    <Text style={styles.cacheSectionTitle}>{title}</Text>
    <Text numberOfLines={1} style={styles.cacheSectionMeta}>{meta}</Text>
  </View>
);

/**
 * Renders one standalone cache resource statistic.
 */
const CacheDetailStat = ({
  icon,
  label,
  meta,
  value,
}: {
  icon: AdminIconName;
  label: string;
  meta: string;
  value: string;
}) => (
  <View style={styles.cacheDetailStat}>
    <View style={styles.cacheDetailIcon}>
      <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={16} />
    </View>
    <View style={styles.cacheDetailCopy}>
      <Text numberOfLines={1} style={styles.cacheDetailLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.cacheDetailMeta}>{meta}</Text>
    </View>
    <Text numberOfLines={1} style={styles.cacheDetailValue}>{value}</Text>
  </View>
);

const CacheMetaPill = ({ icon, label }: { icon: AdminIconName; label: string }) => {
  return (
    <View style={styles.cacheMetaPill}>
      <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={12} />
      <Text style={styles.cacheMetaPillText}>{label}</Text>
    </View>
  );
};

const SystemPanel = ({
  licenseItems,
  session,
  systemItems,
}: {
  licenseItems: AdminInfoItem[];
  session: MobileSession;
  systemItems: AdminInfoItem[];
}) => {
  return (
    <View style={styles.cardGroup}>
      <View style={styles.infoGrid}>
        <InfoItem label="服务地址" value={session.serverUrl} />
        <InfoItem label="API 版本" value={`${session.apiInfo.version || 'unknown'}${session.apiInfo.build ? ` #${session.apiInfo.build}` : ''}`} />
        <InfoItem label="运行环境" value="Expo Mobile" />
        <InfoItem label="当前用户" value={session.user.username} />
        <InfoItem label="平台" value={session.apiInfo.platform ?? '-'} />
        <InfoItem label="数据库" value={session.apiInfo.dbStatus ?? '-'} />
      </View>
      <InfoSection items={systemItems} title="服务端状态" />
      <InfoSection items={licenseItems} title="授权信息" />
    </View>
  );
};

const CacheFolderTreeRow = ({
  actionLoading,
  expandedNodeIds,
  node,
  onClearNode,
  onToggleNode,
}: {
  actionLoading: string;
  expandedNodeIds: ReadonlySet<string>;
  node: CacheFolderTreeNode;
  onClearNode: (node: CacheFolderTreeNode) => Promise<void>;
  onToggleNode: (nodeId: string) => void;
}) => {
  const folders = collectCacheTreeFolders(node);
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodeIds.has(node.id);
  const resourceCount = node.branchTotals.directoryCount + node.branchTotals.mediaCount;
  const clearing = actionLoading === `cache-folder-${folders.map((folder) => folder.folderScopeKey).join('|')}`;
  const metaPills = getCacheFolderMetaPills(node.branchTotals);

  return (
    <View style={styles.cacheTreeNode}>
      <View style={[styles.cacheFolderRow, { marginLeft: Math.min(node.depth * 12, 28) }]}>
        <View style={styles.cacheFolderRowHeader}>
          <View style={styles.cacheFolderTitle}>
            <Pressable
              disabled={!hasChildren}
              onPress={() => onToggleNode(node.id)}
              style={styles.cacheTreeToggle}
            >
              {hasChildren ? (
                <Ionicons
                  color={MOBILE_SAGE_SLATE.muted}
                  name={expanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
                  size={15}
                />
              ) : null}
            </Pressable>
            <View style={styles.cacheFolderIcon}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name={hasChildren ? 'folder-open-outline' : 'folder-outline'} size={15} />
            </View>
            <View style={styles.cacheFolderCopy}>
              <View style={styles.cacheFolderNameRow}>
                <Text numberOfLines={1} style={styles.cacheFolderName}>{node.name}</Text>
                <Text numberOfLines={1} style={styles.cacheFolderSummary}>
                  {formatFileSize(node.branchTotals.size)} · {formatAdminDateTime(node.folder.latestCachedAt).split(' ')[0]}
                </Text>
              </View>
              <Text numberOfLines={1} style={styles.cacheFolderPath}>{node.path}</Text>
              <View style={[styles.cacheMetaRow, { marginTop: 4 }]}>
                {metaPills.map((item) => (
                  <CacheMetaPill icon={item.icon} key={item.label} label={item.label} />
                ))}
              </View>
            </View>
          </View>
          <Pressable
            disabled={resourceCount === 0 || clearing}
            onPress={() => void onClearNode(node)}
            style={[styles.cacheClearButton, resourceCount === 0 || clearing ? styles.disabledButton : null]}
          >
            {clearing ? (
              <ActivityIndicator color={MOBILE_SAGE_SLATE.muted} size="small" />
            ) : (
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="trash-outline" size={14} />
            )}
            <Text style={styles.cacheClearText}>{folders.length > 1 ? '清理分支' : '清理'}</Text>
          </Pressable>
        </View>
      </View>
      {hasChildren && expanded ? (
        <View style={styles.cacheTreeChildren}>
          {node.children.map((child) => (
            <CacheFolderTreeRow
              actionLoading={actionLoading}
              expandedNodeIds={expandedNodeIds}
              key={child.id}
              node={child}
              onClearNode={onClearNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

/**
 * Keeps folder rows readable by showing only cache categories that have stored resources.
 */
const getCacheFolderMetaPills = (totals: CacheFolderTotals): CacheMetaPillData[] => {
  const items: CacheMetaPillData[] = [
    { icon: 'folder-outline', label: `${totals.directoryCount} 目录`, value: totals.directoryCount },
    { icon: 'image-outline', label: `${totals.thumbnailCount} 列表图`, value: totals.thumbnailCount },
    { icon: 'sparkles-outline', label: `${totals.hdThumbnailCount} 高清图`, value: totals.hdThumbnailCount },
    { icon: 'albums-outline', label: `${totals.coverCount} 封面`, value: totals.coverCount },
    { icon: 'expand-outline', label: `${totals.originalImageCount} 原图`, value: totals.originalImageCount },
    { icon: 'videocam-outline', label: `${totals.originalVideoCount} 视频`, value: totals.originalVideoCount },
  ];
  const visibleItems = items.filter((item) => item.value > 0);

  return visibleItems.length > 0 ? visibleItems : [{ icon: 'server-outline', label: '0 资源', value: 0 }];
};

/**
 * Generates composition pills for the top-level cache hero card.
 */
const getCacheCompositionPills = (stats: MobileCacheStats): CacheMetaPillData[] => {
  const items: CacheMetaPillData[] = [
    { icon: 'folder-outline', label: `${stats.directoryCount} 目录`, value: stats.directoryCount },
    { icon: 'image-outline', label: `${stats.thumbnailCount} 列表图`, value: stats.thumbnailCount },
    { icon: 'sparkles-outline', label: `${stats.hdThumbnailCount} 高清图`, value: stats.hdThumbnailCount },
    { icon: 'albums-outline', label: `${stats.coverCount} 封面`, value: stats.coverCount },
    { icon: 'expand-outline', label: `${stats.originalImageCount} 原图`, value: stats.originalImageCount },
    { icon: 'videocam-outline', label: `${stats.originalVideoCount} 视频`, value: stats.originalVideoCount },
  ];
  const visibleItems = items.filter((item) => item.value > 0);

  return visibleItems.length > 0 ? visibleItems : [{ icon: 'server-outline', label: '0 资源', value: 0 }];
};

const GalleryEditorModal = ({
  apiOptions,
  currentUser,
  gallery,
  open,
  submitting,
  userLinks,
  users,
  onClose,
  onSubmit,
}: {
  apiOptions: ApiClientOptions;
  currentUser?: CurrentUser;
  gallery?: AdminGallery;
  open: boolean;
  submitting: boolean;
  userLinks: AdminGalleryUserLink[];
  users: AdminUserRecord[];
  onClose: () => void;
  onSubmit: (payload: AdminGalleryMutationPayload, gallery?: AdminGallery) => Promise<void>;
}) => {
  const theme = useMobileTheme();
  const [availableDirs, setAvailableDirs] = useState<string[]>([]);
  const [dirError, setDirError] = useState('');
  const [dirLoading, setDirLoading] = useState(false);
  const [dirPath, setDirPath] = useState('');
  const [formError, setFormError] = useState('');
  const [state, setState] = useState<GalleryEditorState>(() => createInitialEditorState(gallery, users, userLinks, currentUser));
  const visibleUsers = useMemo(() => mergeCurrentUser(users, currentUser), [currentUser, users]);

  const loadDirectories = useCallback(async (path?: string): Promise<void> => {
    setDirError('');
    setDirLoading(true);

    try {
      const dirs = path
        ? await fetchAdminGallerySubDirs(apiOptions, path)
        : await fetchAdminGalleryRootDirs(apiOptions);

      setAvailableDirs(dirs);
      setDirPath(path ?? '');
    } catch (requestError) {
      setAvailableDirs([]);
      setDirError(getApiErrorMessage(requestError));
    } finally {
      setDirLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError('');
    setState(createInitialEditorState(gallery, users, userLinks, currentUser));
    void loadDirectories();
  }, [currentUser, gallery, loadDirectories, open, userLinks, users]);

  /**
   * Appends one folder path and keeps duplicate taps idempotent.
   */
  const addFolder = (folderPath: string): void => {
    const nextPath = folderPath.trim();

    if (!nextPath) {
      return;
    }

    setState((current) => ({
      ...current,
      folderInput: '',
      folders: current.folders.includes(nextPath) ? current.folders : [...current.folders, nextPath],
    }));
  };

  /**
   * Validates the editor state and submits the same DTO shape as Web.
   */
  const handleSubmit = async (): Promise<void> => {
    const name = state.name.trim();
    const folders = state.folders.map((folder) => folder.trim()).filter(Boolean);
    const weights = state.weights.trim() ? Number(state.weights) : undefined;
    const selectedUserIds = state.selectedUserIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!name) {
      setFormError('请填写图库显示名称。');
      return;
    }

    if (folders.length === 0) {
      setFormError('请至少添加一个图库文件夹。');
      return;
    }

    if (weights !== undefined && !Number.isFinite(weights)) {
      setFormError('排序权重必须是数字。');
      return;
    }

    setFormError('');
    await onSubmit({
      fileDeleteOnlyAdmin: state.adminOnly,
      folders,
      func_exclude: state.funcExclude,
      hide: state.hidden,
      name,
      userIds: selectedUserIds.length === 1 ? selectedUserIds[0] : selectedUserIds,
      weights,
    }, gallery);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.modalOverlay}>
        <View style={styles.editorSheet}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{gallery ? '管理图库' : '添加图库'}</Text>
              <Text style={styles.modalSubtitle}>{gallery ? `${gallery.name} · 调整文件夹、用户和识别任务` : '创建图库入口并绑定可浏览文件夹。'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGrid}>
              <FormField label="显示名称" value={state.name} onChangeText={(value) => setState((current) => ({ ...current, name: value }))} placeholder="例如 Luolcy-2604" />
              <FormField keyboardType="numeric" label="排序权重" value={state.weights} onChangeText={(value) => setState((current) => ({ ...current, weights: value }))} placeholder="数字越大越靠前" />
            </View>

            <View style={styles.checkGrid}>
              <CheckTile active={state.adminOnly} label="仅管理员可修改或删除照片" onPress={() => setState((current) => ({ ...current, adminOnly: !current.adminOnly }))} />
              <CheckTile active={state.hidden} label="在普通图库列表中隐藏" onPress={() => setState((current) => ({ ...current, hidden: !current.hidden }))} />
            </View>

            <EditorSection meta={`${state.folders.length} 个目录`} title="图库包含的文件夹">
              <View style={styles.folderInputRow}>
                <TextInput
                  onChangeText={(value) => setState((current) => ({ ...current, folderInput: value }))}
                  placeholder="/photos/2604"
                  placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
                  style={styles.input}
                  value={state.folderInput}
                />
                <Pressable onPress={() => addFolder(state.folderInput)} style={[styles.editorSmallButton, { backgroundColor: theme.selection, borderColor: theme.light }]}>
                  <Ionicons color={theme.hex} name="add-outline" size={17} />
                </Pressable>
              </View>
              <View style={styles.folderChips}>
                {state.folders.length === 0 ? <Text style={styles.emptyText}>还没有添加文件夹。</Text> : null}
                {state.folders.map((folder) => (
                  <Pressable
                    key={folder}
                    onPress={() => setState((current) => ({
                      ...current,
                      folders: current.folders.filter((item) => item !== folder),
                    }))}
                    style={styles.folderChip}
                  >
                    <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-outline" size={14} />
                    <Text numberOfLines={1} style={styles.folderChipText}>{folder}</Text>
                    <Ionicons color={MOBILE_SAGE_SLATE.subtle} name="close-outline" size={14} />
                  </Pressable>
                ))}
              </View>
              <View style={styles.dirBrowser}>
                <View style={styles.dirBar}>
                  <Pressable disabled={!dirPath || dirLoading} onPress={() => void loadDirectories(getParentPath(dirPath))} style={styles.editorSmallButton}>
                    <Ionicons color={MOBILE_SAGE_SLATE.muted} name="chevron-up-outline" size={16} />
                  </Pressable>
                  <Text numberOfLines={1} style={styles.dirPath}>{dirPath || '根目录'}</Text>
                </View>
                {dirError ? <Text style={styles.error}>{dirError}</Text> : null}
                {dirLoading ? <Text style={styles.emptyText}>正在读取目录...</Text> : null}
                {!dirLoading && availableDirs.length === 0 ? <Text style={styles.emptyText}>暂无可选目录。</Text> : null}
                {availableDirs.slice(0, 18).map((folderPath) => (
                  <View key={folderPath} style={styles.dirRow}>
                    <Pressable onPress={() => void loadDirectories(folderPath)} style={styles.dirMain}>
                      <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-outline" size={16} />
                      <Text numberOfLines={1} style={styles.dirName}>{getFolderName(folderPath)}</Text>
                    </Pressable>
                    <Pressable onPress={() => addFolder(folderPath)} style={styles.editorSmallButton}>
                      <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-open-outline" size={16} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </EditorSection>

            <EditorSection meta={`${state.selectedUserIds.length}/${visibleUsers.length}`} title="可使用该图库的用户">
              <View style={styles.checkGrid}>
                {visibleUsers.map((user) => {
                  const userKey = String(user.id ?? user.username);
                  const disabled = !Number.isFinite(Number(user.id));

                  return (
                    <CheckTile
                      active={state.selectedUserIds.includes(userKey)}
                      disabled={disabled}
                      key={userKey}
                      label={user.username}
                      meta={user.roleLabel}
                      onPress={() => setState((current) => ({
                        ...current,
                        selectedUserIds: toggleListValue(current.selectedUserIds, userKey),
                      }))}
                    />
                  );
                })}
              </View>
            </EditorSection>

            <EditorSection meta="处理对应任务时会跳过该图库" title="排除的识别任务">
              <View style={styles.checkGrid}>
                {RECOGNITION_TASKS.map((task) => (
                  <CheckTile
                    active={state.funcExclude.includes(task.value)}
                    key={task.value}
                    label={task.label}
                    onPress={() => setState((current) => ({
                      ...current,
                      funcExclude: toggleListValue(current.funcExclude, task.value),
                    }))}
                  />
                ))}
              </View>
            </EditorSection>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}
          </ScrollView>

          <View style={styles.dialogActions}>
            <Pressable disabled={submitting} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable disabled={submitting} onPress={() => void handleSubmit()} style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}>
              <Text style={styles.dialogPrimaryText}>{submitting ? '保存中' : '确定'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const WeightModal = ({
  actionLoading,
  gallery,
  onChangeValue,
  onClose,
  onSubmit,
  value,
}: {
  actionLoading: string;
  gallery?: AdminGallery;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  value: string;
}) => {
  const theme = useMobileTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(gallery)}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmSheet}>
          <Text style={styles.modalTitle}>修改排序权重</Text>
          <Text style={styles.modalSubtitle}>{gallery?.name}</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={onChangeValue}
            placeholder="例如 92604"
            placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
            style={styles.input}
            value={value}
          />
          <View style={styles.dialogActions}>
            <Pressable disabled={actionLoading === 'weight'} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable disabled={actionLoading === 'weight'} onPress={onSubmit} style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}>
              <Text style={styles.dialogPrimaryText}>保存</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ConfirmSheet = ({
  danger = false,
  loading,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  danger?: boolean;
  loading: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) => {
  const theme = useMobileTheme();

  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmSheet}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalSubtitle}>{message}</Text>
          <View style={styles.dialogActions}>
            <Pressable disabled={loading} onPress={onCancel} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable disabled={loading} onPress={onConfirm} style={[styles.dialogPrimaryButton, { backgroundColor: danger ? '#dc2626' : theme.hex }]}>
              <Text style={styles.dialogPrimaryText}>{danger ? '删除' : '确定'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const AdminActionButton = ({
  danger = false,
  icon,
  label,
  loading = false,
  onPress,
  primary = false,
}: {
  danger?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}) => {
  const theme = useMobileTheme();
  const color = primary ? '#fff' : danger ? '#b91c1c' : theme.hex;

  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={[
        styles.actionButton,
        primary ? { backgroundColor: theme.hex, borderColor: theme.hex } : { backgroundColor: theme.selection, borderColor: theme.light },
        danger ? styles.dangerSoftButton : null,
        loading ? styles.disabledButton : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons color={color} name={icon} size={16} />}
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
};

const SmallAction = ({
  danger = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  danger?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) => (
  <Pressable disabled={loading} onPress={onPress} style={[styles.smallAction, danger ? styles.smallActionDanger : null]}>
    {loading ? <ActivityIndicator color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} size="small" /> : (
      <Ionicons color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} name={icon} size={14} />
    )}
    <Text style={[styles.smallActionText, danger ? styles.smallActionTextDanger : null]}>{label}</Text>
  </Pressable>
);

const StatusChip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => {
  const theme = useMobileTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.statusTab, active ? { backgroundColor: theme.selection, borderColor: theme.light } : null]}
    >
      <Text style={[styles.statusTabText, active ? { color: theme.hex } : null]}>{label}</Text>
    </Pressable>
  );
};

const Metric = ({
  icon,
  label,
  meta,
  value,
}: {
  icon: AdminIconName;
  label: string;
  meta: string;
  value: string;
}) => (
  <View style={styles.metric}>
    <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={17} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
    <Text numberOfLines={1} style={styles.metricMeta}>{meta}</Text>
  </View>
);

const InfoItem = ({ label, value }: { label: string; value: unknown }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.infoValue}>{formatAdminInfoValue(value)}</Text>
  </View>
);

const InfoSection = ({ items, title }: { items: AdminInfoItem[]; title: string }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {items.length > 0 ? items.slice(0, 16).map((item) => (
      <View key={`${title}-${item.label}`} style={styles.infoRow}>
        <Text numberOfLines={1} style={styles.infoLabel}>{item.label}</Text>
        <Text numberOfLines={2} style={styles.infoValue}>{formatAdminInfoValue(item.value)}</Text>
      </View>
    )) : <EmptyLine text="当前接口未返回可展示数据" />}
  </View>
);

/**
 * Converts admin diagnostics values into React Native text-safe strings.
 */
const formatAdminInfoValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatAdminInfoValue).join(' · ') : '-';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== null && item !== '');

    return entries.length > 0
      ? entries.map(([key, item]) => `${formatAdminInfoKey(key)}: ${formatAdminInfoValue(item)}`).join(' · ')
      : '-';
  }

  return String(value);
};

const formatAdminInfoKey = (key: string): string => {
  return key.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
};

const EditorSection = ({ children, meta, title }: { children: ReactNode; meta: string; title: string }) => (
  <View style={styles.editorSection}>
    <View style={styles.editorSectionTitle}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardMeta}>{meta}</Text>
    </View>
    {children}
  </View>
);

const FormField = ({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
      style={styles.input}
      value={value}
    />
  </View>
);

const CheckTile = ({
  active,
  disabled = false,
  label,
  meta,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  meta?: string;
  onPress: () => void;
}) => {
  const theme = useMobileTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.checkTile,
        active ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Ionicons
        color={active ? theme.hex : MOBILE_SAGE_SLATE.subtle}
        name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
        size={16}
      />
      <View style={styles.checkTileCopy}>
        <Text numberOfLines={1} style={[styles.checkTileText, active ? { color: theme.hex } : null]}>{label}</Text>
        {meta ? <Text numberOfLines={1} style={[styles.checkTileMeta, active ? { color: theme.hex } : null]}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
};

const EmptyLine = ({ text }: { text: string }) => {
  return <Text style={styles.emptyText}>{text}</Text>;
};

const GALLERY_TONES = [
  { backgroundColor: '#0f766e' },
  { backgroundColor: '#2563eb' },
  { backgroundColor: '#7c3aed' },
  { backgroundColor: '#be123c' },
  { backgroundColor: '#ca8a04' },
  { backgroundColor: '#475569' },
];

  const EMPTY_CACHE_TOTALS: CacheFolderTotals = {
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  itemCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  size: 0,
  thumbnailCount: 0,
};

const createEmptyTaskCounts = (): AdminTaskCounts => ({
  active: 0,
  completed: 0,
  failed: 0,
  paused: 0,
  waiting: 0,
});

const createEmptyCacheStats = (): MobileCacheStats => ({
  approximateSize: 0,
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
});

/**
 * Calculates the horizontal offset that keeps the selected admin tab near the visual center.
 */
const getCenteredAdminTabScrollX = (tabLayout: AdminTabLayout, viewportWidth: number): number => {
  return Math.max(0, tabLayout.x - (viewportWidth - tabLayout.width) / 2);
};

/**
 * Keeps tab-level status text compact so the mobile shell does not need dense tables.
 */
const getAdminTabMeta = (tab: AdminTab, summary: AdminTabMetaSummary): string => {
  if (tab === 'gallery') {
    return `${summary.galleryCount} 个图库`;
  }

  if (tab === 'tasks') {
    return `${summary.taskCounts.active} 执行中 / ${summary.taskCounts.failed} 失败`;
  }

  if (tab === 'users') {
    return `${summary.userCount} 个用户`;
  }

  if (tab === 'cache') {
    return formatFileSize(summary.cacheStats.approximateSize);
  }

  if (tab === 'system') {
    return '服务与授权';
  }

  return `${summary.galleryCount} 图库 / ${summary.taskCounts.active} 任务`;
};

const getAdminTabLabel = (tab: AdminTab): string => {
  return ADMIN_TABS.find((item) => item.key === tab)?.label ?? '管理数据';
};

/**
 * Builds a folder-only cache tree from the mobile cache index.
 */
const buildCacheFolderTree = (folders: MobileCacheFolderSummary[]): CacheFolderTreeNode[] => {
  const roots: CacheFolderTreeNode[] = [];
  const nodes = folders.map(createCacheFolderTreeNode);

  nodes.forEach((node) => {
    const parentNode = findNearestCachedParentNode(node, nodes);

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  hydrateCacheTreeNodes(roots, 0);

  return roots;
};

const createCacheFolderTreeNode = (folder: MobileCacheFolderSummary): CacheFolderTreeNode => {
  const totals = createTotalsFromFolder(folder);

  return {
    branchTotals: { ...totals },
    children: [],
    depth: 0,
    folder,
    id: folder.folderScopeKey,
    name: folder.folderName,
    path: folder.folderPath,
    totals,
  };
};

const findNearestCachedParentNode = (
  node: CacheFolderTreeNode,
  nodes: CacheFolderTreeNode[],
): CacheFolderTreeNode | undefined => {
  const ancestors = nodes
    .filter((candidate) => {
      return (
        candidate.id !== node.id &&
        candidate.folder.scope === node.folder.scope &&
        isCachePathAncestor(candidate.folder.folderPath, node.folder.folderPath)
      );
    })
    .sort((first, second) => {
      return getCachePathDepth(second.folder.folderPath) - getCachePathDepth(first.folder.folderPath);
    });

  if (ancestors[0]) {
    return ancestors[0];
  }

  const rootNode = nodes.find((candidate) => {
    return (
      candidate.id !== node.id &&
      candidate.folder.scope === node.folder.scope &&
      isRootCacheFolder(candidate.folder)
    );
  });

  return isRootCacheFolder(node.folder) ? undefined : rootNode;
};

const hydrateCacheTreeNodes = (nodes: CacheFolderTreeNode[], depth: number): CacheFolderTotals => {
  const totals = { ...EMPTY_CACHE_TOTALS };

  nodes
    .sort((first, second) => first.name.localeCompare(second.name, 'zh-Hans-CN'))
    .forEach((node) => {
      node.depth = depth;

      const childTotals = hydrateCacheTreeNodes(node.children, depth + 1);

      node.totals = createTotalsFromFolder(node.folder);
      node.branchTotals = addCacheTotals(createTotalsFromFolder(node.folder), childTotals);
      addCacheTotals(totals, node.branchTotals);
    });

  return totals;
};

const createTotalsFromFolder = (folder: MobileCacheFolderSummary): CacheFolderTotals => ({
  coverCount: folder.coverCount,
  directoryCount: folder.directoryCount,
  hdThumbnailCount: folder.hdThumbnailCount,
  itemCount: folder.itemCount,
  mediaCount: folder.mediaCount,
  originalImageCount: folder.originalImageCount,
  originalVideoCount: folder.originalVideoCount,
  size: folder.size,
  thumbnailCount: folder.thumbnailCount,
});

const addCacheTotals = (target: CacheFolderTotals, source: CacheFolderTotals): CacheFolderTotals => {
  target.coverCount += source.coverCount;
  target.directoryCount += source.directoryCount;
  target.hdThumbnailCount += source.hdThumbnailCount;
  target.itemCount += source.itemCount;
  target.mediaCount += source.mediaCount;
  target.originalImageCount += source.originalImageCount;
  target.originalVideoCount += source.originalVideoCount;
  target.size += source.size;
  target.thumbnailCount += source.thumbnailCount;

  return target;
};

const collectCacheTreeFolders = (node: CacheFolderTreeNode): MobileCacheFolderSummary[] => {
  return [
    node.folder,
    ...node.children.flatMap((child) => collectCacheTreeFolders(child)),
  ];
};

const isCachePathAncestor = (parentPath: string, childPath: string): boolean => {
  const normalizedParentPath = normalizeCacheTreePath(parentPath);
  const normalizedChildPath = normalizeCacheTreePath(childPath);

  if (!normalizedParentPath || normalizedParentPath === normalizedChildPath) {
    return false;
  }

  return normalizedChildPath.startsWith(`${normalizedParentPath}/`);
};

const isRootCacheFolder = (folder: MobileCacheFolderSummary): boolean => {
  return folder.folderKey === 'root' || normalizeCacheTreePath(folder.folderPath) === '根目录';
};

const normalizeCacheTreePath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').trim();
};

const getCachePathDepth = (path: string): number => {
  return normalizeCacheTreePath(path).split('/').filter(Boolean).length;
};

const createInitialEditorState = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): GalleryEditorState => {
  return {
    adminOnly: gallery?.adminOnly ?? false,
    folderInput: '',
    folders: gallery?.folders.map((folder) => folder.path).filter(Boolean) ?? [],
    funcExclude: gallery?.funcExclude ?? [],
    hidden: gallery?.hidden ?? false,
    name: gallery?.name ?? '',
    selectedUserIds: getSelectedUserIds(gallery, users, userLinks, currentUser),
    weights: gallery?.weights === undefined ? '' : String(gallery.weights),
  };
};

const getSelectedUserIds = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): string[] => {
  if (gallery?.id !== undefined) {
    const linkedIds = userLinks
      .filter((link) => String(link.galleryId) === String(gallery.id))
      .map((link) => String(link.userId));

    if (linkedIds.length > 0) {
      return linkedIds;
    }
  }

  if (currentUser?.id) {
    return [String(currentUser.id)];
  }

  return users[0]?.id === undefined ? [] : [String(users[0].id)];
};

const mergeCurrentUser = (
  users: AdminUserRecord[],
  currentUser?: CurrentUser,
): AdminUserRecord[] => {
  if (!currentUser) {
    return users;
  }

  const hasCurrentUser = users.some((user) => String(user.id) === String(currentUser.id));

  if (hasCurrentUser) {
    return users;
  }

  return [
    {
      id: currentUser.id,
      roleLabel: currentUser.isSuperAdmin ? '超级管理员' : currentUser.isAdmin ? '管理员' : '普通用户',
      securityLabel: currentUser.otpEnable ? '已开启 2FA' : '未开启 2FA',
      username: currentUser.username,
    },
    ...users,
  ];
};

const toggleListValue = (values: string[], value: string): string[] => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};

const getParentPath = (path: string): string => {
  const parentPath = path.split(/[\\/]/).filter(Boolean).slice(0, -1).join('/');

  return path.startsWith('/') && parentPath ? `/${parentPath}` : parentPath;
};

const getFolderName = (path: string): string => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
};

const getServerHost = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl || '-';
  }
};

const formatAdminDateTime = (value?: number | string): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    gap: 7,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '900',
  },
  actionList: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionRow: {
    alignItems: 'center',
    borderBottomColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 13,
  },
  actionRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionRowMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  actionRowTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 13,
    fontWeight: '900',
  },
  activeTab: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
  },
  addCard: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: 6,
    minHeight: 96,
    justifyContent: 'center',
  },
  addCardIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderRadius: 999,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  addCardTitle: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  badge: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  card: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 9,
    padding: 14,
  },
  cardGroup: {
    gap: 11,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  cardMeta: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  cardSubtitle: {
    color: MOBILE_SAGE_SLATE.muted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 15,
    fontWeight: '900',
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  cacheClearButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 30,
    flexShrink: 0,
    paddingHorizontal: 9,
  },
  cacheClearText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  cacheDetailCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cacheDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cacheDetailIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  cacheDetailLabel: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  cacheDetailMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 9,
    fontWeight: '800',
  },
  cacheDetailStat: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    width: '48%',
    flexGrow: 1,
    gap: 6,
    minHeight: 46,
    padding: 8,
  },
  cacheDetailValue: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 14,
    fontWeight: '900',
    maxWidth: 76,
  },
  cacheCompositionRow: {
    borderTopColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingTop: 10,
  },
  cacheFolderSection: {
    gap: 9,
  },
  cacheFolderCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  cacheFolderIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  cacheFolderName: {
    color: MOBILE_SAGE_SLATE.strong,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '900',
  },
  cacheFolderNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  cacheFolderPath: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '700',
  },
  cacheFolderSummary: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  cacheFolderRow: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 15,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  cacheFolderRowHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  cacheFolderTitle: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  cacheHeroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cacheHeroCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  cacheHeroCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  cacheHeroFooter: {
    borderTopColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  cacheHeroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cacheHeroIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  cacheHeroKicker: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '900',
  },
  cacheHeroMeta: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  cacheHeroStat: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  cacheHeroStatLabel: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '900',
  },
  cacheHeroStatMeta: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '800',
  },
  cacheHeroStats: {
    borderTopColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
  },
  cacheHeroStatValue: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 18,
    fontWeight: '900',
  },
  cacheHeroSubtitle: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  cacheHeroTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 18,
    fontWeight: '900',
  },
  cacheList: {
    gap: 8,
  },
  cacheMetaPill: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  cacheMetaPillText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  cacheMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  cacheSectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  cacheSectionMeta: {
    color: MOBILE_SAGE_SLATE.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '800',
  },
  cacheSectionTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 14,
    fontWeight: '900',
  },
  cacheState: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 96,
    justifyContent: 'center',
    padding: 14,
  },
  cacheTreeChildren: {
    gap: 8,
    marginTop: 8,
  },
  cacheTreeNode: {
    gap: 0,
  },
  cacheTreeToggle: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  cacheStatusDot: {
    backgroundColor: MOBILE_SAGE_SLATE.subtle,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  cacheStatusSwitch: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  cacheStatusSwitchText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  checkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  checkTile: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  checkTileCopy: {
    flex: 1,
    minWidth: 0,
  },
  checkTileMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  checkTileText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  confirmSheet: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderRadius: 20,
    gap: 12,
    marginHorizontal: 18,
    padding: 16,
  },
  content: {
    alignItems: 'stretch',
    gap: 12,
    paddingBottom: 130,
    paddingHorizontal: ADMIN_PAGE_EDGE_PADDING,
    width: '100%',
  },
  dangerSoftButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogPrimaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dialogPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  dialogSecondaryButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dialogSecondaryText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  dirBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dirBrowser: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
    padding: 8,
  },
  dirMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  dirName: {
    color: MOBILE_SAGE_SLATE.body,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  dirPath: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  dirRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 34,
  },
  disabledButton: {
    opacity: 0.5,
  },
  editorContent: {
    gap: 12,
    paddingBottom: 14,
  },
  editorSection: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  editorSectionTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  editorSheet: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    flex: 1,
    gap: 12,
    marginTop: 42,
    padding: 14,
  },
  editorSmallButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 42,
  },
  emptyText: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 13,
    fontWeight: '800',
    paddingVertical: 12,
    textAlign: 'center',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '800',
    marginHorizontal: ADMIN_PAGE_EDGE_PADDING,
    padding: 12,
  },
  folderChip: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  folderChipText: {
    color: MOBILE_SAGE_SLATE.body,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: '900',
  },
  folderChips: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  folderInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formField: {
    flex: 1,
    gap: 6,
  },
  formGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  formLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  galleryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  galleryBody: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  galleryCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  galleryCover: {
    alignItems: 'center',
    borderRadius: 16,
    height: 88,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  galleryCoverCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  iconCloseButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 5,
    padding: 11,
  },
  infoLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 0.42,
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
    flex: 0.58,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  input: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  loadingMetricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  loadingStack: {
    gap: 10,
  },
  metric: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 4,
    padding: 12,
  },
  metricLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  metricMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  metricValue: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 17,
    fontWeight: '900',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalOverlay: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.sheetOverlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSubtitle: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 18,
    fontWeight: '900',
  },
  notificationLayer: {
    alignItems: 'center',
    left: ADMIN_PAGE_EDGE_PADDING,
    position: 'absolute',
    right: ADMIN_PAGE_EDGE_PADDING,
    top: 66,
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
  queueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionIntro: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  sectionIntroCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  sectionIntroIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionIntroMeta: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  sectionIntroTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 15,
    fontWeight: '900',
  },
  screen: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
    gap: 10,
    paddingTop: 10,
  },
  skeletonCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 9,
    minHeight: 92,
    padding: 14,
  },
  skeletonCardLine: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 10,
    opacity: 0.84,
    width: '82%',
  },
  skeletonCardLineShort: {
    width: '56%',
  },
  skeletonCardTitle: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    borderRadius: 999,
    height: 14,
    width: '44%',
  },
  skeletonLabel: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 10,
    width: '58%',
  },
  skeletonMetric: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 9,
    minHeight: 76,
    padding: 12,
  },
  skeletonValue: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    borderRadius: 999,
    height: 18,
    width: '72%',
  },
  smallAction: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 8,
  },
  smallActionDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  smallActionText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  smallActionTextDanger: {
    color: '#b91c1c',
  },
  statusTab: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  statusTabText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  statusTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryPill: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tab: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    minWidth: 128,
    paddingHorizontal: 11,
  },
  tabCopy: {
    flex: 1,
    minWidth: 0,
  },
  tabDescription: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  tabRail: {
    gap: 7,
    paddingHorizontal: ADMIN_PAGE_EDGE_PADDING,
  },
  tabRailFrame: {
    marginHorizontal: 0,
  },
  tabText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  tipCard: {
    alignItems: 'flex-start',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    padding: 12,
  },
  tipText: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  toolbarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userAvatar: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderRadius: 999,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
});
