import {
  CheckSquare,
  Download,
  FolderInput,
  Share2,
  Trash2,
  X,
} from 'lucide-react';

import type { BatchActionKey } from './folder-page-types';
import { formatSelectionSummary } from './folder-utils';

interface FolderBatchActionBarProps {
  allVisibleSelected: boolean;
  fileCount: number;
  folderCount: number;
  onAction: (action: BatchActionKey) => void;
  onClear: () => void;
  onToggleSelectAll: () => void;
  selectableCount: number;
  selectedCount: number;
  submittingAction?: BatchActionKey;
}

/**
 * Renders the floating batch toolbar for selected files and folders.
 */
export const FolderBatchActionBar = ({
  allVisibleSelected,
  fileCount,
  folderCount,
  onAction,
  onClear,
  onToggleSelectAll,
  selectableCount,
  selectedCount,
  submittingAction,
}: FolderBatchActionBarProps) => {
  const disabled = selectedCount === 0;
  const fileActionDisabled = disabled || fileCount === 0;

  return (
    <div className="folder-batch-bar">
      <div className="folder-batch-bar__summary">
        <strong>
          {selectedCount > 0
            ? `已选择 ${selectedCount} 项`
            : '选择文件或文件夹'}
        </strong>
        <span>
          {formatSelectionSummary(folderCount, fileCount)} · 当前可选{' '}
          {selectableCount} 项
        </span>
      </div>

      <div className="folder-batch-bar__actions">
        <button
          aria-label={allVisibleSelected ? '取消全选' : '全选当前目录'}
          className="secondary-btn folder-batch-action"
          disabled={selectableCount === 0}
          onClick={onToggleSelectAll}
          type="button"
        >
          <CheckSquare size={16} />
          <span className="folder-batch-action__label">
            {allVisibleSelected ? '取消全选' : '全选当前目录'}
          </span>
        </button>
        <button
          aria-label={submittingAction === 'move' ? '移动中' : '移动'}
          className="secondary-btn folder-batch-action"
          disabled={disabled || Boolean(submittingAction)}
          onClick={() => onAction('move')}
          type="button"
        >
          <FolderInput size={16} />
          <span className="folder-batch-action__label">
            {submittingAction === 'move' ? '移动中...' : '移动'}
          </span>
        </button>
        <button
          aria-label={submittingAction === 'share' ? '生成中' : '分享'}
          className="secondary-btn folder-batch-action"
          disabled={fileActionDisabled || Boolean(submittingAction)}
          onClick={() => onAction('share')}
          title={fileCount === 0 ? '分享目前仅支持文件' : '分享'}
          type="button"
        >
          <Share2 size={16} />
          <span className="folder-batch-action__label">
            {submittingAction === 'share' ? '生成中...' : '分享'}
          </span>
        </button>
        <button
          aria-label={submittingAction === 'download' ? '准备中' : '下载'}
          className="secondary-btn folder-batch-action"
          disabled={fileActionDisabled || Boolean(submittingAction)}
          onClick={() => onAction('download')}
          title={fileCount === 0 ? '下载目前仅支持文件' : '下载'}
          type="button"
        >
          <Download size={16} />
          <span className="folder-batch-action__label">
            {submittingAction === 'download' ? '准备中...' : '下载'}
          </span>
        </button>
        <button
          aria-label={submittingAction === 'delete' ? '删除中' : '删除'}
          className="danger-btn folder-batch-action"
          disabled={disabled || Boolean(submittingAction)}
          onClick={() => onAction('delete')}
          type="button"
        >
          <Trash2 size={16} />
          <span className="folder-batch-action__label">
            {submittingAction === 'delete' ? '删除中...' : '删除'}
          </span>
        </button>
        <button
          className="icon-btn folder-batch-clear"
          onClick={onClear}
          title="退出选择"
          type="button"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
