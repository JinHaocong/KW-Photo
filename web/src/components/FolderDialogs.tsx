import { Check, Folder, Image } from 'lucide-react';
import { useEffect, useState } from 'react';

import { createBrowserMediaUrl, createThumbnailUrl } from '../shared/media-url';
import type { FolderBreadcrumbItem, FolderDirectory, FolderFileSummary, FolderSummary } from '../shared/types';

export type BatchMoveOverwriteMode = 0 | 1 | 2;

export interface BatchShareFormValues {
  desc: string;
  expiresInDays?: number;
  password: string;
  showDownload: boolean;
  showExif: boolean;
}

export const CreateFolderDialog = ({
  currentPath,
  error,
  name,
  onChangeName,
  onClose,
  onSubmit,
  open,
  submitting,
}: {
  currentPath: string;
  error: string;
  name: string;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  open: boolean;
  submitting: boolean;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <FolderNameDialogContent
        currentPath={currentPath}
        error={error}
        name={name}
        onChangeName={onChangeName}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel="创建"
        submitting={submitting}
        submittingLabel="创建中..."
        title="新建文件夹"
      />
    </div>
  );
};

export const FolderNameDialog = ({
  currentPath,
  error,
  name,
  onChangeName,
  onClose,
  onSubmit,
  open,
  submitLabel,
  submitting,
  submittingLabel,
  title,
}: {
  currentPath: string;
  error: string;
  name: string;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  open: boolean;
  submitLabel: string;
  submitting: boolean;
  submittingLabel: string;
  title: string;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <FolderNameDialogContent
        currentPath={currentPath}
        error={error}
        name={name}
        onChangeName={onChangeName}
        onClose={onClose}
        onSubmit={onSubmit}
        submitLabel={submitLabel}
        submitting={submitting}
        submittingLabel={submittingLabel}
        title={title}
      />
    </div>
  );
};

