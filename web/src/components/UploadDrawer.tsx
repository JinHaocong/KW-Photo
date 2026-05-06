import { Folder, Home, X } from 'lucide-react';
import type { ChangeEvent, DragEvent, MouseEvent, TouchEvent } from 'react';
import { useRef } from 'react';

import type {
  FolderBreadcrumbItem,
  FolderDirectory,
  FolderSummary,
  UploadTarget,
  UploadTask,
} from '../shared/types';

interface UploadDrawerProps {
  open: boolean;
  tasks: UploadTask[];
  onClose: () => void;
  onClearFinished: () => void;
  onCloseTargetPicker: () => void;
  onOpenTargetFolder: (folderId: number) => void;
  onOpenTargetPicker: () => void;
  onOpenTargetRoot: () => void;
  onQueueFiles: (files: File[]) => void;
  onRetryTask: (task: UploadTask) => void;
  onSelectTarget: (target?: UploadTarget) => void;
  target?: UploadTarget;
  targetPickerDirectory: FolderDirectory;
  targetPickerError: string;
  targetPickerLoading: boolean;
  targetPickerOpen: boolean;
}

/**
 * Shows upload queue progress and drag/drop affordance.
 */
export const UploadDrawer = ({
  open,
  tasks,
  target,
  onClearFinished,
  onClose,
  onCloseTargetPicker,
  onOpenTargetFolder,
  onOpenTargetPicker,
  onOpenTargetRoot,
  onQueueFiles,
  onRetryTask,
  onSelectTarget,
  targetPickerDirectory,
  targetPickerError,
  targetPickerLoading,
  targetPickerOpen,
}: UploadDrawerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const targetLabel = target?.path || target?.name || '默认上传目录';

  if (!open) {
    return null;
  }

  /**
   * Queues selected files and clears the input so the same file can be selected again.
   */
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);

    if (files.length > 0) {
      onQueueFiles(files);
    }

    event.target.value = '';
  };

  /**
   * Adds dropped files to the upload queue.
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files ?? []);

    if (files.length > 0) {
      onQueueFiles(files);
    }
  };

  /**
   * Closes from touch devices without letting the press fall through to overlays.
   */
  const handleClosePress = (event: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onClose();
  };

  return (
    <div className="overlay drawer-overlay">
      <aside className="drawer">
        <button
          aria-label="关闭上传中心"
          className="icon-btn drawer-close"
          onClick={handleClosePress}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchEnd={handleClosePress}
          onTouchStart={(event) => event.stopPropagation()}
          type="button"
        >
          <X size={18} />
        </button>
        <h2>上传中心</h2>
        <p>上传前可以切换目标目录；已经进入队列的任务会保留原目录。</p>

        <div className="upload-target-panel">
          <div>
            <span>上传目录</span>
            <strong title={targetLabel}>{targetLabel}</strong>
          </div>
          <div className="upload-target-actions">
            <button className="secondary-btn" onClick={onOpenTargetPicker} type="button">
              选择目录
            </button>
            {target ? (
              <button className="secondary-btn" onClick={() => onSelectTarget(undefined)} type="button">
                默认目录
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="drop-zone"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <strong>拖入照片、视频或点击选择文件</strong>
          <span>自动检查重复，小文件直传，大文件走分块上传。</span>
          <input multiple onChange={handleInputChange} ref={inputRef} type="file" />
          <div className="upload-actions">
            <button className="primary-btn" onClick={() => inputRef.current?.click()} type="button">
              选择文件
            </button>
            <button className="secondary-btn" disabled={tasks.length === 0} onClick={onClearFinished} type="button">
              清除完成项
            </button>
          </div>
        </div>

        <div className="upload-list">
          {tasks.length === 0 ? (
            <div className="upload-empty">暂无上传任务。</div>
          ) : null}

          {tasks.map((task) => (
            <article className="upload-item" key={task.id}>
              <div className="upload-title">
                <span>
                  <strong>{task.name}</strong>
                  <small>{task.sizeLabel}{task.targetPath ? ` · ${task.targetPath}` : ''}</small>
                </span>
                <em className={`upload-status is-${task.state}`}>{task.status}</em>
              </div>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              {task.error ? <p className="upload-error">{task.error}</p> : null}
              {task.state === 'failed' ? (
                <button className="secondary-btn upload-retry" onClick={() => onRetryTask(task)} type="button">
                  重试
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </aside>

      <UploadTargetPickerDialog
        currentDirectory={targetPickerDirectory}
        error={targetPickerError}
        loading={targetPickerLoading}
        onClose={onCloseTargetPicker}
        onOpenFolder={onOpenTargetFolder}
        onOpenRoot={onOpenTargetRoot}
        onSelectTarget={onSelectTarget}
        open={targetPickerOpen}
      />
    </div>
  );
};

const UploadTargetPickerDialog = ({
  currentDirectory,
  error,
  loading,
  onClose,
  onOpenFolder,
  onOpenRoot,
  onSelectTarget,
  open,
}: {
  currentDirectory: FolderDirectory;
  error: string;
  loading: boolean;
  onClose: () => void;
  onOpenFolder: (folderId: number) => void;
  onOpenRoot: () => void;
  onSelectTarget: (target?: UploadTarget) => void;
  open: boolean;
}) => {
  if (!open) {
    return null;
  }

  const currentTarget = createUploadTargetFromDirectory(currentDirectory);

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="dialog batch-dialog upload-target-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2>选择上传目录</h2>
        <p>选中后，后续添加到上传中心的文件会进入该目录。</p>

        <div className="batch-folder-picker-toolbar">
          <button
            className="secondary-btn upload-target-root-btn"
            disabled={loading}
            onClick={onOpenRoot}
            type="button"
          >
            <Home size={15} />
            根目录
          </button>
          <UploadTargetBreadcrumb
            disabled={loading}
            items={createDirectoryPathItems(currentDirectory)}
            onOpenFolder={onOpenFolder}
          />
        </div>

        <div className="batch-target-panel upload-target-current-panel">
          <div>
            <span>当前层级</span>
            <strong>{currentDirectory.path || '根目录'}</strong>
          </div>
          <button
            className="secondary-btn"
            disabled={loading}
            onClick={() => onSelectTarget(currentTarget)}
            type="button"
          >
            {currentTarget ? '选当前目录' : '默认上传目录'}
          </button>
        </div>

        {loading ? <div className="cover-picker-state">正在加载目录...</div> : null}

        {!loading && currentDirectory.folders.length === 0 ? (
          <div className="cover-picker-state">当前层级没有子文件夹。</div>
        ) : null}

        {!loading && currentDirectory.folders.length > 0 ? (
          <div className="batch-folder-grid">
            {currentDirectory.folders.map((folder) => (
              <div className="batch-folder-card" key={folder.id || folder.path}>
                <button
                  className="batch-folder-card__main"
                  disabled={folder.id <= 0}
                  onClick={() => onOpenFolder(folder.id)}
                  type="button"
                >
                  <Folder size={24} />
                  <span title={folder.name}>{folder.name}</span>
                </button>
                <button
                  className="secondary-btn"
                  onClick={() => onSelectTarget(createUploadTargetFromFolder(folder))}
                  type="button"
                >
                  选为上传目录
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <div className="form-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="secondary-btn" onClick={() => onSelectTarget(undefined)} type="button">
            默认上传目录
          </button>
          <button className="primary-btn" onClick={onClose} type="button">
            完成
          </button>
        </div>
      </section>
    </div>
  );
};

const UploadTargetBreadcrumb = ({
  disabled,
  items,
  onOpenFolder,
}: {
  disabled: boolean;
  items: UploadTargetPathItem[];
  onOpenFolder: (folderId: number) => void;
}) => {
  return (
    <div className="cover-picker-breadcrumb" title={items.map((item) => item.name).join('/')}>
      {items.map((item, index) => {
        const folderId = item.id;
        const clickable = folderId !== undefined && folderId > 0;

        return (
          <span className="cover-picker-breadcrumb__item" key={`${item.name}-${index}`}>
            {index > 0 ? <span className="cover-picker-breadcrumb__separator">/</span> : null}
            {clickable ? (
              <button disabled={disabled} onClick={() => onOpenFolder(folderId)} type="button">
                {item.name}
              </button>
            ) : (
              <strong>{item.name}</strong>
            )}
          </span>
        );
      })}
    </div>
  );
};

interface UploadTargetPathItem {
  id?: number;
  name: string;
}

/**
 * Creates upload target data from a visible folder card.
 */
const createUploadTargetFromFolder = (folder: FolderSummary): UploadTarget => {
  return {
    folderId: folder.id,
    name: folder.name,
    path: folder.path,
  };
};

/**
 * Creates upload target data for the directory currently shown in the picker.
 */
const createUploadTargetFromDirectory = (directory: FolderDirectory): UploadTarget | undefined => {
  if (!directory.folderId) {
    return undefined;
  }

  const lastBreadcrumb = directory.breadcrumbs[directory.breadcrumbs.length - 1];

  return {
    folderId: directory.folderId,
    name: lastBreadcrumb?.name || getLastPathSegment(directory.path) || '当前文件夹',
    path: directory.path,
  };
};

/**
 * Builds clickable path items for the upload target picker.
 */
const createDirectoryPathItems = (directory: FolderDirectory): UploadTargetPathItem[] => {
  const breadcrumbs = directory.breadcrumbs
    .map(mapBreadcrumbItem)
    .filter((item) => item.name);

  if (breadcrumbs.length > 0) {
    return breadcrumbs;
  }

  if (directory.folderId) {
    return [{ id: directory.folderId, name: getLastPathSegment(directory.path) || '当前文件夹' }];
  }

  return [{ name: '根目录' }];
};

const mapBreadcrumbItem = (item: FolderBreadcrumbItem): UploadTargetPathItem => {
  return {
    id: item.id,
    name: item.name || item.path || '',
  };
};

const getLastPathSegment = (path: string): string => {
  const segments = path.split('/').filter(Boolean);

  return segments[segments.length - 1] ?? '';
};
