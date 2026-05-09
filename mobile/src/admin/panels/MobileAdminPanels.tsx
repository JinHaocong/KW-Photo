import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type {
  AdminActiveTaskOverview,
  AdminGallery,
  AdminGalleryStat,
  AdminInfoItem,
  AdminLogRecord,
  AdminSystemConfigInfo,
  AdminSystemConfigRecord,
  AdminTask,
  AdminTaskCounts,
  AdminTaskStatus,
  AdminUserRecord,
  CurrentUser,
} from '@kwphoto/core';
import { ADMIN_MAINTENANCE_TASKS, ADMIN_SYSTEM_CONFIG_KEYS } from '@kwphoto/core';

import type { MobileCacheFolderSummary, MobileCacheStats } from '../../mobile-local-cache';
import { listMobileCacheFolders } from '../../mobile-local-cache';
import { MOBILE_SAGE_SLATE, useMobileTheme } from '../../mobile-theme';
import type { MobileSession } from '../../mobile-types';
import {
  buildCacheFolderTree,
  collectCacheTreeFolders,
  getCacheCompositionPills,
  getCacheFolderMetaPills,
} from '../adminCacheTree';
import {
  ADMIN_TABS,
  TASK_STATUS_LABELS,
  TASK_TABS,
} from '../adminConfig';
import { formatAdminDateTime, formatFileSize, getServerHost } from '../adminFormatters';
import {
  MOBILE_SYSTEM_CONFIGS,
  SYSTEM_LANGUAGE_OPTIONS,
  clampThreadValue,
  createToggledSystemConfigValue,
  formatTaskProgressText,
  formatTaskSubTaskText,
  getTaskProgressPercent,
  normalizeSystemLanguage,
  readSystemConfigEnabled,
  summarizeSystemConfigValue,
} from '../adminPageUtils';
import { styles } from '../adminStyles';
import type { AdminIconName, AdminTab, CacheFolderTreeNode } from '../adminTypes';
import { mergeCurrentUser } from '../galleryEditorUtils';
import { MobileBottomSheetModal } from '../../components/MobileDialog';
import { AdminGalleryCard } from './AdminGalleryCard';
import {
  AdminActionButton,
  EmptyLine,
  InfoItem,
  InfoSection,
  Metric,
  SmallAction,
  StatusChip,
} from '../components/AdminPrimitives';

/**
 * Renders the admin overview tab with high-level server, user, gallery, task, and cache metrics.
 */
