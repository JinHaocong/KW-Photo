import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import type {
  AdminActiveTaskOverview,
  AdminDuplicateFileRecord,
  AdminFileDeleteLogPage,
  AdminGallery,
  AdminGalleryMutationPayload,
  AdminGalleryStat,
  AdminGalleryUserLink,
  AdminInfoItem,
  AdminLogRecord,
  AdminSystemConfigInfo,
  AdminSystemConfigRecord,
  AdminTask,
  AdminTaskCounts,
  AdminTaskStatus,
  AdminUserRecord,
  AuthTokens,
} from '@kwphoto/core';
import {
  ADMIN_MAINTENANCE_TASKS,
  ADMIN_SYSTEM_CONFIG_KEYS,
  clearAdminFileDeleteLogs,
  clearAdminSystemLogs,
  createAdminGallery,
  createAdminDatabaseBackup,
  createAdminMaintenanceTask,
  deleteAdminGallery,
  exportAdminDeletedFiles,
  fetchAdminActiveTaskOverview,
  fetchAdminGalleries,
  fetchAdminFileDeleteLogs,
  fetchAdminGalleryDetail,
  fetchAdminGalleryStat,
  fetchAdminGalleryUserLinks,
  fetchAdminLicenseInfo,
  fetchAdminSystemConfigInfo,
  fetchAdminSystemConfigs,
  fetchAdminSystemLogs,
  fetchAdminSystemStatus,
  fetchAdminTaskCounts,
  fetchAdminTasks,
  fetchAdminUsers,
  fetchAdminOfflineId,
  findAdminDuplicateFiles,
  getApiErrorMessage,
  pauseAdminTasks,
  resumeAdminTasks,
  scanAdminAllGalleries,
  scanAdminGallery,
  updateAdminSystemConfig,
  updateAdminTaskMaxThread,
  updateAdminGallery,
  updateAdminGalleryWeight,
  bindAdminLicense,
} from '@kwphoto/core';