export const FolderCoverDialog = ({
  autoSubmitting,
  authCode,
  currentPath,
  error,
  files,
  folder,
  folders,
  breadcrumbs,
  loading,
  onAutoSet,
  onClose,
  onOpenFolder,
  onOpenFolderId,
  onSubmit,
  onToggleFile,
  selectedHashes,
  serverUrl,
  submitting,
}: {
  autoSubmitting: boolean;
  authCode?: string;
  currentPath: string;
  error: string;
  files: FolderFileSummary[];
  folder?: FolderSummary;
  folders: FolderSummary[];
  breadcrumbs: FolderBreadcrumbItem[];
  loading: boolean;
  onAutoSet: () => Promise<void>;
  onClose: () => void;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderId: (folderId: number) => void;
  onSubmit: () => Promise<void>;
  onToggleFile: (file: FolderFileSummary) => void;
  selectedHashes: string[];
  serverUrl: string;
  submitting: boolean;
}) => {
  if (!folder) {
    return null;
  }

  const selectedHashSet = new Set(selectedHashes);
  const pathItems = createCoverPathItems(breadcrumbs, folder, currentPath);

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section className="dialog folder-cover-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h2>设置文件夹封面</h2>
        <p>
          {folder.name} · 从文件夹内选择最多 4 张图片作为封面拼贴。
        </p>
        <div className="cover-picker-toolbar">
          <CoverPickerBreadcrumb
            disabled={loading || autoSubmitting || submitting}
            items={pathItems}
            onOpenFolderId={onOpenFolderId}
          />
          <button
            className="secondary-btn"
            disabled={loading || autoSubmitting || submitting}
            onClick={() => void onAutoSet()}
            type="button"
          >
            {autoSubmitting ? '自动设置中...' : '自动设置'}
          </button>
        </div>

        {loading ? <div className="cover-picker-state">正在加载文件夹图片...</div> : null}

        {!loading && files.length + folders.length === 0 ? (
          <div className="cover-picker-state">当前文件夹没有可设置为封面的图片。</div>
        ) : null}

        {!loading && files.length + folders.length > 0 ? (
          <div className="cover-picker-grid">
            {folders.map((childFolder) => (
              <button
                className="cover-picker-card cover-picker-folder"
                key={childFolder.id || childFolder.path}
                onClick={() => onOpenFolder(childFolder)}
                type="button"
              >
                <span className="cover-picker-thumb">
                  <Folder size={28} />
                </span>
                <span className="cover-picker-name" title={childFolder.name}>
                  {childFolder.name}
                </span>
              </button>
            ))}
            {files.map((file) => {
              const selected = selectedHashSet.has(file.md5);
              const thumbnailUrl = createBrowserMediaUrl(createThumbnailUrl({
                authCode,
                baseUrl: serverUrl,
                md5: file.md5,
                type: 'h220',
              }));

              return (
                <button
                  aria-pressed={selected}
                  className={selected ? 'cover-picker-card is-selected' : 'cover-picker-card'}
                  key={`${file.id}-${file.md5}`}
                  onClick={() => onToggleFile(file)}
                  type="button"
                >
                  <span className="cover-picker-thumb">
                    {thumbnailUrl ? <img alt="" src={thumbnailUrl} /> : <Image size={22} />}
                  </span>
                  <span className="cover-picker-name" title={file.name}>
                    {file.name}
                  </span>
                  {selected ? (
                    <span className="cover-picker-check">
                      <Check size={14} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="cover-picker-meta">
          已选择 {selectedHashes.length}/4
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="secondary-btn" disabled={autoSubmitting || submitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-btn"
            disabled={autoSubmitting || loading || submitting || selectedHashes.length === 0}
            onClick={() => void onSubmit()}
            type="button"
          >
            {submitting ? '保存中...' : '保存封面'}
          </button>
        </div>
      </section>
    </div>
  );
};

export const BatchMoveDialog = ({
  currentDirectory,
  error,
  loading,
  onChangeOverwriteMode,
  onClose,
  onOpenFolder,
  onOpenFolderId,
  onOpenRoot,
  onSelectTarget,
  onSubmit,
  open,
  overwriteMode,
  selectedSummary,
  submitting,
  target,
}: {
  currentDirectory: FolderDirectory;
  error: string;
  loading: boolean;
  onChangeOverwriteMode: (mode: BatchMoveOverwriteMode) => void;
  onClose: () => void;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderId: (folderId: number) => void;
  onOpenRoot: () => void;
  onSelectTarget: (folder: FolderSummary) => void;
  onSubmit: () => Promise<void>;
  open: boolean;
  overwriteMode: BatchMoveOverwriteMode;
  selectedSummary: string;
  submitting: boolean;
  target?: FolderSummary;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section className="dialog batch-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h2>移动所选内容</h2>
        <p>{selectedSummary} · 选择目标文件夹后执行移动。</p>

        <div className="batch-folder-picker-toolbar">
          <button className="secondary-btn" disabled={loading || submitting} onClick={onOpenRoot} type="button">
            根目录
          </button>
          <CoverPickerBreadcrumb
            disabled={loading || submitting}
            items={createDirectoryPathItems(currentDirectory)}
            onOpenFolderId={onOpenFolderId}
          />
        </div>

        <div className="batch-target-panel">
          <div>
            <span>目标文件夹</span>
            <strong>{target?.path || target?.name || '未选择'}</strong>
          </div>
          <label>
            重名处理
            <select
              disabled={submitting}
              onChange={(event) => onChangeOverwriteMode(Number(event.target.value) as BatchMoveOverwriteMode)}
              value={overwriteMode}
            >
              <option value={2}>自动重命名</option>
              <option value={0}>跳过冲突</option>
              <option value={1}>覆盖文件</option>
            </select>
          </label>
        </div>

        {loading ? <div className="cover-picker-state">正在加载目标文件夹...</div> : null}

        {!loading && currentDirectory.folders.length === 0 ? (
          <div className="cover-picker-state">当前层级没有子文件夹。</div>
        ) : null}

        {!loading && currentDirectory.folders.length > 0 ? (
          <div className="batch-folder-grid">
            {currentDirectory.folders.map((folder) => (
              <div className="batch-folder-card" key={folder.id || folder.path}>
                <button className="batch-folder-card__main" onClick={() => onOpenFolder(folder)} type="button">
                  <Folder size={24} />
                  <span title={folder.name}>{folder.name}</span>
                </button>
                <button className="secondary-btn" onClick={() => onSelectTarget(folder)} type="button">
                  设为目标
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? <div className="form-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-btn"
            disabled={loading || submitting || !target}
            onClick={() => void onSubmit()}
            type="button"
          >
            {submitting ? '移动中...' : '确认移动'}
          </button>
        </div>
      </section>
    </div>
  );
};

export const BatchShareDialog = ({
  fileCount,
  onClose,
  onSubmit,
  open,
  submitting,
}: {
  fileCount: number;
  onClose: () => void;
  onSubmit: (values: BatchShareFormValues) => Promise<void>;
  open: boolean;
  submitting: boolean;
}) => {
  const [desc, setDesc] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<number | undefined>(7);
  const [password, setPassword] = useState('');
  const [showDownload, setShowDownload] = useState(true);
  const [showExif, setShowExif] = useState(true);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDesc('');
    setExpiresInDays(7);
    setPassword('');
    setShowDownload(true);
    setShowExif(true);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section className="dialog batch-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h2>创建分享链接</h2>
        <p>当前选择 {fileCount} 个文件，可配置过期时间、访问密码和访问权限。</p>

        <div className="form-grid">
          <label>
            分享描述
            <input onChange={(event) => setDesc(event.target.value)} placeholder="请输入分享描述" value={desc} />
          </label>
          <label>
            过期时间
            <select
              onChange={(event) => {
                const value = event.target.value;
                setExpiresInDays(value === 'forever' ? undefined : Number(value));
              }}
              value={expiresInDays ?? 'forever'}
            >
              <option value={7}>7 天后过期</option>
              <option value={30}>30 天后过期</option>
              <option value={90}>90 天后过期</option>
              <option value="forever">永久有效</option>
            </select>
          </label>
          <label>
            访问密码
            <input onChange={(event) => setPassword(event.target.value)} placeholder="留空则不设置" value={password} />
          </label>
          <div className="batch-switch-row">
            <label>
              <input checked={showExif} onChange={(event) => setShowExif(event.target.checked)} type="checkbox" />
              显示 EXIF
            </label>
            <label>
              <input
                checked={showDownload}
                onChange={(event) => setShowDownload(event.target.checked)}
                type="checkbox"
              />
              允许下载
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button
            className="primary-btn"
            disabled={submitting || fileCount === 0}
            onClick={() => void onSubmit({ desc, expiresInDays, password, showDownload, showExif })}
            type="button"
          >
            {submitting ? '生成中...' : '生成并复制'}
          </button>
        </div>
      </section>
    </div>
  );
};

export const BatchDeleteConfirmDialog = ({
  onClose,
  onConfirm,
  open,
  selectedSummary,
  submitting,
}: {
  onClose: () => void;
  onConfirm: () => Promise<void>;
  open: boolean;
  selectedSummary: string;
  submitting: boolean;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay" onMouseDown={onClose}>
      <section className="dialog logout-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <h2>删除所选内容</h2>
        <p>{selectedSummary} · 文件会进入回收站，文件夹会按服务端规则删除。</p>
        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button className="danger-btn" disabled={submitting} onClick={() => void onConfirm()} type="button">
            {submitting ? '删除中...' : '确认删除'}
          </button>
        </div>
      </section>
    </div>
  );
};

const CoverPickerBreadcrumb = ({
  disabled,
  items,
  onOpenFolderId,
}: {
  disabled: boolean;
  items: CoverPathItem[];
  onOpenFolderId: (folderId: number) => void;
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
              <button disabled={disabled} onClick={() => onOpenFolderId(folderId)} type="button">
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

interface CoverPathItem {
  id?: number;
  name: string;
}

const createCoverPathItems = (breadcrumbs: FolderBreadcrumbItem[], folder: FolderSummary, currentPath: string): CoverPathItem[] => {
  const mappedBreadcrumbs = breadcrumbs
    .map((item) => ({
      id: item.id,
      name: item.name || item.path || '',
    }))
    .filter((item) => item.name);

  if (mappedBreadcrumbs.length > 0) {
    return mappedBreadcrumbs;
  }

  if (currentPath) {
    return currentPath
      .split('/')
      .filter(Boolean)
      .map((name, index, pathItems) => ({
        id: index === pathItems.length - 1 ? folder.id : undefined,
        name,
      }));
  }

  return [{ id: folder.id, name: folder.name }];
};

const createDirectoryPathItems = (directory: FolderDirectory): CoverPathItem[] => {
  const breadcrumbs = directory.breadcrumbs
    .map((item) => ({
      id: item.id,
      name: item.name || item.path || '',
    }))
    .filter((item) => item.name);

  if (breadcrumbs.length > 0) {
    return breadcrumbs;
  }

  if (directory.folderId) {
    return [{ id: directory.folderId, name: directory.path || '当前文件夹' }];
  }

  return [{ name: '根目录' }];
};

const FolderNameDialogContent = ({
  currentPath,
  error,
  name,
  onChangeName,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  submittingLabel,
  title,
}: {
  currentPath: string;
  error: string;
  name: string;
  onChangeName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  submitLabel: string;
  submitting: boolean;
  submittingLabel: string;
  title: string;
}) => {
  return (
    <section className="dialog" onMouseDown={(event) => event.stopPropagation()}>
      <h2>{title}</h2>
      <p>当前位置：{currentPath}</p>

      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label>
          文件夹名称
          <input
            autoFocus
            disabled={submitting}
            onChange={(event) => onChangeName(event.target.value)}
            placeholder="例如：旅行、相机备份、作品集"
            value={name}
          />
        </label>

        {error ? <div className="form-error">{error}</div> : null}

        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-btn" disabled={submitting || !name.trim()} type="submit">
            {submitting ? submittingLabel : submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
};
