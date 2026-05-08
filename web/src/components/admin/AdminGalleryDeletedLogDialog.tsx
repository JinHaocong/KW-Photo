import { X } from 'lucide-react';

import type { AdminFileDeleteLogPage } from '../../services/admin-service';
import { Modal } from '../Modal';

interface AdminGalleryDeletedLogDialogProps {
  actionLoading: string;
  onClearDeletedLogs: () => void;
  onClose: () => void;
  onExportDeletedFiles: () => void;
  onLoadPage: (pageNo?: number) => void;
  open: boolean;
  page?: AdminFileDeleteLogPage;
}

/**
 * Shows paged server-side delete logs and related cleanup actions.
 */
export const AdminGalleryDeletedLogDialog = ({
  actionLoading,
  onClearDeletedLogs,
  onClose,
  onExportDeletedFiles,
  onLoadPage,
  open,
  page,
}: AdminGalleryDeletedLogDialogProps) => {
  const hasPrevious = Boolean(page && page.pageNo > 1);
  const hasNext = Boolean(page && page.pageNo * page.pageSize < page.count);

  return (
    <Modal
      className="gallery-confirm-dialog admin-delete-log-dialog"
      footer={
        <div className="admin-delete-log-actions">
          <button
            className="secondary-btn"
            disabled={actionLoading === 'deleted'}
            onClick={onExportDeletedFiles}
            type="button"
          >
            导出预览图
          </button>
          <button
            className="secondary-btn is-danger-soft"
            disabled={actionLoading === 'clear-deleted-logs'}
            onClick={onClearDeletedLogs}
            type="button"
          >
            清空文件删除记录
          </button>
          <button
            className="secondary-btn"
            disabled={!hasPrevious || actionLoading === 'deleted-logs'}
            onClick={() => onLoadPage((page?.pageNo ?? 2) - 1)}
            type="button"
          >
            上一页
          </button>
          <button
            className="secondary-btn"
            disabled={!hasNext || actionLoading === 'deleted-logs'}
            onClick={() => onLoadPage((page?.pageNo ?? 0) + 1)}
            type="button"
          >
            下一页
          </button>
        </div>
      }
      onClose={onClose}
      open={open}
      title="文件删除记录"
    >
      <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)' }}>{page ? `${page.count} 条记录` : '正在读取删除日志'}</p>
      <div className="admin-delete-log-table">
        <div className="admin-delete-log-row is-head">
          <span>操作用户</span>
          <span>删除时间</span>
          <span>删除类型</span>
          <span>文件路径</span>
        </div>
        {actionLoading === 'deleted-logs' ? <div className="admin-state compact">正在读取文件删除记录...</div> : null}
        {page && page.list.length === 0 ? <div className="admin-state compact">无文件删除记录</div> : null}
        {page?.list.map((log) => (
          <div className="admin-delete-log-row" key={log.id}>
            <span>{log.operator}</span>
            <span>{formatDateTime(log.deleteTime)}</span>
            <span>{log.deleteType}</span>
            <span title={log.filePath}>{log.filePath}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};

const formatDateTime = (value?: string): string => {
  if (!value) {
    return '-';
  }

  return value.replace('T', ' ').slice(0, 19);
};