export const OverviewPanel = ({
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

/**
 * Renders gallery maintenance commands and the editable gallery card grid.
 */
export const GalleryPanel = ({
  actionLoading,
  activeTasks,
  galleries,
  galleryStat,
  onDeleteGallery,
  onFindDuplicateFiles,
  onOpenEditor,
  onOpenDeletedFiles,
  onOpenDeletedLogs,
  onOpenScanSettings,
  onOpenStats,
  onScanAll,
  onScanGallery,
  onWeightGallery,
}: {
  actionLoading: string;
  activeTasks: AdminTask[];
  galleries: AdminGallery[];
  galleryStat?: AdminGalleryStat;
  onDeleteGallery: (gallery: AdminGallery) => void;
  onFindDuplicateFiles: () => void;
  onOpenEditor: (gallery?: AdminGallery) => Promise<void>;
  onOpenDeletedFiles: () => void;
  onOpenDeletedLogs: () => void;
  onOpenScanSettings: () => void;
  onOpenStats: () => void;
  onScanAll: () => void;
  onScanGallery: (gallery: AdminGallery, scanType?: 'check') => Promise<void>;
  onWeightGallery: (gallery: AdminGallery) => void;
}) => {
  const hiddenCount = galleries.filter((gallery) => gallery.hidden).length;
  const visibleCount = Math.max(0, galleries.length - hiddenCount);
  const folderCount = galleries.reduce((total, gallery) => total + Math.max(1, gallery.folders.length), 0);

  return (
    <View style={styles.cardGroup}>
      <View style={styles.galleryCommandPanel}>
        <View style={styles.galleryCommandHeader}>
          <View style={styles.galleryCommandIcon}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="images-outline" size={19} />
          </View>
          <View style={styles.galleryCommandCopy}>
            <Text style={styles.galleryCommandTitle}>图库维护</Text>
            <Text style={styles.galleryCommandMeta}>{galleries.length} 个图库 · {folderCount} 个目录</Text>
          </View>
        </View>

        <View style={styles.galleryMetricRow}>
          <GalleryMetricPill label="可见" value={String(visibleCount)} />
          <GalleryMetricPill label="隐藏" value={String(hiddenCount)} />
          <GalleryMetricPill label="目录" value={String(folderCount)} />
        </View>

        <View style={styles.galleryPrimaryActions}>
          <GalleryCommandButton
            icon="scan-outline"
            label="扫描所有图库"
            loading={actionLoading === 'scan-all'}
            primary
            onPress={onScanAll}
          />
          <GalleryCommandButton
            icon="settings-outline"
            label="扫描设置"
            onPress={onOpenScanSettings}
          />
        </View>

        <View style={styles.gallerySecondaryActions}>
          <GalleryCommandButton
            icon="checkmark-circle-outline"
            label="重复文件"
            loading={actionLoading === 'duplicate'}
            onPress={onFindDuplicateFiles}
          />
          <GalleryCommandButton
            danger
            icon="document-text-outline"
            label="删除记录"
            loading={actionLoading === 'deleted-logs'}
            onPress={onOpenDeletedLogs}
          />
          <GalleryCommandButton
            icon="bar-chart-outline"
            label="统计"
            onPress={onOpenStats}
          />
          <GalleryCommandButton
            danger
            icon="alert-circle-outline"
            label="异常文件"
            onPress={onOpenDeletedFiles}
          />
        </View>
      </View>

      {galleryStat ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryPill}>照片：{galleryStat.photo}</Text>
          <Text style={styles.summaryPill}>视频：{galleryStat.video}</Text>
          <Text style={styles.summaryPill}>总大小：{formatFileSize(galleryStat.totalSize)}</Text>
        </View>
      ) : null}

      <View style={styles.galleryListHeader}>
        <View>
          <Text style={styles.galleryListTitle}>图库列表</Text>
          <Text style={styles.galleryListMeta}>{galleries.length} 个图库配置</Text>
        </View>
        <Pressable onPress={() => void onOpenEditor()} style={styles.galleryAddButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="add-outline" size={16} />
          <Text style={styles.galleryAddButtonText}>添加</Text>
        </Pressable>
      </View>

      {galleries.length === 0 ? <EmptyLine text="暂无图库数据" /> : null}
      <View style={styles.galleryGrid}>
        {galleries.map((gallery) => (
          <AdminGalleryCard
            actionLoading={actionLoading}
            activeTasks={activeTasks}
            gallery={gallery}
            key={gallery.id ?? gallery.path}
            onDeleteGallery={onDeleteGallery}
            onOpenEditor={onOpenEditor}
            onScanGallery={onScanGallery}
            onWeightGallery={onWeightGallery}
          />
        ))}
      </View>
    </View>
  );
};

const GalleryMetricPill = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.galleryMetricPill}>
    <Text style={styles.galleryMetricValue}>{value}</Text>
    <Text style={styles.galleryMetricLabel}>{label}</Text>
  </View>
);

