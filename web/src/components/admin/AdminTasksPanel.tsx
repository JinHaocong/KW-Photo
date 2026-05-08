import { ChevronDown, Cpu, Pause, Play, RefreshCw, Rocket, RotateCcw, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ADMIN_MAINTENANCE_TASKS,
  ADMIN_TASK_TYPE_LABELS,
  createAdminMaintenanceTask,
  fetchAdminActiveTaskOverview,
  fetchAdminSystemConfigInfo,
  fetchAdminTaskCounts,
  fetchAdminTaskQueuePaused,
  fetchAdminTasks,
  pauseAdminTasks,
  resumeAdminTasks,
  updateAdminTaskMaxThread,
} from '../../services/admin-service';
import type {
  AdminActiveTaskOverview,
  AdminMaintenanceTaskDefinition,
  AdminSystemConfigInfo,
  AdminTask,
  AdminTaskCounts,
  AdminTaskStatus,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import type { UploadTask } from '../../shared/types';
import { formatAdminDateTime, getUploadTaskStats } from './admin-utils';

interface AdminTasksPanelProps {
  apiOptions: ApiClientOptions;
  onShowToast: (message: string) => void;
  uploadTasks: UploadTask[];
}

const TASK_TABS: AdminTaskStatus[] = ['active', 'waiting', 'failed', 'paused', 'completed'];

const TASK_STATUS_LABELS: Record<AdminTaskStatus, string> = {
  active: '执行中',
  completed: '已完成',
  failed: '失败',
  paused: '暂停',
  waiting: '等待中',
};

const DEFAULT_ACTIVE_TASK_OVERVIEW: AdminActiveTaskOverview = {
  tasks: [],
};

const ACTIVE_TASK_REFETCH_INTERVAL = 2000;

/**
 * Displays backend task progress, scheduler controls, maintenance tools and local upload tasks.
 */
export const AdminTasksPanel = ({ apiOptions, onShowToast, uploadTasks }: AdminTasksPanelProps) => {
  const overviewPollingInFlightRef = useRef(false);
  const [activeOverview, setActiveOverview] = useState<AdminActiveTaskOverview>(DEFAULT_ACTIVE_TASK_OVERVIEW);
  const [activeStatus, setActiveStatus] = useState<AdminTaskStatus>('active');
  const [configInfo, setConfigInfo] = useState<AdminSystemConfigInfo>();
  const [counts, setCounts] = useState<AdminTaskCounts>(() => createEmptyTaskCounts());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);
  const [maintenanceMenuOpen, setMaintenanceMenuOpen] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState('');
  const [queuePaused, setQueuePaused] = useState<boolean>();
  const [queueSubmitting, setQueueSubmitting] = useState(false);
  const [serverTasks, setServerTasks] = useState<AdminTask[]>([]);
  const [threadSubmitting, setThreadSubmitting] = useState(false);
  const [threadValue, setThreadValue] = useState(1);
  const uploadStats = useMemo(() => getUploadTaskStats(uploadTasks), [uploadTasks]);
  const selectedMaintenanceTask = useMemo(
    () => ADMIN_MAINTENANCE_TASKS.find((task) => task.value === maintenanceType),
    [maintenanceType],
  );
  const selectedMaintenanceTaskView = useMemo(
    () => (selectedMaintenanceTask ? parseMaintenanceTaskLabel(selectedMaintenanceTask) : undefined),
    [selectedMaintenanceTask],
  );
  const maintenanceTaskGroups = useMemo(() => groupMaintenanceTasks(ADMIN_MAINTENANCE_TASKS), []);
  const maxThreadValue = Math.max(1, configInfo?.cpuThreadNum ?? threadValue);

  /**
   * Loads the lightweight active-task payload once and skips duplicate calls while a request is pending.
   */
  const loadTaskOverview = useCallback(async (): Promise<void> => {
    if (overviewPollingInFlightRef.current) {
      return;
    }

    overviewPollingInFlightRef.current = true;

    try {
      const [overviewResult, pausedResult] = await Promise.allSettled([
        fetchAdminActiveTaskOverview(apiOptions),
        fetchAdminTaskQueuePaused(apiOptions),
      ]);

      if (overviewResult.status === 'fulfilled') {
        setActiveOverview(overviewResult.value);
      }

      if (pausedResult.status === 'fulfilled') {
        setQueuePaused(pausedResult.value);
      }
    } finally {
      overviewPollingInFlightRef.current = false;
    }
  }, [apiOptions]);

  const loadTasks = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const [countsResult, tasksResult, configResult] = await Promise.allSettled([
        fetchAdminTaskCounts(apiOptions),
        fetchAdminTasks(apiOptions, activeStatus),
        fetchAdminSystemConfigInfo(apiOptions),
      ]);

      if (countsResult.status === 'fulfilled') {
        setCounts(countsResult.value);
      } else {
        setCounts(createEmptyTaskCounts());
      }

      if (tasksResult.status === 'fulfilled') {
        setServerTasks(tasksResult.value);
      } else {
        setServerTasks([]);
      }

      if (configResult.status === 'fulfilled') {
        setConfigInfo(configResult.value);
        setThreadValue(clampThreadValue(configResult.value.taskMaxThreadNum, configResult.value.cpuThreadNum));
      }

      await loadTaskOverview();

      const blockingError = [countsResult, tasksResult].find((result) => result.status === 'rejected');

      if (blockingError?.status === 'rejected') {
        setError(getApiErrorMessage(blockingError.reason));
      }
    } finally {
      setLoading(false);
    }
  }, [activeStatus, apiOptions, loadTaskOverview]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    /**
     * Schedules the next poll only after the previous request has settled.
     */
    const pollAfterPreviousSettles = async (): Promise<void> => {
      await loadTaskOverview();

      if (!cancelled) {
        timer = window.setTimeout(() => void pollAfterPreviousSettles(), ACTIVE_TASK_REFETCH_INTERVAL);
      }
    };

    void pollAfterPreviousSettles();

    return () => {
      cancelled = true;

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    };
  }, [loadTaskOverview]);

  /**
   * Pauses or resumes the backend task queue.
   */
  const handleQueueAction = async (action: 'pause' | 'resume'): Promise<void> => {
    setQueueSubmitting(true);

    try {
      if (action === 'pause') {
        await pauseAdminTasks(apiOptions);
      } else {
        await resumeAdminTasks(apiOptions);
      }

      onShowToast(action === 'pause' ? '后台任务队列已暂停' : '后台任务队列已恢复');
      await loadTasks();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setQueueSubmitting(false);
    }
  };

  /**
   * Saves the maximum backend worker thread count.
   */
  const handleSaveThreadValue = async (): Promise<void> => {
    const nextValue = clampThreadValue(threadValue, maxThreadValue);

    setThreadValue(nextValue);
    setThreadSubmitting(true);

    try {
      await updateAdminTaskMaxThread(apiOptions, nextValue);
      onShowToast('后台任务调度已保存');
      await loadTasks();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setThreadSubmitting(false);
    }
  };

  /**
   * Submits clearAllJobs as a service restart action for stuck backend task queues.
   */
  const handleRestartTaskService = async (): Promise<void> => {
    if (!window.confirm('该操作会清空后台任务队列，用于重置任务服务状态，不会真正重启应用进程，是否继续？')) {
      return;
    }

    setMaintenanceSubmitting(true);

    try {
      await createAdminMaintenanceTask(apiOptions, 'clearAllJobs');
      onShowToast('重启服务已提交');
      await loadTasks();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  /**
   * Creates one backend maintenance task from the demo system maintenance tool list.
   */
  const handleRunMaintenanceTask = async (): Promise<void> => {
    if (!selectedMaintenanceTask) {
      onShowToast('请选择要执行的系统维护任务');
      return;
    }

    if (selectedMaintenanceTask.value === 'clearAllJobs') {
      await handleRestartTaskService();
      return;
    }

    if (selectedMaintenanceTask.destructive && !window.confirm(`确定执行“${selectedMaintenanceTask.label}”吗？`)) {
      return;
    }

    setMaintenanceSubmitting(true);

    try {
      await createAdminMaintenanceTask(apiOptions, selectedMaintenanceTask.value);
      onShowToast('系统维护任务已提交');
      setMaintenanceType('');
      await loadTasks();
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  return (
    <div className="admin-panel admin-task-panel">
      <div className="section-heading">
        <div>
          <h3>后台任务信息</h3>
          <p>查看当前后台正在执行的任务</p>
        </div>
        <div className="admin-inline-actions">
          <button
            className="secondary-btn"
            disabled={queueSubmitting || queuePaused === true}
            onClick={() => void handleQueueAction('pause')}
            type="button"
          >
            <Pause size={15} />
            暂停队列
          </button>
          <button
            className="secondary-btn"
            disabled={queueSubmitting || queuePaused === false}
            onClick={() => void handleQueueAction('resume')}
            type="button"
          >
            <Play size={15} />
            恢复队列
          </button>
          <button className="secondary-btn" disabled={loading} onClick={() => void loadTasks()} type="button">
            <RefreshCw size={15} />
            刷新
          </button>
          <button
            className="secondary-btn is-danger-soft"
            disabled={maintenanceSubmitting}
            onClick={() => void handleRestartTaskService()}
            type="button"
          >
            <RotateCcw size={15} />
            重启服务
          </button>
        </div>
      </div>

      <div className="cache-stats">
        {TASK_TABS.map((status) => (
          <article key={status}>
            <span>{TASK_STATUS_LABELS[status]}</span>
            <strong>{counts[status]}</strong>
          </article>
        ))}
        <article>
          <span>本机上传中</span>
          <strong>{uploadStats.active}</strong>
        </article>
      </div>

      <section className="admin-section admin-active-task-section">
        <div className="admin-active-task-heading">
          <strong>当前正在执行的任务：</strong>
        </div>
        <div className="admin-active-task-list">
          {activeOverview.tasks.length === 0 ? <div className="admin-state compact">当前没有正在执行的后台任务。</div> : null}
          {activeOverview.tasks.map((task) => (
            <ActiveTaskCard key={task.id} task={task} />
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>后台任务调度</strong>
          <span>当前配置：{configInfo?.taskMaxThreadNum ?? threadValue} / {maxThreadValue}</span>
        </div>
        <div className="admin-task-scheduler">
          <div className="admin-task-scheduler__icon">
            <Cpu size={18} />
          </div>
          <div className="admin-task-scheduler__main">
            <span>限制后台任务最多使用的 CPU 线程数</span>
            <input
              max={maxThreadValue}
              min={1}
              onChange={(event) => setThreadValue(clampThreadValue(Number(event.target.value), maxThreadValue))}
              type="range"
              value={clampThreadValue(threadValue, maxThreadValue)}
            />
          </div>
          <div className="admin-task-scheduler__value">{clampThreadValue(threadValue, maxThreadValue)}</div>
          <button
            className="primary-btn"
            disabled={threadSubmitting}
            onClick={() => void handleSaveThreadValue()}
            type="button"
          >
            保存
          </button>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>系统维护工具</strong>
          <span>维护任务会提交到后台队列执行</span>
        </div>
        <div className="admin-maintenance-tool">
          <Wrench size={17} />
          <div className="admin-maintenance-dropdown">
            <button
              aria-expanded={maintenanceMenuOpen}
              className="admin-maintenance-dropdown__trigger"
              onClick={() => setMaintenanceMenuOpen((current) => !current)}
              type="button"
            >
              <span>
                <strong>{selectedMaintenanceTaskView?.title ?? '不执行任务'}</strong>
                <em>{selectedMaintenanceTask?.value ?? '请选择系统维护任务'}</em>
              </span>
              <ChevronDown size={16} />
            </button>
            {maintenanceMenuOpen ? (
              <div className="admin-maintenance-dropdown__menu">
                <button
                  className={!selectedMaintenanceTask ? 'is-active' : ''}
                  onClick={() => {
                    setMaintenanceType('');
                    setMaintenanceMenuOpen(false);
                  }}
                  type="button"
                >
                  <span>
                    <strong>不执行任务</strong>
                    <em>none</em>
                  </span>
                </button>
                {maintenanceTaskGroups.map((group) => (
                  <div className="admin-maintenance-dropdown__group" key={group.name}>
                    <div>{group.name}</div>
                    {group.tasks.map((task) => (
                      <button
                        className={maintenanceType === task.value ? 'is-active' : ''}
                        key={task.value}
                        onClick={() => {
                          setMaintenanceType(task.value);
                          setMaintenanceMenuOpen(false);
                        }}
                        type="button"
                      >
                        <span>
                          <strong>{task.title}</strong>
                          {task.description ? <small>{task.description}</small> : null}
                          <em>{task.value}</em>
                        </span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <button
            className="primary-btn"
            disabled={maintenanceSubmitting || !selectedMaintenanceTask}
            onClick={() => void handleRunMaintenanceTask()}
            type="button"
          >
            <Rocket size={15} />
            执行任务
          </button>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>本机上传队列</strong>
          <span>{uploadStats.total} 个任务，{uploadStats.failed} 个失败</span>
        </div>
        <div className="admin-mini-list">
          {uploadTasks.length === 0 ? <span>暂无本机上传任务。</span> : null}
          {uploadTasks.slice(0, 6).map((task) => (
            <div className="admin-mini-list__item" key={task.id}>
              <strong title={task.name}>{task.name}</strong>
              <span>{task.status} · {task.progress}%{task.targetPath ? ` · ${task.targetPath}` : ''}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="admin-tabs" role="tablist">
        {TASK_TABS.map((status) => (
          <button
            aria-selected={activeStatus === status}
            className={activeStatus === status ? 'is-active' : ''}
            key={status}
            onClick={() => setActiveStatus(status)}
            role="tab"
            type="button"
          >
            {TASK_STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-table">
        {loading ? <div className="admin-state">正在读取后台任务...</div> : null}
        {!loading && serverTasks.length === 0 ? <div className="admin-state">当前状态下没有后台任务。</div> : null}

        {serverTasks.map((task) => (
          <article className="admin-table-row" key={task.id}>
            <div className="admin-table-row__main">
              <strong title={task.name}>{task.name}</strong>
              <span>ID：{task.id}</span>
            </div>
            <div className="admin-table-row__meta">
              <span>{task.statusLabel}</span>
              {task.taskType ? <span>{task.taskType}</span> : null}
              <span>{formatTaskProgressText(task)}</span>
              <span>{formatAdminDateTime(task.updatedAt)}</span>
              {task.detail ? <span title={task.detail}>{task.detail}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const ActiveTaskCard = ({ task }: { task: AdminTask }) => {
  const progressPercent = getTaskProgressPercent(task);

  return (
    <article className="admin-active-task-card">
      <div className="admin-active-task-card__main">
        <div className="admin-active-task-card__title">
          <strong>{task.name}</strong>
        </div>
        {task.stage?.folder ? (
          <span>
            <b>当前目录</b>
            &nbsp; {task.stage.folder}
          </span>
        ) : null}
        {task.stage?.label && !task.stage.folder ? <span>{task.stage.label}</span> : null}
      </div>
      <div className="admin-active-task-card__progress">
        <div className="admin-task-progress-track">
          <div className="admin-task-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="admin-task-progress-meta">
          <span>{formatTaskProgressText(task)}</span>
          <span>{formatTaskSubTaskText(task)}</span>
        </div>
      </div>
    </article>
  );
};

/**
 * Splits demo maintenance labels into group, title and extra description for the custom dropdown.
 */
const parseMaintenanceTaskLabel = (
  task: AdminMaintenanceTaskDefinition,
): AdminMaintenanceTaskDefinition & {
  description?: string;
  group: string;
  title: string;
} => {
  const matchedLabel = task.label.match(/^【(.+?)】- ?(.+)$/);
  const fallbackTitle = ADMIN_TASK_TYPE_LABELS[task.value] ?? task.label;

  if (!matchedLabel) {
    return {
      ...task,
      group: '其他',
      title: fallbackTitle,
    };
  }

  const [, group, copy] = matchedLabel;
  const [title, description] = copy.split(/[（(]/);

  return {
    ...task,
    description: description ? description.replace(/[）)]$/, '') : undefined,
    group,
    title: title.trim() || fallbackTitle,
  };
};

/**
 * Preserves demo task ordering while grouping the long maintenance list by business area.
 */
const groupMaintenanceTasks = (tasks: readonly AdminMaintenanceTaskDefinition[]) => {
  const groups = new Map<string, ReturnType<typeof parseMaintenanceTaskLabel>[]>();

  tasks.map(parseMaintenanceTaskLabel).forEach((task) => {
    const currentTasks = groups.get(task.group) ?? [];

    currentTasks.push(task);
    groups.set(task.group, currentTasks);
  });

  return Array.from(groups.entries()).map(([name, groupTasks]) => ({
    name,
    tasks: groupTasks,
  }));
};

const createEmptyTaskCounts = (): AdminTaskCounts => ({
  active: 0,
  completed: 0,
  failed: 0,
  paused: 0,
  waiting: 0,
});

/**
 * Keeps the thread slider inside server-supported CPU bounds.
 */
const clampThreadValue = (value: number, max: number): number => {
  const safeMax = Math.max(1, Math.floor(max));
  const safeValue = Number.isFinite(value) ? Math.round(value) : 1;

  return Math.min(safeMax, Math.max(1, safeValue));
};

/**
 * Returns a stable percentage for the visual progress bar.
 */
const getTaskProgressPercent = (task: AdminTask): number => {
  if (task.progressPercent !== undefined) {
    return task.progressPercent;
  }

  if (task.progressValue !== undefined && task.progressTotal !== undefined && task.progressTotal > 0) {
    return Math.min(100, Math.max(0, (task.progressValue / task.progressTotal) * 100));
  }

  return 0;
};

/**
 * Formats task progress as the demo count first, then falls back to percent text.
 */
const formatTaskProgressText = (task: AdminTask): string => {
  if (task.progressValue !== undefined && task.progressTotal !== undefined) {
    return `${task.progressValue} / ${task.progressTotal}`;
  }

  if (task.progressLabel && task.progressLabel !== '无进度') {
    return task.progressLabel;
  }

  if (task.stage?.value !== undefined && task.stage.total !== undefined) {
    return `${task.stage.value} / ${task.stage.total}`;
  }

  return task.progressLabel || '-';
};

/**
 * Formats the shared sub-task payload from /fileTask/jobs/active subData.
 */
const formatTaskSubTaskText = (task: AdminTask): string => {
  if (!task.stage) {
    return task.statusLabel;
  }

  const stageName = task.stage.type ? formatTaskStageType(task.stage.type) : '子任务';
  const stageProgress = formatStageProgressText(task.stage.value, task.stage.total);

  if (stageProgress) {
    return `${stageName} ${stageProgress}`;
  }

  return task.stage.type ? stageName : task.stage.label ?? task.statusLabel;
};

const formatStageProgressText = (value?: number, total?: number): string => {
  if (value !== undefined && total !== undefined && total > 0) {
    return `${value} / ${total}`;
  }

  if (value !== undefined) {
    return String(value);
  }

  if (total !== undefined && total > 0) {
    return `共 ${total}`;
  }

  return '';
};

const formatTaskStageType = (type: string): string => {
  const labels: Record<string, string> = {
    scanFile: '扫描文件',
    updateFileIndex: '更新索引',
    updateFolderList: '更新目录列表',
  };

  return labels[type] ?? type;
};
