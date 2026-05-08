import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileClock,
  FolderCog,
  GalleryHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  ScanLine,
  Settings2,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  clearAdminFileDeleteLogs,
  createAdminGallery,
  deleteAdminGallery,
  exportAdminDeletedFiles,
  fetchAdminGalleries,
  fetchAdminFileDeleteLogs,
  fetchAdminGalleryDetail,
  fetchAdminGalleryUserLinks,
  fetchAdminTasks,
  fetchAdminUsers,
  findAdminDuplicateFiles,
  isAdminGalleryTask,
  scanAdminAllGalleries,
  scanAdminGallery,
  updateAdminGallery,
  updateAdminGalleryWeight,
} from '../../services/admin-service';
import type {
  AdminDuplicateFileRecord,
  AdminFileDeleteLogPage,
  AdminGallery,
  AdminGalleryMutationPayload,
  AdminGalleryStat,
  AdminGalleryUserLink,
  AdminTask,
  AdminUserRecord,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import type { CurrentUser } from '../../shared/types';
import { AdminDeletedFilesDialog } from './AdminDeletedFilesDialog';
import { AdminGalleryConfirmDialog } from './AdminGalleryConfirmDialog';
import { AdminGalleryDeletedLogDialog } from './AdminGalleryDeletedLogDialog';
import { AdminGalleryEditorDialog } from './AdminGalleryEditorDialog';
import { AdminGalleryScanSettingsDialog } from './AdminGalleryScanSettingsDialog';
import { AdminGalleryStatsDialog } from './AdminGalleryStatsDialog';
import { AdminGalleryWeightDialog } from './AdminGalleryWeightDialog';

const ACTIVE_TASK_EMPTY_LIMIT = 5;
const ACTIVE_TASK_REFETCH_INTERVAL = 2000;

interface AdminGalleryPanelProps {
  apiOptions: ApiClientOptions;
  currentUser?: CurrentUser;
  onShowToast: (message: string) => void;
}

/**
 * Provides the gallery management workspace, including list, scan and mutation actions.
 */
export const AdminGalleryPanel = ({ apiOptions, currentUser, onShowToast }: AdminGalleryPanelProps) => {
  const activeTaskPollingInFlightRef = useRef(false);
  const emptyTaskPollCountRef = useRef(0);
  const [actionLoading, setActionLoading] = useState('');
  const [deletedFilesOpen, setDeletedFilesOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminGallery>();
  const [deletedLogOpen, setDeletedLogOpen] = useState(false);
  const [deletedLogPage, setDeletedLogPage] = useState<AdminFileDeleteLogPage>();
  const [duplicateFiles, setDuplicateFiles] = useState<AdminDuplicateFileRecord[]>();
  const [editorGallery, setEditorGallery] = useState<AdminGallery>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [error, setError] = useState('');
  const [galleries, setGalleries] = useState<AdminGallery[]>([]);
  const [loading, setLoading] = useState(false);
  const [menuGalleryKey, setMenuGalleryKey] = useState('');
  const [scanningId, setScanningId] = useState<number | string>();
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [statSummary, setStatSummary] = useState<AdminGalleryStat>();
  const [statsOpen, setStatsOpen] = useState(false);
  const [taskPolling, setTaskPolling] = useState(true);
  const [submittingEditor, setSubmittingEditor] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [userLinks, setUserLinks] = useState<AdminGalleryUserLink[]>([]);
  const [weightTarget, setWeightTarget] = useState<AdminGallery>();
  const [weightValue, setWeightValue] = useState('');
  const galleryIds = useMemo(
    () => galleries.map((gallery) => Number(gallery.id)).filter((id) => Number.isFinite(id) && id > 0),
    [galleries],
  );
  const {
    data: activeTasks = [],
    dataUpdatedAt: activeTasksUpdatedAt,
    errorUpdatedAt: activeTasksErrorAt,
    isError: activeTasksError,
    refetch: refetchActiveTasks,
  } = useQuery({
    enabled: false,
    queryFn: () => fetchAdminTasks(apiOptions, 'active'),
    queryKey: ['admin-gallery-active-tasks', apiOptions.baseUrl, currentUser?.id],
    retry: false,
  });

  const loadGalleries = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    const [galleryResult, usersResult, userLinksResult] = await Promise.allSettled([
      fetchAdminGalleries(apiOptions),
      fetchAdminUsers(apiOptions),
      fetchAdminGalleryUserLinks(apiOptions),
    ]);

    if (galleryResult.status === 'fulfilled') {
      setGalleries(galleryResult.value);
    } else {
      setGalleries([]);
      setError(getApiErrorMessage(galleryResult.reason));
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value);
    }

    if (userLinksResult.status === 'fulfilled') {
      setUserLinks(userLinksResult.value);
    }

    setLoading(false);
  }, [apiOptions]);

  useEffect(() => {
    void loadGalleries();
  }, [loadGalleries]);

  const startTaskPolling = useCallback((): void => {
    emptyTaskPollCountRef.current = 0;
    setTaskPolling(true);
  }, []);

  useEffect(() => {
    if (!taskPolling) {
      return undefined;
    }

    let cancelled = false;
    let timer: number | undefined;

    /**
     * Uses a completion-driven polling loop so slow requests cannot overlap with the next tick.
     */
    const pollActiveTasks = async (): Promise<void> => {
      if (activeTaskPollingInFlightRef.current) {
        if (!cancelled) {
          timer = window.setTimeout(() => void pollActiveTasks(), ACTIVE_TASK_REFETCH_INTERVAL);
        }
        return;
      }

      activeTaskPollingInFlightRef.current = true;

      try {
        await refetchActiveTasks();
      } finally {
        activeTaskPollingInFlightRef.current = false;

        if (!cancelled) {
          timer = window.setTimeout(() => void pollActiveTasks(), ACTIVE_TASK_REFETCH_INTERVAL);
        }
      }
    };

    void pollActiveTasks();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [refetchActiveTasks, taskPolling]);

  useEffect(() => {
    const pollVersion = Math.max(activeTasksUpdatedAt, activeTasksErrorAt);

    if (!taskPolling || pollVersion === 0) {
      return;
    }

    if (activeTasksError || activeTasks.length === 0) {
      emptyTaskPollCountRef.current += 1;

      if (emptyTaskPollCountRef.current > ACTIVE_TASK_EMPTY_LIMIT) {
        setTaskPolling(false);
      }
      return;
    }

    emptyTaskPollCountRef.current = 0;
  }, [activeTasks.length, activeTasksError, activeTasksErrorAt, activeTasksUpdatedAt, taskPolling]);

  /**
   * Opens edit mode with the freshest gallery detail when the detail endpoint is available.
   */
  const openEditor = async (gallery?: AdminGallery): Promise<void> => {
    setMenuGalleryKey('');

    if (!gallery?.id) {
      setEditorGallery(undefined);
      setEditorOpen(true);
      return;
    }

    setActionLoading(`detail-${gallery.id}`);

    try {
      setEditorGallery(await fetchAdminGalleryDetail(apiOptions, gallery.id));
    } catch {
      setEditorGallery(gallery);
    } finally {
      setActionLoading('');
      setEditorOpen(true);
    }
  };

  /**
   * Creates or updates a gallery, then refreshes the grid to keep local state in sync.
   */
  const handleSubmitGallery = async (
    payload: AdminGalleryMutationPayload,
    gallery?: AdminGallery,
  ): Promise<void> => {
    setSubmittingEditor(true);

    try {
      if (gallery?.id) {
        await updateAdminGallery(apiOptions, gallery.id, payload);
        onShowToast(`${payload.name} 已更新`);
      } else {
        await createAdminGallery(apiOptions, payload);
        onShowToast(`${payload.name} 已创建`);
      }

      setEditorOpen(false);
      await loadGalleries();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setSubmittingEditor(false);
    }
  };

  /**
   * Starts a gallery scan and refreshes the grid after the backend accepts it.
   */
  const handleScanGallery = async (gallery: AdminGallery, scanType?: 'check'): Promise<void> => {
    if (gallery.id === undefined) {
      onShowToast('当前图库没有可用 ID，无法触发扫描');
      return;
    }

    setMenuGalleryKey('');
    setScanningId(gallery.id);

    try {
      await scanAdminGallery(apiOptions, gallery.id, scanType);
      onShowToast(`${gallery.name} 已触发${scanType ? '检查模式' : ''}扫描`);
      startTaskPolling();
      await loadGalleries();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setScanningId(undefined);
    }
  };

  /**
   * Runs a lightweight admin action and surfaces the result through the page panels.
   */
  const runPanelAction = async (actionKey: string, action: () => Promise<void>): Promise<void> => {
    setActionLoading(actionKey);

    try {
      await action();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
    }
  };

  const handleScanAll = async (): Promise<void> => {
    await runPanelAction('scan-all', async () => {
      await scanAdminAllGalleries(apiOptions);
      startTaskPolling();
      onShowToast('已触发所有图库扫描');
      await loadGalleries();
    });
  };

  const handleFindDuplicateFiles = async (): Promise<void> => {
    if (galleryIds.length === 0) {
      onShowToast('当前没有可检查的图库');
      return;
    }

    await runPanelAction('duplicate', async () => {
      const files = await findAdminDuplicateFiles(apiOptions, galleryIds);

      setDuplicateFiles(files);
      onShowToast(files.length > 0 ? `发现 ${files.length} 个重复文件` : '没有发现重复文件');
    });
  };

  /**
   * Opens the delete-log dialog with one paged server read.
   */
  const handleOpenDeletedLogs = async (pageNo = 1): Promise<void> => {
    setDeletedLogOpen(true);
    await runPanelAction('deleted-logs', async () => {
      setDeletedLogPage(await fetchAdminFileDeleteLogs(apiOptions, pageNo));
    });
  };

  /**
   * Opens abnormal files in a center dialog without leaving gallery management.
   */
  const handleOpenDeletedFiles = (): void => {
    setDeletedFilesOpen(true);
  };

  const handleExportDeletedFiles = async (): Promise<void> => {
    await runPanelAction('deleted', async () => {
      await exportAdminDeletedFiles(apiOptions);
      onShowToast('文件删除记录导出任务已提交');
    });
  };

  const handleClearDeletedLogs = async (): Promise<void> => {
    await runPanelAction('clear-deleted-logs', async () => {
      await clearAdminFileDeleteLogs(apiOptions);
      setDeletedLogPage(await fetchAdminFileDeleteLogs(apiOptions, 1));
      onShowToast('文件删除记录已清空');
    });
  };

  const handleUpdateWeight = async (): Promise<void> => {
    if (!weightTarget?.id) {
      return;
    }

    const nextWeight = Number(weightValue);

    if (!Number.isFinite(nextWeight)) {
      onShowToast('排序权重必须是数字');
      return;
    }

    await runPanelAction('weight', async () => {
      await updateAdminGalleryWeight(apiOptions, weightTarget.id as number | string, nextWeight);
      onShowToast(`${weightTarget.name} 排序权重已更新`);
      setWeightTarget(undefined);
      await loadGalleries();
    });
  };

  const handleDeleteGallery = async (): Promise<void> => {
    if (!deleteTarget?.id) {
      return;
    }

    await runPanelAction('delete', async () => {
      await deleteAdminGallery(apiOptions, deleteTarget.id as number | string);
      onShowToast(`${deleteTarget.name} 已删除`);
      setDeleteTarget(undefined);
      await loadGalleries();
    });
  };

  return (
    <div className="admin-panel admin-gallery-panel">
      <div className="section-heading admin-gallery-heading">
        <div>
          <h3>图库管理</h3>
          <p>管理图库、文件夹归属、扫描任务、重复文件和异常记录。</p>
        </div>
        <button className="secondary-btn" disabled={loading} onClick={() => void loadGalleries()} type="button">
          <RefreshCw size={15} />
          刷新
        </button>
      </div>

      <div className="admin-gallery-toolbar">
        <button className="secondary-btn" disabled={actionLoading === 'duplicate'} onClick={() => void handleFindDuplicateFiles()} type="button">
          <CheckCircle2 size={15} />
          检查重复文件
        </button>
        <button className="secondary-btn is-danger-soft" disabled={actionLoading === 'deleted-logs'} onClick={() => void handleOpenDeletedLogs()} type="button">
          <FileClock size={15} />
          文件删除记录
        </button>
        <button className="secondary-btn" onClick={() => setStatsOpen(true)} type="button">
          <BarChart3 size={15} />
          图库信息统计&自动扫描
        </button>
        <button className="secondary-btn is-danger-soft" onClick={handleOpenDeletedFiles} type="button">
          <AlertTriangle size={15} />
          状态异常文件
        </button>
        <button className="secondary-btn" onClick={() => setScanSettingsOpen(true)} type="button">
          <Settings2 size={15} />
          图库扫描与设置
        </button>
        <button className="primary-btn" disabled={actionLoading === 'scan-all'} onClick={() => void handleScanAll()} type="button">
          <ScanLine size={15} />
          扫描所有图库
        </button>
      </div>

      <div className="admin-gallery-tip">
        <GalleryHorizontal size={17} />
        <span>通过图库可以把不同文件夹的照片、视频合并展示，并授权给用户；管理员也需要授权后才能访问图库。</span>
      </div>

      {statSummary ? (
        <div className="admin-gallery-summary">
          <span>照片：{statSummary.photo}</span>
          <span>视频：{statSummary.video}</span>
          <span>总大小：{formatBytes(statSummary.totalSize)}</span>
        </div>
      ) : null}

      {duplicateFiles ? (
        <div className="admin-gallery-log-panel admin-gallery-result-panel">
          <strong>重复文件检查结果</strong>
          <div>
            {duplicateFiles.length === 0 ? <span>没有发现重复文件。</span> : null}
            {duplicateFiles.slice(0, 6).map((file) => (
              <span key={`${file.id}-${file.md5}`} title={`${file.filePath} · ${formatBytes(file.size)}`}>
                {file.fileName} · {formatBytes(file.size)} · 图库 {file.galleryIds.join(',') || '-'}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-gallery-grid">
        {loading ? <div className="admin-state admin-gallery-grid__state">正在读取图库...</div> : null}
        {!loading && galleries.length === 0 ? <div className="admin-state admin-gallery-grid__state">暂无图库数据。</div> : null}

        {galleries.map((gallery, index) => {
          const galleryKey = String(gallery.id ?? gallery.path);
          const galleryTask = findGalleryTask(activeTasks, gallery);
          const menuOpen = menuGalleryKey === galleryKey;

          return (
            <article className="admin-gallery-card" key={galleryKey}>
              <div className="admin-gallery-card__cover">
                <div className="admin-gallery-card__picture" />
                {galleryTask ? (
                  <div className="admin-gallery-card__task" title={formatTaskTitle(galleryTask)}>
                    <span aria-hidden="true" className="admin-gallery-card__task-spinner" />
                    <span>{galleryTask.name}</span>
                    {galleryTask.progressLabel !== '无进度' ? <em>{galleryTask.progressLabel}</em> : null}
                  </div>
                ) : null}
              </div>
              <div className="admin-gallery-card__body">
                <div>
                  <strong title={gallery.name}>{gallery.name}</strong>
                  <span title={gallery.path}>{gallery.path}</span>
                </div>
                <div className="admin-gallery-card__meta">
                  <span>{galleryTask ? '扫描中' : gallery.hidden ? '隐藏' : '可见'}</span>
                  <span>排序:{gallery.weights ?? '-'}</span>
                </div>
              </div>
              <button
                aria-label={`${gallery.name} 更多操作`}
                className="admin-gallery-card__more"
                onClick={() => setMenuGalleryKey(menuOpen ? '' : galleryKey)}
                type="button"
              >
                <MoreVertical size={18} />
              </button>
              {menuOpen ? (
                <div className="admin-gallery-menu">
                  <button onClick={() => void openEditor(gallery)} type="button">
                    <FolderCog size={16} />
                    管理图库
                  </button>
                  <button disabled={scanningId === gallery.id} onClick={() => void handleScanGallery(gallery)} type="button">
                    <RefreshCw size={16} />
                    扫描图库
                  </button>
                  <button disabled={scanningId === gallery.id} onClick={() => void handleScanGallery(gallery, 'check')} type="button">
                    <ScanLine size={16} />
                    扫描图库-检查模式
                  </button>
                  <button
                    onClick={() => {
                      setMenuGalleryKey('');
                      setWeightTarget(gallery);
                      setWeightValue(gallery.weights === undefined ? '' : String(gallery.weights));
                    }}
                    type="button"
                  >
                    <SlidersHorizontal size={16} />
                    修改排序权重
                  </button>
                  <button
                    className="is-danger"
                    onClick={() => {
                      setMenuGalleryKey('');
                      setDeleteTarget(gallery);
                    }}
                    type="button"
                  >
                    <Trash2 size={16} />
                    删除图库
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}

        {!loading ? (
          <button className="admin-gallery-add-card" onClick={() => void openEditor()} type="button">
            <span>
              <Plus size={24} />
            </span>
            <strong>添加图库</strong>
          </button>
        ) : null}
      </div>

      <AdminGalleryEditorDialog
        apiOptions={apiOptions}
        currentUser={currentUser}
        gallery={editorGallery}
        open={editorOpen}
        submitting={submittingEditor}
        userLinks={userLinks}
        users={users}
        onClose={() => setEditorOpen(false)}
        onSubmit={handleSubmitGallery}
      />

      <AdminGalleryScanSettingsDialog
        apiOptions={apiOptions}
        open={scanSettingsOpen}
        onClose={() => setScanSettingsOpen(false)}
        onSaved={onShowToast}
      />

      <AdminGalleryStatsDialog
        apiOptions={apiOptions}
        galleries={galleries}
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        onShowToast={onShowToast}
        onStatsLoaded={setStatSummary}
      />

      <AdminGalleryDeletedLogDialog
        actionLoading={actionLoading}
        onClose={() => setDeletedLogOpen(false)}
        onClearDeletedLogs={() => void handleClearDeletedLogs()}
        onExportDeletedFiles={() => void handleExportDeletedFiles()}
        onLoadPage={(pageNo) => void handleOpenDeletedLogs(pageNo)}
        open={deletedLogOpen}
        page={deletedLogPage}
      />

      {deletedFilesOpen ? (
        <AdminDeletedFilesDialog
          apiOptions={apiOptions}
          onClose={() => setDeletedFilesOpen(false)}
          onShowToast={onShowToast}
          open={deletedFilesOpen}
        />
      ) : null}

      <AdminGalleryWeightDialog
        galleryName={weightTarget?.name}
        loading={actionLoading === 'weight'}
        onChangeValue={setWeightValue}
        onClose={() => setWeightTarget(undefined)}
        onSubmit={() => void handleUpdateWeight()}
        open={Boolean(weightTarget)}
        value={weightValue}
      />

      <AdminGalleryConfirmDialog
        confirmLabel="删除"
        danger
        loading={actionLoading === 'delete'}
        message={`确定删除 ${deleteTarget?.name ?? ''} 吗？不会直接删除磁盘文件，但会移除图库配置。`}
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={() => void handleDeleteGallery()}
        open={Boolean(deleteTarget)}
        title="删除图库"
      />
    </div>
  );
};

const findGalleryTask = (tasks: AdminTask[], gallery: AdminGallery): AdminTask | undefined => {
  return tasks.find((task) => {
    if (!isAdminGalleryTask(task)) {
      return false;
    }

    if (task.galleryId === undefined || String(task.galleryId) === 'all') {
      return true;
    }

    return gallery.id !== undefined && String(task.galleryId) === String(gallery.id);
  });
};

const formatTaskTitle = (task: AdminTask): string => {
  return [task.name, task.progressLabel, task.stage?.label, task.detail].filter(Boolean).join(' · ');
};

const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);

  return `${(size / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};