const GalleryCommandButton = ({
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
        styles.galleryCommandButton,
        primary ? { backgroundColor: theme.hex, borderColor: theme.hex } : { backgroundColor: theme.selection, borderColor: theme.light },
        danger ? styles.dangerSoftButton : null,
        loading ? styles.disabledButton : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons color={color} name={icon} size={15} />}
      <Text numberOfLines={1} style={[styles.galleryCommandButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
};

/**
 * Renders backend task counts, queue actions, thread limits, and maintenance task controls.
 */
export const TaskPanel = ({
  actionLoading,
  activeOverview,
  configInfo,
  counts,
  maintenanceTaskType,
  onChangeStatus,
  onChangeMaintenanceTaskType,
  onChangeThreadValue,
  onQueueAction,
  onRunMaintenanceTask,
  onSaveTaskThread,
  status,
  tasks,
  threadValue,
}: {
  actionLoading: string;
  activeOverview: AdminActiveTaskOverview;
  configInfo?: AdminSystemConfigInfo;
  counts: AdminTaskCounts;
  maintenanceTaskType: string;
  onChangeStatus: (status: AdminTaskStatus) => void;
  onChangeMaintenanceTaskType: (taskType: string) => void;
  onChangeThreadValue: (value: string) => void;
  onQueueAction: (action: 'pause' | 'resume') => Promise<void>;
  onRunMaintenanceTask: (taskType?: string) => Promise<void>;
  onSaveTaskThread: () => Promise<void>;
  status: AdminTaskStatus;
  tasks: AdminTask[];
  threadValue: string;
}) => {
  const maxThread = Math.max(1, configInfo?.cpuThreadNum ?? (Number(threadValue) || 1));
  const selectedMaintenanceTask = ADMIN_MAINTENANCE_TASKS.find((task) => task.value === maintenanceTaskType);
  const [maintenanceSheetOpen, setMaintenanceSheetOpen] = useState(false);

  return (
    <View style={styles.cardGroup}>
      <View style={styles.metricsGrid}>
        {TASK_TABS.map((item) => (
          <Metric key={item} icon="pulse-outline" label={TASK_STATUS_LABELS[item]} meta="服务端任务" value={String(counts[item])} />
        ))}
      </View>

      <View style={[styles.card, styles.taskInfoCard]}>
        <View style={styles.taskInfoHeader}>
          <View style={styles.taskInfoIcon}>
            <Ionicons color={MOBILE_SAGE_SLATE.strong} name="pulse-outline" size={18} />
          </View>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>后台任务信息</Text>
            <Text style={styles.cardMeta}>查看当前后台正在执行的任务</Text>
          </View>
        </View>
        <View style={styles.activeTaskSummaryRow}>
          <Text style={styles.activeTaskSectionLabel}>当前正在执行的任务：</Text>
          {activeOverview.tasks.length > 0 ? (
            <Text style={styles.activeTaskCountPill}>{activeOverview.tasks.length} 个</Text>
          ) : null}
        </View>
        <View style={styles.activeTaskList}>
          {activeOverview.tasks.length > 0 ? activeOverview.tasks.map((task) => (
            <MobileActiveTaskCard key={task.id} task={task} />
          )) : <EmptyLine text="当前没有正在执行的后台任务" />}
        </View>
      </View>

      <View style={styles.queueActions}>
        <AdminActionButton icon="pause-outline" label="暂停队列" loading={actionLoading === 'pause'} onPress={() => void onQueueAction('pause')} />
        <AdminActionButton primary icon="play-outline" label="恢复队列" loading={actionLoading === 'resume'} onPress={() => void onQueueAction('resume')} />
        <AdminActionButton
          danger
          icon="refresh-circle-outline"
          label="重启服务"
          loading={actionLoading === 'maintenance-clearAllJobs'}
          onPress={() => void onRunMaintenanceTask('clearAllJobs')}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>后台任务调度</Text>
        <Text style={styles.cardMeta}>限制后台任务最多使用的 CPU 线程数，当前上限 {maxThread}</Text>
        <View style={styles.threadControl}>
          <Pressable
            onPress={() => onChangeThreadValue(String(clampThreadValue(Number(threadValue) - 1, maxThread)))}
            style={styles.threadStepButton}
          >
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="remove-outline" size={16} />
          </Pressable>
          <TextInput
            keyboardType="numeric"
            onChangeText={onChangeThreadValue}
            placeholder="1"
            placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
            style={styles.threadInput}
            value={threadValue}
          />
          <Pressable
            onPress={() => onChangeThreadValue(String(clampThreadValue(Number(threadValue) + 1, maxThread)))}
            style={styles.threadStepButton}
          >
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="add-outline" size={16} />
          </Pressable>
          <AdminActionButton
            icon="save-outline"
            label="保存"
            loading={actionLoading === 'task-thread'}
            onPress={() => void onSaveTaskThread()}
            primary
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>系统维护工具</Text>
        <Text style={styles.cardMeta}>维护任务会提交到后台任务队列执行。</Text>
        <Pressable
          onPress={() => setMaintenanceSheetOpen(true)}
          style={styles.maintenanceDropdownTrigger}
        >
          <View style={styles.maintenanceTaskCopy}>
            <Text numberOfLines={2} style={styles.maintenanceTaskText}>{selectedMaintenanceTask?.label ?? '不执行任务'}</Text>
            <Text numberOfLines={1} style={styles.maintenanceTaskCode}>{selectedMaintenanceTask?.value ?? '请选择系统维护任务'}</Text>
          </View>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="chevron-forward-outline" size={17} />
        </Pressable>
        <MaintenanceTaskSheet
          maintenanceTaskType={maintenanceTaskType}
          visible={maintenanceSheetOpen}
          onChangeMaintenanceTaskType={onChangeMaintenanceTaskType}
          onClose={() => setMaintenanceSheetOpen(false)}
        />
        <AdminActionButton
          icon="rocket-outline"
          label={selectedMaintenanceTask ? '执行任务' : '请选择任务'}
          loading={selectedMaintenanceTask ? actionLoading === `maintenance-${selectedMaintenanceTask.value}` : false}
          onPress={() => void onRunMaintenanceTask()}
          primary
        />
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

/**
 * Shows all system maintenance task options in a native bottom sheet.
 */
const MaintenanceTaskSheet = ({
  maintenanceTaskType,
  onChangeMaintenanceTaskType,
  onClose,
  visible,
}: {
  maintenanceTaskType: string;
  onChangeMaintenanceTaskType: (taskType: string) => void;
  onClose: () => void;
  visible: boolean;
}) => {
  const selectTask = (taskType: string): void => {
    onChangeMaintenanceTaskType(taskType);
    onClose();
  };

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.maintenanceSheet}
      onClose={onClose}
      visible={visible}
    >
      <View style={styles.modalHeader}>
        <View style={styles.modalTitleWrap}>
          <Text style={styles.modalTitle}>选择系统维护任务</Text>
          <Text style={styles.modalSubtitle}>维护任务会提交到后台队列执行</Text>
        </View>
        <Pressable onPress={onClose} style={styles.iconCloseButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.maintenanceTaskList} showsVerticalScrollIndicator={false}>
        <MaintenanceTaskOptionRow
          active={!maintenanceTaskType}
          code="none"
          label="不执行任务"
          onPress={() => selectTask('')}
        />
        {ADMIN_MAINTENANCE_TASKS.map((task) => (
          <MaintenanceTaskOptionRow
            active={maintenanceTaskType === task.value}
            code={task.value}
            key={task.value}
            label={task.label}
            onPress={() => selectTask(task.value)}
          />
        ))}
      </ScrollView>
    </MobileBottomSheetModal>
  );
};

/**
 * Renders one selectable system maintenance task inside the bottom sheet.
 */
const MaintenanceTaskOptionRow = ({
  active,
  code,
  label,
  onPress,
}: {
  active: boolean;
  code: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} style={[styles.maintenanceTaskRow, active ? styles.maintenanceTaskRowActive : null]}>
    <Ionicons
      color={active ? MOBILE_SAGE_SLATE.strong : MOBILE_SAGE_SLATE.muted}
      name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
      size={16}
    />
    <View style={styles.maintenanceTaskCopy}>
      <Text numberOfLines={2} style={styles.maintenanceTaskText}>{label}</Text>
      <Text numberOfLines={1} style={styles.maintenanceTaskCode}>{code}</Text>
    </View>
  </Pressable>
);

const MobileActiveTaskCard = ({ task }: { task: AdminTask }) => {
  const theme = useMobileTheme();
  const progressPercent = getTaskProgressPercent(task);

  return (
    <View style={styles.activeTaskCard}>
      <View style={styles.activeTaskHeader}>
        <View style={styles.activeTaskTitleWrap}>
          <Text numberOfLines={1} style={styles.activeTaskTitle}>{task.name}</Text>
          {task.stage?.folder ? (
            <Text numberOfLines={2} style={styles.activeTaskFolder}>
              <Text style={styles.activeTaskFolderLabel}>当前目录</Text>
              {' '}
              {task.stage.folder}
            </Text>
          ) : null}
          {task.stage?.label && !task.stage.folder ? <Text numberOfLines={2} style={styles.activeTaskFolder}>{task.stage.label}</Text> : null}
        </View>
        <View style={[styles.activeTaskProgressBadge, { backgroundColor: theme.selection, borderColor: theme.light }]}>
          <Text style={[styles.activeTaskProgressBadgeText, { color: theme.hex }]}>{formatTaskProgressText(task)}</Text>
        </View>
      </View>
      <View style={styles.activeTaskProgressBlock}>
        <View style={[styles.progressTrack, { backgroundColor: theme.selection }]}>
          <View style={[styles.progressFill, { backgroundColor: theme.hex, width: `${progressPercent}%` }]} />
        </View>
        <View style={styles.activeTaskProgressMeta}>
          <Text numberOfLines={2} style={styles.activeTaskSubTaskText}>{formatTaskSubTaskText(task)}</Text>
          <Text style={styles.activeTaskPercentText}>{Math.round(progressPercent)}%</Text>
        </View>
      </View>
    </View>
  );
};

/**
 * Renders mobile admin users while ensuring the current session user remains visible.
 */
export const UserPanel = ({ currentUser, users }: { currentUser?: CurrentUser; users: AdminUserRecord[] }) => {
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

/**
 * Renders local mobile cache statistics, switches, and folder-level cleanup actions.
 */
export const CachePanel = ({
  actionLoading,
  cacheEnabled,
  stats,
  onClearAllCache,
  onClearUnusedCache,
  onClearUsefulCache,
  onClearFolderBranch,
  onRefreshCache,
  onToggleCache,
}: {
  actionLoading: string;
  cacheEnabled: boolean;
  stats: MobileCacheStats;
  onClearAllCache: () => Promise<void>;
  onClearUnusedCache: () => Promise<void>;
  onClearUsefulCache: () => Promise<void>;
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
  const cacheStatusLabel = cacheEnabled ? '本地缓存已开启' : '本地缓存已关闭';
  const latestCachedLabel = formatAdminDateTime(stats.latestCachedAt);

  const refreshCacheFolders = useCallback(async (): Promise<void> => {
    setLoadingFolders(true);

    try {
      setFolders(await listMobileCacheFolders());
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    void refreshCacheFolders();
  }, [refreshCacheFolders, stats.latestCachedAt, stats.totalSize, stats.usefulCount]);

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
   * Clears indexed cache records and refreshes folder-level rows.
   */
  const handleClearUsefulCache = async (): Promise<void> => {
    await onClearUsefulCache();
    await refreshCacheFolders();
  };

  /**
   * Clears orphaned cache payloads and refreshes folder-level rows.
   */
  const handleClearUnusedCache = async (): Promise<void> => {
    await onClearUnusedCache();
    await refreshCacheFolders();
  };

  /**
   * Clears every mobile cache scope and refreshes folder-level rows.
   */
  const handleClearEveryCache = async (): Promise<void> => {
    await onClearAllCache();
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
            <Text style={styles.cacheHeroSubtitle}>目录快照、缩略图、视频海报、原图和视频会按服务端与账号隔离保存。</Text>
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
          <CacheHeroStat label="总缓存" meta={`${stats.totalCount} 项资源`} value={formatFileSize(stats.totalSize)} />
          <CacheHeroStat label="可用缓存" meta="页面可直接命中" value={formatFileSize(stats.usefulSize)} />
          <CacheHeroStat label="残留缓存" meta={`${stats.unusedCount} 项残留`} value={formatFileSize(stats.unusedSize)} />
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
              label="清理可用"
              loading={actionLoading === 'clear-useful-cache'}
              onPress={() => Alert.alert('清理可用缓存', '确定清理当前仍可命中的目录快照、缩略图、原图和视频缓存吗？', [
                { style: 'cancel', text: '取消' },
                { onPress: () => void handleClearUsefulCache(), style: 'destructive', text: '清理' },
              ])}
            />
            <AdminActionButton
              danger
              icon="alert-circle-outline"
              label="清理残留"
              loading={actionLoading === 'clear-unused-cache'}
              onPress={() => Alert.alert('清理残留缓存', '确定清理索引外文件、旧版本目录缓存和失效记录吗？可用缓存会保留。', [
                { style: 'cancel', text: '取消' },
                { onPress: () => void handleClearUnusedCache(), style: 'destructive', text: '清理残留' },
              ])}
            />
            <AdminActionButton
              danger
              icon="warning-outline"
              label="清理全部"
              loading={actionLoading === 'clear-all-mobile-cache'}
              onPress={() => Alert.alert('清理全部缓存', '确定清理所有可用缓存和残留缓存，并删除本机缓存目录吗？', [
                { style: 'cancel', text: '取消' },
                { onPress: () => void handleClearEveryCache(), style: 'destructive', text: '全部清理' },
              ])}
            />
          </View>
        </View>
      </View>

      <CacheSectionHeader meta={`${cacheResourceCount} 项可用 · ${formatFileSize(stats.usefulSize)}`} title="可用缓存组成" />
      <View style={styles.cacheDetailGrid}>
        <CacheDetailStat icon="folder-outline" label="目录快照" meta="文件夹列表首屏" value={String(stats.directoryCount)} />
        <CacheDetailStat icon="image-outline" label="列表缩略图" meta="浏览列表缩略图" value={String(stats.thumbnailCount)} />
        <CacheDetailStat icon="film-outline" label="视频海报" meta="视频大屏封面" value={String(stats.videoPosterCount)} />
        <CacheDetailStat icon="sparkles-outline" label="高清缩略图" meta="预览优先展示" value={String(stats.hdThumbnailCount)} />
        <CacheDetailStat icon="albums-outline" label="文件夹封面" meta="图库入口封面" value={String(stats.coverCount)} />
        <CacheDetailStat icon="expand-outline" label="原图预览" meta="图片原图资源" value={String(stats.originalImageCount)} />
        <CacheDetailStat icon="videocam-outline" label="视频预览" meta="视频原始资源" value={String(stats.originalVideoCount)} />
        <CacheDetailStat icon="alert-circle-outline" label="残留缓存" meta="索引外/失效" value={String(stats.unusedCount)} />
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

/**
 * Renders system settings, license controls, server info, and recent logs.
 */
export const SystemPanel = ({
  actionLoading,
  backupPath,
  licenseItems,
  licenseInput,
  offlineId,
  onBindLicense,
  onChangeLicenseInput,
  onClearLogs,
  onCreateDatabaseBackup,
  onFetchOfflineId,
  onOpenScanSettings,
  onUpdateConfig,
  session,
  systemConfigInfo,
  systemConfigs,
  systemItems,
  systemLogs,
}: {
  actionLoading: string;
  backupPath: string;
  licenseItems: AdminInfoItem[];
  licenseInput: string;
  offlineId: string;
  onBindLicense: () => Promise<void>;
  onChangeLicenseInput: (value: string) => void;
  onClearLogs: () => Promise<void>;
  onCreateDatabaseBackup: () => Promise<void>;
  onFetchOfflineId: () => Promise<void>;
  onOpenScanSettings: () => void;
  onUpdateConfig: (key: string, value: string, messageText: string) => Promise<void>;
  session: MobileSession;
  systemConfigInfo?: AdminSystemConfigInfo;
  systemConfigs: AdminSystemConfigRecord[];
  systemItems: AdminInfoItem[];
  systemLogs: AdminLogRecord[];
}) => {
  const configMap = useMemo(() => new Map(systemConfigs.map((config) => [config.key, config.value])), [systemConfigs]);
  const currentLanguage = normalizeSystemLanguage(configMap.get(ADMIN_SYSTEM_CONFIG_KEYS.systemLanguage));

  return (
    <View style={styles.cardGroup}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>图库扫描与设置</Text>
            <Text style={styles.cardMeta}>排除规则、RAW/JPG 合并、XMP 和视频预览。</Text>
          </View>
          <SmallAction icon="settings-outline" label="设置" onPress={onOpenScanSettings} />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>显示语言</Text>
        <View style={styles.languageRow}>
          {SYSTEM_LANGUAGE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => void onUpdateConfig(ADMIN_SYSTEM_CONFIG_KEYS.systemLanguage, option.value, '显示语言已保存')}
              style={[
                styles.languageChip,
                currentLanguage === option.value ? styles.languageChipActive : null,
              ]}
            >
              <Text style={[styles.languageChipText, currentLanguage === option.value ? styles.languageChipTextActive : null]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.systemConfigGrid}>
        {MOBILE_SYSTEM_CONFIGS.map((config) => {
          const value = configMap.get(config.key) ?? '';
          const enabled = readSystemConfigEnabled(value);

          return (
            <View key={config.key} style={styles.systemConfigTile}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name={config.icon} size={17} />
              <View style={styles.cardTitleWrap}>
                <Text numberOfLines={1} style={styles.systemConfigTileTitle}>{config.label}</Text>
                <Text numberOfLines={2} style={styles.cardMeta}>{config.description}</Text>
                <Text numberOfLines={1} style={styles.systemConfigTileValue}>{summarizeSystemConfigValue(value)}</Text>
              </View>
              {config.switchable ? (
                <SmallAction
                  icon={enabled ? 'toggle-outline' : 'toggle-outline'}
                  label={enabled ? '关闭' : '开启'}
                  onPress={() => void onUpdateConfig(
                    config.key,
                    createToggledSystemConfigValue(value, !enabled),
                    `${config.label}已${enabled ? '关闭' : '开启'}`,
                  )}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>数据库备份</Text>
        <Text style={styles.cardMeta}>生成服务端数据库备份文件。</Text>
        <AdminActionButton
          icon="server-outline"
          label="生成数据库备份"
          loading={actionLoading === 'db-backup'}
          onPress={() => void onCreateDatabaseBackup()}
          primary
        />
        {backupPath ? <Text selectable style={styles.cardMeta}>备份文件：{backupPath}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>授权信息</Text>
        <TextInput
          onChangeText={onChangeLicenseInput}
          placeholder="输入在线激活码"
          placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
          style={styles.input}
          value={licenseInput}
        />
        <View style={styles.queueActions}>
          <AdminActionButton
            icon="key-outline"
            label="绑定授权"
            loading={actionLoading === 'license-bind'}
            onPress={() => void onBindLicense()}
            primary
          />
          <AdminActionButton
            icon="finger-print-outline"
            label="离线 ID"
            loading={actionLoading === 'offline-id'}
            onPress={() => void onFetchOfflineId()}
          />
        </View>
        {offlineId ? <Text selectable style={styles.cardMeta}>离线 ID：{offlineId}</Text> : null}
      </View>

      <View style={styles.infoGrid}>
        <InfoItem label="服务地址" value={session.serverUrl} />
        <InfoItem label="API 版本" value={`${session.apiInfo.version || 'unknown'}${session.apiInfo.build ? ` #${session.apiInfo.build}` : ''}`} />
        <InfoItem label="运行环境" value="Expo Mobile" />
        <InfoItem label="当前用户" value={session.user.username} />
        <InfoItem label="平台" value={session.apiInfo.platform ?? '-'} />
        <InfoItem label="数据库" value={session.apiInfo.dbStatus ?? '-'} />
        <InfoItem label="CPU线程" value={systemConfigInfo?.cpuThreadNum ?? '-'} />
        <InfoItem label="任务线程" value={systemConfigInfo?.taskMaxThreadNum ?? '-'} />
      </View>
      <InfoSection items={systemItems} title="服务端状态" />
      <InfoSection items={licenseItems} title="授权信息" />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle}>系统日志</Text>
            <Text style={styles.cardMeta}>{systemLogs.length} 条</Text>
          </View>
          <SmallAction danger icon="trash-outline" label="清空" loading={actionLoading === 'logs-clear'} onPress={() => void onClearLogs()} />
        </View>
        {systemLogs.length > 0 ? systemLogs.slice(0, 8).map((log, index) => (
          <View key={`${log.timestamp ?? index}-${log.message}`} style={styles.systemLogRow}>
            <Text style={styles.systemLogLevel}>{log.level}</Text>
            <Text numberOfLines={2} style={styles.systemLogMessage}>{log.message}</Text>
          </View>
        )) : <EmptyLine text="当前没有系统日志" />}
      </View>
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