import {
  clearAllMobileLocalCache,
  clearMobileLocalCache,
  createMobileLocalCacheScope,
  deleteMobileCacheFolderGroups,
  readMobileCacheStats,
  subscribeMobileCacheChanges,
} from './mobile-local-cache';
import type { MobileCacheStats } from './mobile-local-cache';
import {
  isMobileAdminTab,
  mergeMobilePreferences,
  readMobilePreferences,
} from './mobile-storage';
import {
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from './mobile-theme';
import {
  ACTIVE_TASK_REFETCH_INTERVAL,
  ADMIN_NOTIFICATION_VISIBLE_MS,
  ADMIN_TABS,
} from './admin/adminConfig';
import {
  createEmptyCacheStats,
  createEmptyTaskCounts,
} from './admin/adminCacheTree';
import {
  getAdminTabMeta,
  getCenteredAdminTabScrollX,
} from './admin/adminTabs';
import {
  clampThreadValue,
  readMobileExportTargetFolderPath,
  upsertSystemConfigValue,
} from './admin/adminPageUtils';
import { styles } from './admin/adminStyles';
import {
  AdminLoadingState,
  AdminSectionHeader,
} from './admin/components/AdminPrimitives';
import type {
  AdminTab,
  AdminTabLayout,
} from './admin/adminTypes';
import { AdminConfirmDialog, AdminWeightDialog } from './admin/dialogs/AdminActionDialogs';
import {
  DeletedFilesSheet,
  DeletedLogModal,
  GalleryEditorModal,
  GalleryStatsModal,
  ScanSettingsModal,
} from './admin/dialogs/MobileAdminDialogs';
import { useAdminGalleryTaskPolling } from './admin/hooks/useAdminGalleryTaskPolling';
import {
  CachePanel,
  GalleryPanel,
  OverviewPanel,
  SystemPanel,
  TaskPanel,
  UserPanel,
} from './admin/panels/MobileAdminPanels';
import type { MobileSession } from './mobile-types';
import { useMobileApiOptions } from './useMobileApiOptions';

interface MobileAdminPageProps {
  onChangeTokens: (tokens: AuthTokens) => void;
  session: MobileSession;
}


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
  const taskOverviewPollingInFlightRef = useRef(false);
  const tabLayoutsRef = useRef<Partial<Record<AdminTab, AdminTabLayout>>>({});
  const tabRailRef = useRef<ScrollView>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [actionLoading, setActionLoading] = useState('');
  const [activeTaskOverview, setActiveTaskOverview] = useState<AdminActiveTaskOverview>({ tasks: [] });
  const [adminPreferencesHydrated, setAdminPreferencesHydrated] = useState(false);
  const [backupPath, setBackupPath] = useState('');
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cacheStats, setCacheStats] = useState<MobileCacheStats>(() => createEmptyCacheStats());
  const [deleteTarget, setDeleteTarget] = useState<AdminGallery>();
  const [deletedFilesOpen, setDeletedFilesOpen] = useState(false);
  const [deletedLogOpen, setDeletedLogOpen] = useState(false);
  const [deletedLogPage, setDeletedLogPage] = useState<AdminFileDeleteLogPage>();
  const [duplicateFiles, setDuplicateFiles] = useState<AdminDuplicateFileRecord[]>();
  const [editorGallery, setEditorGallery] = useState<AdminGallery>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState('');
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [galleryStat, setGalleryStat] = useState<AdminGalleryStat>();
  const [licenseItems, setLicenseItems] = useState<AdminInfoItem[]>([]);
  const [licenseInput, setLicenseInput] = useState('');
  const [loadedTabs, setLoadedTabs] = useState<Partial<Record<AdminTab, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [maintenanceTaskType, setMaintenanceTaskType] = useState('');
  const [message, setMessage] = useState('');
  const [offlineId, setOfflineId] = useState('');
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [submittingEditor, setSubmittingEditor] = useState(false);
  const [systemConfigInfo, setSystemConfigInfo] = useState<AdminSystemConfigInfo>();
  const [systemConfigs, setSystemConfigs] = useState<AdminSystemConfigRecord[]>([]);
  const [systemItems, setSystemItems] = useState<AdminInfoItem[]>([]);
  const [systemLogs, setSystemLogs] = useState<AdminLogRecord[]>([]);
  const [taskCounts, setTaskCounts] = useState<AdminTaskCounts>(() => createEmptyTaskCounts());
  const [taskStatus, setTaskStatus] = useState<AdminTaskStatus>('active');
  const [taskThreadValue, setTaskThreadValue] = useState('1');
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [tabLayoutVersion, setTabLayoutVersion] = useState(0);
  const [tabRailViewportWidth, setTabRailViewportWidth] = useState(0);
  const [userLinks, setUserLinks] = useState<AdminGalleryUserLink[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [weightTarget, setWeightTarget] = useState<AdminGallery>();
  const [weightValue, setWeightValue] = useState('');
  const { activeTasks: galleryActiveTasks, startPolling: startGalleryTaskPolling } = useAdminGalleryTaskPolling({
    activeTab,
    apiOptions,
    enabled: adminPreferencesHydrated,
    userId: session.user.id,
  });
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

  /**
   * Refreshes the lightweight backend task overview and skips overlapping mobile polls.
   */
  const loadTaskOverview = useCallback(async (): Promise<void> => {
    if (taskOverviewPollingInFlightRef.current) {
      return;
    }

    taskOverviewPollingInFlightRef.current = true;

    try {
      const [overviewResult, countsResult] = await Promise.allSettled([
        fetchAdminActiveTaskOverview(apiOptions),
        fetchAdminTaskCounts(apiOptions),
      ]);

      if (overviewResult.status === 'fulfilled') {
        setActiveTaskOverview(overviewResult.value);
      }

      if (countsResult.status === 'fulfilled') {
        setTaskCounts(countsResult.value);
      }
    } finally {
      taskOverviewPollingInFlightRef.current = false;
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
        const [counts, nextTasks, configInfoResult] = await Promise.all([
          fetchAdminTaskCounts(apiOptions),
          fetchAdminTasks(apiOptions, taskStatus),
          fetchAdminSystemConfigInfo(apiOptions).catch(() => undefined),
        ]);

        setTaskCounts(counts);
        setTasks(nextTasks);
        await loadTaskOverview();

        if (configInfoResult) {
          setSystemConfigInfo(configInfoResult);
          setTaskThreadValue(String(configInfoResult.taskMaxThreadNum));
        }
      }

      if (activeTab === 'users') {
        setUsers(await fetchAdminUsers(apiOptions));
      }

      if (activeTab === 'cache') {
        await loadCachePreferences();
      }

      if (activeTab === 'system') {
        const [systemResult, licenseResult, configResult, configInfoResult, logsResult] = await Promise.allSettled([
          fetchAdminSystemStatus(apiOptions),
          fetchAdminLicenseInfo(apiOptions),
          fetchAdminSystemConfigs(apiOptions),
          fetchAdminSystemConfigInfo(apiOptions),
          fetchAdminSystemLogs(apiOptions),
        ]);

        setSystemItems(systemResult.status === 'fulfilled' ? systemResult.value : []);
        setLicenseItems(licenseResult.status === 'fulfilled' ? licenseResult.value : []);
        setSystemConfigs(configResult.status === 'fulfilled' ? configResult.value : []);
        setSystemConfigInfo(configInfoResult.status === 'fulfilled' ? configInfoResult.value : undefined);
        setSystemLogs(logsResult.status === 'fulfilled' ? logsResult.value : []);
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
  }, [activeTab, apiOptions, loadCachePreferences, loadGalleries, loadTaskOverview, taskStatus]);

  useEffect(() => {
    if (!adminPreferencesHydrated) {
      return;
    }

    void loadActiveTab();
  }, [adminPreferencesHydrated, loadActiveTab]);

  useEffect(() => {
    if (!adminPreferencesHydrated || activeTab !== 'tasks') {
      return undefined;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * Starts the next mobile backend-task poll only after the current request settles.
     */
    const pollTaskOverview = async (): Promise<void> => {
      await loadTaskOverview();

      if (!cancelled) {
        timer = setTimeout(() => void pollTaskOverview(), ACTIVE_TASK_REFETCH_INTERVAL);
      }
    };

    void pollTaskOverview();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeTab, adminPreferencesHydrated, loadTaskOverview]);

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
      startGalleryTaskPolling();
      await loadGalleries();
      return `${gallery.name} 已触发${scanType ? '检查模式' : ''}扫描`;
    });
  };

  /**
   * Opens the mobile delete-log sheet and loads one server page.
   */
  const handleOpenDeletedLogs = async (pageNo = 1): Promise<void> => {
    setDeletedLogOpen(true);
    await runAdminAction('deleted-logs', async () => {
      setDeletedLogPage(await fetchAdminFileDeleteLogs(apiOptions, pageNo));
      return undefined;
    });
  };

  /**
   * Clears delete logs and immediately refreshes the open sheet.
   */
  const handleClearDeletedLogs = async (): Promise<void> => {
    await runAdminAction('clear-deleted-logs', async () => {
      await clearAdminFileDeleteLogs(apiOptions);
      setDeletedLogPage(await fetchAdminFileDeleteLogs(apiOptions, 1));
      return '文件删除记录已清空';
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
   * Submits one demo-compatible backend maintenance task from mobile.
   */
  const handleRunMaintenanceTask = async (taskType = maintenanceTaskType): Promise<void> => {
    const selectedTask = ADMIN_MAINTENANCE_TASKS.find((task) => task.value === taskType);

    if (!selectedTask) {
      setMessage('请选择要执行的系统维护任务');
      return;
    }

    const isClearAllJobs = selectedTask.value === 'clearAllJobs';

    const submitTask = async (): Promise<void> => {
      await runAdminAction(`maintenance-${selectedTask.value}`, async () => {
        await createAdminMaintenanceTask(apiOptions, selectedTask.value);
        setMaintenanceTaskType('');
        setActiveTaskOverview(await fetchAdminActiveTaskOverview(apiOptions).catch(() => ({ tasks: [] })));
        return isClearAllJobs ? '重启服务已提交' : '系统维护任务已提交';
      });
    };

    if (isClearAllJobs) {
      Alert.alert(
        '重启服务',
        '该操作会清空后台任务队列，用于重置任务服务状态，不会真正重启应用进程，是否继续？',
        [
          { style: 'cancel', text: '取消' },
          { onPress: () => void submitTask(), style: 'destructive', text: '重启' },
        ],
      );
      return;
    }

    if (selectedTask.destructive) {
      Alert.alert('执行系统维护任务', selectedTask.label, [
        { style: 'cancel', text: '取消' },
        { onPress: () => void submitTask(), style: 'destructive', text: '执行' },
      ]);
      return;
    }

    await submitTask();
  };

  /**
   * Persists backend worker thread count from the mobile task scheduler.
   */
  const handleSaveTaskThread = async (): Promise<void> => {
    const maxThread = Math.max(1, systemConfigInfo?.cpuThreadNum ?? 1);
    const nextValue = clampThreadValue(Number(taskThreadValue), maxThread);

    setTaskThreadValue(String(nextValue));
    await runAdminAction('task-thread', async () => {
      await updateAdminTaskMaxThread(apiOptions, nextValue);
      setSystemConfigInfo(await fetchAdminSystemConfigInfo(apiOptions).catch(() => systemConfigInfo));
      return '后台任务调度已保存';
    });
  };

  /**
   * Saves one system-config value and keeps the mobile config cards in sync.
   */
  const handleUpdateSystemConfig = async (key: string, value: string, messageText: string): Promise<void> => {
    await runAdminAction(`system-config-${key}`, async () => {
      await updateAdminSystemConfig(apiOptions, key, value);
      setSystemConfigs((current) => upsertSystemConfigValue(current, key, value));
      return messageText;
    });
  };

  /**
   * Creates a server database backup from mobile system config.
   */
  const handleCreateDatabaseBackup = async (): Promise<void> => {
    await runAdminAction('db-backup', async () => {
      const path = await createAdminDatabaseBackup(apiOptions);

      setBackupPath(path ?? '');
      return path ? `数据库备份已生成：${path}` : '数据库备份已生成';
    });
  };

  /**
   * Binds an online license code entered in the mobile system config page.
   */
  const handleBindLicense = async (): Promise<void> => {
    if (!licenseInput.trim()) {
      setMessage('请输入激活码');
      return;
    }

    await runAdminAction('license-bind', async () => {
      await bindAdminLicense(apiOptions, licenseInput.trim());
      setLicenseInput('');
      setLicenseItems(await fetchAdminLicenseInfo(apiOptions).catch(() => []));
      return '授权信息已提交';
    });
  };

  /**
   * Loads the offline license machine id for manual activation.
   */
  const handleFetchOfflineId = async (): Promise<void> => {
    await runAdminAction('offline-id', async () => {
      const id = await fetchAdminOfflineId(apiOptions);

      setOfflineId(id);
      return id ? '离线 ID 已获取' : '服务端未返回离线 ID';
    });
  };

  /**
   * Clears server-side in-memory logs from the mobile admin system page.
   */
  const handleClearSystemLogs = async (): Promise<void> => {
    await runAdminAction('logs-clear', async () => {
      await clearAdminSystemLogs(apiOptions);
      setSystemLogs([]);
      return '系统日志已清空';
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
      return '本账号缓存已清理';
    });
  };

  /**
   * Clears every mobile cache scope and removes orphaned files from the cache directory.
   */
  const handleClearAllMobileCache = async (): Promise<void> => {
    await runAdminAction('clear-all-mobile-cache', async () => {
      await clearAllMobileLocalCache();
      await loadCachePreferences();
      return '全部移动端缓存已清理';
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

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={(
          <RefreshControl
            colors={[theme.hex]}
            onRefresh={loadActiveTab}
            progressBackgroundColor="#fff"
            refreshing={showRefreshLoading}
            tintColor={theme.hex}
          />
        )}
        showsVerticalScrollIndicator={false}
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
                activeTasks={galleryActiveTasks}
                duplicateFiles={duplicateFiles}
                galleries={galleries}
                galleryStat={galleryStat}
                onDeleteGallery={setDeleteTarget}
                onOpenDeletedLogs={() => void handleOpenDeletedLogs()}
                onOpenDeletedFiles={() => setDeletedFilesOpen(true)}
                onOpenScanSettings={() => setScanSettingsOpen(true)}
                onFindDuplicateFiles={() => runAdminAction('duplicate', async () => {
                  if (galleryIds.length === 0) {
                    return '当前没有可检查的图库';
                  }

                  const files = await findAdminDuplicateFiles(apiOptions, galleryIds);

                  setDuplicateFiles(files);
                  return files.length > 0 ? `发现 ${files.length} 个重复文件` : '没有发现重复文件';
                })}
                onOpenEditor={openEditor}
                onOpenStats={() => setStatsOpen(true)}
                onScanAll={() => runAdminAction('scan-all', async () => {
                  await scanAdminAllGalleries(apiOptions);
                  startGalleryTaskPolling();
                  await loadGalleries();
                  return '已触发所有图库扫描';
                })}
                onScanGallery={handleScanGallery}
                onWeightGallery={(gallery) => {
                  setWeightTarget(gallery);
                  setWeightValue(gallery.weights === undefined ? '' : String(gallery.weights));
                }}
              />
            ) : null}

            {activeTab === 'tasks' ? (
              <TaskPanel
                actionLoading={actionLoading}
                activeOverview={activeTaskOverview}
                configInfo={systemConfigInfo}
                counts={taskCounts}
                onChangeStatus={setTaskStatus}
                onChangeMaintenanceTaskType={setMaintenanceTaskType}
                onChangeThreadValue={setTaskThreadValue}
                onQueueAction={handleTaskQueueAction}
                onRunMaintenanceTask={handleRunMaintenanceTask}
                onSaveTaskThread={handleSaveTaskThread}
                status={taskStatus}
                maintenanceTaskType={maintenanceTaskType}
                tasks={tasks}
                threadValue={taskThreadValue}
              />
            ) : null}

            {activeTab === 'users' ? <UserPanel currentUser={session.user} users={users} /> : null}

            {activeTab === 'cache' ? (
              <CachePanel
                actionLoading={actionLoading}
                cacheEnabled={cacheEnabled}
                cacheScope={cacheScope}
                stats={cacheStats}
                onClearAllCache={handleClearAllMobileCache}
                onClearCache={handleClearCache}
                onClearFolderBranch={handleClearCacheFolderBranch}
                onRefreshCache={loadCachePreferences}
                onToggleCache={handleToggleCache}
              />
            ) : null}

            {activeTab === 'system' ? (
              <SystemPanel
                actionLoading={actionLoading}
                backupPath={backupPath}
                licenseItems={licenseItems}
                licenseInput={licenseInput}
                offlineId={offlineId}
                onBindLicense={handleBindLicense}
                onChangeLicenseInput={setLicenseInput}
                onClearLogs={handleClearSystemLogs}
                onCreateDatabaseBackup={handleCreateDatabaseBackup}
                onFetchOfflineId={handleFetchOfflineId}
                onOpenScanSettings={() => setScanSettingsOpen(true)}
                onUpdateConfig={handleUpdateSystemConfig}
                session={session}
                systemConfigInfo={systemConfigInfo}
                systemConfigs={systemConfigs}
                systemItems={systemItems}
                systemLogs={systemLogs}
              />
            ) : null}
          </>
        )}
      </ScrollView>

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

      <ScanSettingsModal
        apiOptions={apiOptions}
        open={scanSettingsOpen}
        onClose={() => setScanSettingsOpen(false)}
        onSaved={(nextMessage) => setMessage(nextMessage)}
      />

      <GalleryStatsModal
        apiOptions={apiOptions}
        galleries={galleries}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onSaved={(nextMessage) => setMessage(nextMessage)}
        onStatsLoaded={setGalleryStat}
      />

      <DeletedLogModal
        actionLoading={actionLoading}
        open={deletedLogOpen}
        page={deletedLogPage}
        onClearLogs={handleClearDeletedLogs}
        onClose={() => setDeletedLogOpen(false)}
        onExportDeletedFiles={() => runAdminAction('deleted', async () => {
          await exportAdminDeletedFiles(apiOptions);
          return '文件删除记录导出任务已提交';
        })}
        onLoadPage={handleOpenDeletedLogs}
      />

      {deletedFilesOpen ? (
        <DeletedFilesSheet
          apiOptions={apiOptions}
          open={deletedFilesOpen}
          onClose={() => setDeletedFilesOpen(false)}
          onMessage={setMessage}
        />
      ) : null}

      <AdminWeightDialog
        actionLoading={actionLoading}
        galleryName={weightTarget?.name}
        value={weightValue}
        visible={Boolean(weightTarget)}
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
        <AdminConfirmDialog
          danger
          loading={actionLoading === 'delete'}
          message={`确定删除 ${deleteTarget.name} 吗？不会直接删除磁盘文件，但会移除图库配置。`}
          title="删除图库"
          visible={Boolean(deleteTarget)}
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
