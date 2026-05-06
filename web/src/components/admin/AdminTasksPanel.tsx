import { Pause, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAdminTaskCounts,
  fetchAdminTasks,
  pauseAdminTasks,
  resumeAdminTasks,
} from '../../services/admin-service';
import type { AdminTask, AdminTaskCounts, AdminTaskStatus } from '../../services/admin-service';
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

/**
 * Displays server task queues together with the local upload queue.
 */
export const AdminTasksPanel = ({ apiOptions, onShowToast, uploadTasks }: AdminTasksPanelProps) => {
  const [activeStatus, setActiveStatus] = useState<AdminTaskStatus>('active');
  const [counts, setCounts] = useState<AdminTaskCounts>(() => createEmptyTaskCounts());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [queueSubmitting, setQueueSubmitting] = useState(false);
  const [serverTasks, setServerTasks] = useState<AdminTask[]>([]);
  const uploadStats = useMemo(() => getUploadTaskStats(uploadTasks), [uploadTasks]);

  const loadTasks = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const [nextCounts, nextTasks] = await Promise.all([
        fetchAdminTaskCounts(apiOptions),
        fetchAdminTasks(apiOptions, activeStatus),
      ]);

      setCounts(nextCounts);
      setServerTasks(nextTasks);
    } catch (requestError) {
      setCounts(createEmptyTaskCounts());
      setServerTasks([]);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [activeStatus, apiOptions]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

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

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div>
          <h3>后台任务</h3>
          <p>服务端任务队列和本机上传队列统一查看。</p>
        </div>
        <div className="admin-inline-actions">
          <button className="secondary-btn" disabled={queueSubmitting} onClick={() => void handleQueueAction('pause')} type="button">
            <Pause size={15} />
            暂停队列
          </button>
          <button className="secondary-btn" disabled={queueSubmitting} onClick={() => void handleQueueAction('resume')} type="button">
            <Play size={15} />
            恢复队列
          </button>
          <button className="secondary-btn" disabled={loading} onClick={() => void loadTasks()} type="button">
            <RefreshCw size={15} />
            刷新
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
              <span>{task.progressLabel}</span>
              <span>{formatAdminDateTime(task.updatedAt)}</span>
              {task.detail ? <span title={task.detail}>{task.detail}</span> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const createEmptyTaskCounts = (): AdminTaskCounts => ({
  active: 0,
  completed: 0,
  failed: 0,
  paused: 0,
  waiting: 0,
});
