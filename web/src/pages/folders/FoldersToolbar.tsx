import { Breadcrumb } from 'antd';
import type { ItemType } from 'antd/es/breadcrumb/Breadcrumb';
import {
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Home,
  LayoutGrid,
  List,
  Pin,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  UploadCloud,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import type {
  FolderCardSize,
  FolderDirectory,
  FolderSortField,
  SortDirection,
  UploadTarget,
} from '../../shared/types';
import type { FolderNavigationPreview } from './folder-page-types';
import { createUploadTarget } from './folder-utils';
import {
  FOLDER_CARD_SIZE_LABEL,
  FOLDER_CARD_SIZE_OPTIONS,
  SORT_DIRECTION_LABEL,
  SORT_DIRECTION_OPTIONS,
  SORT_FIELD_LABEL,
  SORT_FIELD_OPTIONS,
} from './folder-view-preferences';

interface FoldersToolbarProps {
  currentFolderId?: number;
  directory: FolderDirectory;
  folderCardSize: FolderCardSize;
  hasDirectoryContent: boolean;
  loading: boolean;
  onChangeCardSize: (size: FolderCardSize) => void;
  onChangeSortDirection: (direction: SortDirection) => void;
  onChangeSortField: (field: FolderSortField) => void;
  onOpenCreateFolder: () => void;
  onOpenUpload: (target?: UploadTarget) => void;
  onPinCurrentPath: () => void;
  onRefresh: () => void;
  onNavigateFolder: (folderId?: number, preview?: FolderNavigationPreview) => void;
  onToggleFolderCovers: () => void;
  onToggleSelectionMode: () => void;
  onToggleViewMode: () => void;
  selectionMode: boolean;
  showFolderCovers: boolean;
  sortDirection: SortDirection;
  sortField: FolderSortField;
  viewMode: 'grid' | 'list';
}

/**
 * Renders folder navigation, view controls and primary folder actions.
 */
export const FoldersToolbar = ({
  currentFolderId,
  directory,
  folderCardSize,
  hasDirectoryContent,
  loading,
  onChangeCardSize,
  onChangeSortDirection,
  onChangeSortField,
  onOpenCreateFolder,
  onOpenUpload,
  onPinCurrentPath,
  onRefresh,
  onNavigateFolder,
  onToggleFolderCovers,
  onToggleSelectionMode,
  onToggleViewMode,
  selectionMode,
  showFolderCovers,
  sortDirection,
  sortField,
  viewMode,
}: FoldersToolbarProps) => {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [toolbarExpanded, setToolbarExpanded] = useState(false);
  const toolbarActionsId = useId();
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sortMenuOpen) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (sortMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setSortMenuOpen(false);
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [sortMenuOpen]);

  useEffect(() => {
    if (!toolbarExpanded) {
      setSortMenuOpen(false);
    }
  }, [toolbarExpanded]);

  /**
   * Opens a breadcrumb folder or refreshes when it points at the current folder.
   */
  const handleOpenFolderId = (folderId: number, breadcrumbIndex: number): void => {
    if (folderId === currentFolderId) {
      onRefresh();
      return;
    }

    onNavigateFolder(folderId, createBreadcrumbNavigationPreview(directory, breadcrumbIndex));
  };

  /**
   * Opens root or refreshes root when already at root.
   */
  const handleOpenRoot = (): void => {
    if (currentFolderId === undefined) {
      onRefresh();
      return;
    }

    onNavigateFolder(undefined);
  };
  const breadcrumbItems = createFolderBreadcrumbItems({
    directory,
    onOpenFolderId: handleOpenFolderId,
    onOpenRoot: handleOpenRoot,
  });

  return (
    <div className={toolbarExpanded ? 'folder-toolbar is-expanded' : 'folder-toolbar'}>
      <div className="folder-toolbar__summary">
        <div className="folder-toolbar__head">
          <Breadcrumb
            className="folder-breadcrumb"
            items={breadcrumbItems}
            separator={<ChevronRight size={13} />}
          />
          <div className="folder-toolbar__quick-actions">
            <button
              className="icon-btn"
              disabled={loading}
              onClick={onRefresh}
              title="刷新"
              type="button"
            >
              <RefreshCw size={16} />
            </button>
            <button
              aria-label={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
              className="icon-btn"
              onClick={onToggleViewMode}
              title={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
              type="button"
            >
              {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
            </button>
            <button
              aria-controls={toolbarActionsId}
              aria-expanded={toolbarExpanded}
              aria-label={toolbarExpanded ? '收起文件夹操作' : '展开文件夹操作'}
              className="folder-toolbar-toggle"
              onClick={() => setToolbarExpanded((current) => !current)}
              title={toolbarExpanded ? '收起操作' : '展开操作'}
              type="button"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
        <p>{directory.path || '根目录'} · 真实目录浏览、文件夹上传和整理入口。</p>
      </div>

      <div className="folder-actions" id={toolbarActionsId}>
        <button
          className="icon-btn folder-actions__refresh"
          disabled={loading}
          onClick={onRefresh}
          title="刷新"
          type="button"
        >
          <RefreshCw size={16} />
        </button>
        <button
          aria-label={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
          className="icon-btn folder-actions__view-mode"
          onClick={onToggleViewMode}
          title={viewMode === 'grid' ? '切换为列表视图' : '切换为网格视图'}
          type="button"
        >
          {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
        </button>
        <div aria-label="文件夹卡片大小" className="folder-size-control" role="group">
          {FOLDER_CARD_SIZE_OPTIONS.map((size) => (
            <button
              aria-pressed={folderCardSize === size}
              className={folderCardSize === size ? 'is-active' : ''}
              key={size}
              onClick={() => onChangeCardSize(size)}
              title={`文件夹卡片${FOLDER_CARD_SIZE_LABEL[size]}`}
              type="button"
            >
              {FOLDER_CARD_SIZE_LABEL[size]}
            </button>
          ))}
        </div>
        <button
          aria-pressed={selectionMode}
          className={
            selectionMode
              ? 'secondary-btn folder-selection-trigger is-active'
              : 'secondary-btn folder-selection-trigger'
          }
          disabled={!hasDirectoryContent}
          onClick={onToggleSelectionMode}
          type="button"
        >
          <CheckSquare size={16} />
          选择
        </button>
        <button
          aria-pressed={showFolderCovers}
          className={
            showFolderCovers
              ? 'secondary-btn folder-cover-toggle is-active'
              : 'secondary-btn folder-cover-toggle'
          }
          onClick={onToggleFolderCovers}
          title={showFolderCovers ? '隐藏文件夹封面图' : '显示文件夹封面图'}
          type="button"
        >
          {showFolderCovers ? <Eye size={16} /> : <EyeOff size={16} />}
          封面图
        </button>
        <div className="folder-sort-control" ref={sortMenuRef}>
          <button
            className="secondary-btn folder-sort-trigger"
            onClick={() => setSortMenuOpen((current) => !current)}
            type="button"
          >
            <SlidersHorizontal size={16} />
            {SORT_FIELD_LABEL[sortField]} · {SORT_DIRECTION_LABEL[sortDirection]}
            <ChevronDown size={14} />
          </button>
          {sortMenuOpen ? (
            <div className="folder-sort-menu" role="menu">
              <div className="folder-sort-menu__section">
                <span>排序字段</span>
                {SORT_FIELD_OPTIONS.map((field) => (
                  <button
                    className={sortField === field ? 'is-active' : ''}
                    key={field}
                    onClick={() => onChangeSortField(field)}
                    type="button"
                  >
                    {SORT_FIELD_LABEL[field]}
                    {sortField === field ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
              <div className="folder-sort-menu__section">
                <span>排序方向</span>
                {SORT_DIRECTION_OPTIONS.map((direction) => (
                  <button
                    className={sortDirection === direction ? 'is-active' : ''}
                    key={direction}
                    onClick={() => onChangeSortDirection(direction)}
                    type="button"
                  >
                    {SORT_DIRECTION_LABEL[direction]}
                    {sortDirection === direction ? <Check size={14} /> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <button className="icon-btn" onClick={onPinCurrentPath} title="置顶当前路径" type="button">
          <Pin size={16} />
        </button>
        <button
          className="secondary-btn"
          disabled={currentFolderId === undefined}
          onClick={onOpenCreateFolder}
          title={currentFolderId === undefined ? '请先进入子文件夹再新建' : '新建文件夹'}
          type="button"
        >
          <Plus size={16} />
          新建
        </button>
        <button
          className="primary-btn"
          onClick={() => onOpenUpload(createUploadTarget(currentFolderId, directory.path))}
          type="button"
        >
          <UploadCloud size={16} />
          上传到当前文件夹
        </button>
      </div>
    </div>
  );
};

/**
 * Builds a temporary breadcrumb preview before the destination API finishes.
 */
const createBreadcrumbNavigationPreview = (
  directory: FolderDirectory,
  breadcrumbIndex: number,
): FolderNavigationPreview => {
  const breadcrumbs = directory.breadcrumbs.slice(0, breadcrumbIndex + 1);
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return {
    breadcrumbs,
    folderId: lastBreadcrumb?.id,
    path: lastBreadcrumb?.path || createBreadcrumbPath(breadcrumbs),
  };
};

const createBreadcrumbPath = (
  breadcrumbs: FolderDirectory['breadcrumbs'],
): string => {
  return breadcrumbs.map((item) => item.name).filter(Boolean).join('/');
};

interface CreateFolderBreadcrumbItemsOptions {
  directory: FolderDirectory;
  onOpenFolderId: (folderId: number, breadcrumbIndex: number) => void;
  onOpenRoot: () => void;
}

/**
 * Creates Ant Design breadcrumb items while preserving folder navigation previews.
 */
const createFolderBreadcrumbItems = ({
  directory,
  onOpenFolderId,
  onOpenRoot,
}: CreateFolderBreadcrumbItemsOptions): ItemType[] => {
  const rootItem: ItemType = {
    key: 'root',
    title: (
      <button className="folder-breadcrumb__button is-root" onClick={onOpenRoot} type="button">
        <Home size={14} />
        <span className="folder-breadcrumb__label">全部</span>
      </button>
    ),
  };

  const folderItems = directory.breadcrumbs.map((item, index): ItemType => {
    const folderId = item.id;
    const label = item.name || '未命名文件夹';

    return {
      key: `${folderId ?? label}-${index}`,
      title:
        folderId !== undefined && folderId > 0 ? (
          <button
            className="folder-breadcrumb__button"
            onClick={() => onOpenFolderId(folderId, index)}
            title={label}
            type="button"
          >
            <span className="folder-breadcrumb__label">{label}</span>
          </button>
        ) : (
          <span className="folder-breadcrumb__current" title={label}>
            {label}
          </span>
        ),
    };
  });

  return [rootItem, ...folderItems];
};
