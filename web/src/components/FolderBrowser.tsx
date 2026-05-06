import { Check, File, FileImage, Folder, MoreHorizontal, Pencil, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  CSSProperties,
  ImgHTMLAttributes,
  MouseEvent as ReactMouseEvent,
  Ref,
  ReactNode,
  Touch as ReactTouch,
  TouchEvent as ReactTouchEvent,
} from 'react';
import { InView } from 'react-intersection-observer';

import { useCachedMediaUrl } from '../hooks/useCachedMediaUrl';
import { createFileSelectionKey, createFolderSelectionKey } from '../shared/directory-selection';
import type { DirectorySelectionKey } from '../shared/directory-selection';
import { createLocalCacheFolderRef } from '../shared/local-cache';
import type { LocalCacheFolderRef } from '../shared/local-cache';
import { createThumbnailUrl } from '../shared/media-url';
import type {
  FolderCardSize,
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
  UploadTarget,
} from '../shared/types';

export const STATUS_COPY: Record<FolderSummary['status'], string> = {
  empty: '空文件夹',
  ready: '可浏览',
  scanning: '扫描中',
};

export const VIDEO_TYPES = new Set(['MP4', 'MOV', 'WEBM', 'M4V', 'MKV', 'AVI', 'FLV', 'MTS', 'M2TS']);

const LONG_PRESS_DELAY_MS = 520;
const LONG_PRESS_MOVE_TOLERANCE = 12;
const TAP_MOVE_TOLERANCE = 10;
const LAZY_MEDIA_ROOT_MARGIN = '420px 0px';

export const FolderMetric = ({ label, value }: { label: string; value: string }) => {
  return (
    <article className="folder-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
};

/** Renders a single loading panel while folder data is loading. */
export const FolderSkeleton = () => {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      aria-label="正在加载文件夹内容"
      className="folder-loading-panel"
    >
      <span aria-hidden="true" className="folder-loading-panel__visual">
        <span className="folder-loading-panel__ring" />
        <span className="folder-loading-panel__icon">
          <Folder size={24} />
        </span>
      </span>
      <span className="folder-loading-panel__copy">
        <strong>正在加载文件夹</strong>
        <span>正在同步当前目录内容，请稍候。</span>
      </span>
    </section>
  );
};

export const DirectoryContent = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  directory,
  onOpenFolder,
  onOpenFolderUpload,
  onPreviewFile,
  onRenameFolder,
  onSetFolderCover,
  onToggleSelection,
  folderCardSize,
  loadingOverlayVisible,
  selectedKeys,
  selectionMode,
  serverUrl,
  showFolderCovers,
  viewMode,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  directory: FolderDirectory;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderUpload: (target: UploadTarget) => void;
  onPreviewFile: (file: FolderFileSummary) => void;
  onRenameFolder: (folder: FolderSummary) => void;
  onSetFolderCover: (folder: FolderSummary) => void;
  onToggleSelection: (key: DirectorySelectionKey) => void;
  folderCardSize: FolderCardSize;
  loadingOverlayVisible: boolean;
  selectedKeys: ReadonlySet<DirectorySelectionKey>;
  selectionMode: boolean;
  serverUrl: string;
  showFolderCovers: boolean;
  viewMode: 'grid' | 'list';
}) => {
  return (
    <div className="folder-content">
      {directory.folders.length > 0 ? (
        <section className="folder-content-section">
          <div className="section-heading">
            <h3>文件夹</h3>
            <span>{directory.folders.length} 个</span>
          </div>
          <div className="folder-list-region">
            <div className={getFolderGridClassName(viewMode, folderCardSize)}>
              {directory.folders.map((folder) => (
                <FolderCard
                  authCode={authCode}
                  cacheEnabled={cacheEnabled}
                  cacheFolder={cacheFolder}
                  folder={folder}
                  key={folder.id || folder.path}
                  onOpenFolder={onOpenFolder}
                  onOpenFolderUpload={onOpenFolderUpload}
                  onRenameFolder={onRenameFolder}
                  onSetFolderCover={onSetFolderCover}
                  onToggleSelection={onToggleSelection}
                  selected={selectedKeys.has(createFolderSelectionKey(folder))}
                  selectionMode={selectionMode}
                  serverUrl={serverUrl}
                  showFolderCovers={showFolderCovers}
                />
              ))}
            </div>
            {loadingOverlayVisible ? <div className="folder-loading-overlay" /> : null}
          </div>
        </section>
      ) : null}

      {directory.files.map((group) => (
        <FileGroup
          authCode={authCode}
          cacheEnabled={cacheEnabled}
          cacheFolder={cacheFolder}
          group={group}
          key={`${group.day}-${group.addr ?? ''}`}
          onPreviewFile={onPreviewFile}
          onToggleSelection={onToggleSelection}
          loadingOverlayVisible={loadingOverlayVisible}
          selectedKeys={selectedKeys}
          selectionMode={selectionMode}
          serverUrl={serverUrl}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
};

const FolderCard = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  folder,
  onOpenFolder,
  onOpenFolderUpload,
  onRenameFolder,
  onSetFolderCover,
  onToggleSelection,
  selected,
  selectionMode,
  serverUrl,
  showFolderCovers,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  folder: FolderSummary;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderUpload: (target: UploadTarget) => void;
  onRenameFolder: (folder: FolderSummary) => void;
  onSetFolderCover: (folder: FolderSummary) => void;
  onToggleSelection: (key: DirectorySelectionKey) => void;
  selected: boolean;
  selectionMode: boolean;
  serverUrl: string;
  showFolderCovers: boolean;
}) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const coverTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const skipNextCoverClickRef = useRef(false);
  const selectionKey = createFolderSelectionKey(folder);
  const folderCoverCacheFolder = useMemo(
    () =>
      createLocalCacheFolderRef({
        folderId: folder.id,
        folderName: folder.name,
        folderPath: folder.path,
        scope: cacheFolder.scope,
      }),
    [cacheFolder.scope, folder.id, folder.name, folder.path],
  );
  const longPressSelection = useMobileLongPressSelection({
    enabled: !selectionMode,
    onLongPress: () => {
      if (!selected) {
        onToggleSelection(selectionKey);
      }
    },
  });
  const cardClassName = [
    'folder-card',
    selected ? 'is-selected' : '',
    selectionMode ? 'is-selecting' : '',
    actionsOpen ? 'is-actions-open' : '',
  ].filter(Boolean).join(' ');
  const coverItems = showFolderCovers
    ? folder.coverHashes
        .map((md5) => ({
          md5,
          url: createThumbnailUrl({ authCode, baseUrl: serverUrl, md5 }),
        }))
        .filter((item): item is { md5: string; url: string } => Boolean(item.url))
    : [];
  const contentCount = folder.childCount + folder.fileCount + folder.trashCount;

  const handleOpenUpload = (): void => {
    setActionsOpen(false);
    onOpenFolderUpload({ folderId: folder.id, name: folder.name, path: folder.path });
  };

  const handleSetCover = (): void => {
    setActionsOpen(false);
    onSetFolderCover(folder);
  };

  const handleRename = (): void => {
    setActionsOpen(false);
    onRenameFolder(folder);
  };

  /** Opens this folder or toggles its selection using the active interaction mode. */
  const handleOpenFolderCard = (): void => {
    if (selectionMode) {
      onToggleSelection(selectionKey);
      return;
    }

    onOpenFolder(folder);
  };

  /** Records the starting touch point so scrolling does not open a folder. */
  const handleCoverTouchStart = (event: ReactTouchEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    const touch = event.touches[0];
    coverTouchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    longPressSelection.handleTouchStart(event);
  };

  /** Cancels long press selection once the finger starts scrolling. */
  const handleCoverTouchMove = (event: ReactTouchEvent<HTMLButtonElement>): void => {
    longPressSelection.handleTouchMove(event);
  };

  /** Opens folders immediately on mobile taps and suppresses the follow-up synthetic click. */
  const handleCoverTouchEnd = (event: ReactTouchEvent<HTMLButtonElement>): void => {
    const longPressTriggered = longPressSelection.handleTouchEnd();
    const startPoint = coverTouchStartRef.current;
    const touch = event.changedTouches[0];
    coverTouchStartRef.current = null;

    if (longPressTriggered) {
      event.preventDefault();
      event.stopPropagation();
      skipNextCoverClickRef.current = true;
      return;
    }

    if (!startPoint || !touch || getTouchMoveDistance(startPoint, touch) > TAP_MOVE_TOLERANCE) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    skipNextCoverClickRef.current = true;
    handleOpenFolderCard();
  };

  /** Keeps desktop clicks working while ignoring the synthetic click after mobile touch. */
  const handleCoverClick = (): void => {
    if (skipNextCoverClickRef.current) {
      skipNextCoverClickRef.current = false;
      return;
    }

    handleOpenFolderCard();
  };

  /** Keeps mobile action taps from being consumed by card and pull-refresh gestures. */
  const stopFolderActionEvent = (event: ReactMouseEvent<HTMLElement> | ReactTouchEvent<HTMLElement>): void => {
    event.stopPropagation();
  };

  /** Opens the mobile actions menu on the first tap. */
  const handleToggleActions = (event: ReactMouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    setActionsOpen((current) => !current);
  };

  const renderFolderActionButtons = () => (
    <>
      <button onClick={handleOpenUpload} type="button">
        上传
      </button>
      <button onClick={handleSetCover} type="button">
        设封面
      </button>
      <button onClick={handleRename} type="button">
        <Pencil size={13} />
        重命名
      </button>
    </>
  );

  useEffect(() => {
    if (!actionsOpen) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      if (cardRef.current?.contains(event.target as Node)) {
        return;
      }

      setActionsOpen(false);
    };

    window.addEventListener('mousedown', handleMouseDown);

    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [actionsOpen]);

  return (
    <article className={cardClassName} ref={cardRef}>
      <button
        aria-pressed={selected}
        className={selected ? 'selection-toggle is-selected' : 'selection-toggle'}
        onClick={() => onToggleSelection(selectionKey)}
        title={selected ? '取消选择' : '选择文件夹'}
        type="button"
      >
        {selected ? <Check size={13} /> : null}
      </button>
      <button
        className="folder-cover"
        onClick={handleCoverClick}
        onTouchCancel={() => {
          coverTouchStartRef.current = null;
          longPressSelection.cancel();
        }}
        onTouchEnd={handleCoverTouchEnd}
        onTouchMove={handleCoverTouchMove}
        onTouchStart={handleCoverTouchStart}
        style={{ '--folder-cover': folder.coverFallback } as CSSProperties}
        type="button"
      >
        <span className="folder-cover__icon">
          <Folder size={22} />
        </span>
        <span className="folder-count">{contentCount}</span>
        {coverItems.length > 0 ? (
          <CoverImageGrid
            cacheEnabled={cacheEnabled}
            cacheFolder={folderCoverCacheFolder}
            items={coverItems}
          />
        ) : null}
      </button>

      <div className="folder-card__body">
        <div>
          <h3 title={folder.name}>{folder.name}</h3>
          <p title={folder.path}>{folder.path}</p>
        </div>
        <div className="folder-card__status-line">
          <span className={folder.trashCount > 0 || folder.status === 'scanning' ? 'tag is-theme' : 'tag'}>
            {folder.trashCount > 0 ? `${folder.trashCount} 回收` : STATUS_COPY[folder.status]}
          </span>
          <div
            className="folder-card__mobile-actions"
            onMouseDown={stopFolderActionEvent}
            onTouchStart={stopFolderActionEvent}
          >
            <button
              aria-expanded={actionsOpen}
              aria-label="更多文件夹操作"
              className="folder-card__actions-toggle"
              onClick={handleToggleActions}
              title="更多操作"
              type="button"
            >
              <MoreHorizontal size={16} />
            </button>
            <div className="folder-card__mobile-actions-menu">{renderFolderActionButtons()}</div>
          </div>
        </div>
      </div>

      <div className="folder-card__meta">
        <span>{folder.childCount} 个子文件夹</span>
        <span>{folder.fileCount} 个文件</span>
      </div>

      <div className="folder-card__actions">
        {renderFolderActionButtons()}
      </div>
    </article>
  );
};

const FileGroup = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  group,
  onPreviewFile,
  onToggleSelection,
  loadingOverlayVisible,
  selectedKeys,
  selectionMode,
  serverUrl,
  viewMode,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  group: FolderFileGroup;
  onPreviewFile: (file: FolderFileSummary) => void;
  onToggleSelection: (key: DirectorySelectionKey) => void;
  loadingOverlayVisible: boolean;
  selectedKeys: ReadonlySet<DirectorySelectionKey>;
  selectionMode: boolean;
  serverUrl: string;
  viewMode: 'grid' | 'list';
}) => {
  return (
    <section className="folder-content-section">
      <div className="section-heading">
        <h3>{group.day}</h3>
        <span>{group.addr ? `${group.addr} · ` : ''}{group.list.length} 个文件</span>
      </div>
      <div className="folder-list-region">
        <div className={viewMode === 'list' ? 'file-grid is-list' : 'file-grid'}>
          {group.list.map((file) => (
            <FileCard
              authCode={authCode}
              cacheEnabled={cacheEnabled}
              cacheFolder={cacheFolder}
              file={file}
              key={file.id || file.md5 || file.name}
              onPreviewFile={onPreviewFile}
              onToggleSelection={onToggleSelection}
              selected={selectedKeys.has(createFileSelectionKey(file))}
              selectionMode={selectionMode}
              serverUrl={serverUrl}
            />
          ))}
        </div>
        {loadingOverlayVisible ? <div className="folder-loading-overlay" /> : null}
      </div>
    </section>
  );
};

const FileCard = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  file,
  onPreviewFile,
  onToggleSelection,
  selected,
  selectionMode,
  serverUrl,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  file: FolderFileSummary;
  onPreviewFile: (file: FolderFileSummary) => void;
  onToggleSelection: (key: DirectorySelectionKey) => void;
  selected: boolean;
  selectionMode: boolean;
  serverUrl: string;
}) => {
  const selectionKey = createFileSelectionKey(file);
  const skipNextFileClickRef = useRef(false);
  const cardClassName = [
    'file-card',
    selected ? 'is-selected' : '',
    selectionMode ? 'is-selecting' : '',
  ].filter(Boolean).join(' ');
  const isVideo = VIDEO_TYPES.has(file.fileType);
  const longPressSelection = useMobileLongPressSelection({
    enabled: !selectionMode,
    onLongPress: () => {
      if (!selected) {
        onToggleSelection(selectionKey);
      }
    },
  });

  /** Opens the file preview or toggles selection using the active interaction mode. */
  const handleOpenFileCard = (): void => {
    if (selectionMode) {
      onToggleSelection(selectionKey);
      return;
    }

    onPreviewFile(file);
  };

  /** Suppresses preview after a long press selection on touch devices. */
  const handleFileTouchEnd = (event: ReactTouchEvent<HTMLButtonElement>): void => {
    if (!longPressSelection.handleTouchEnd()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    skipNextFileClickRef.current = true;
  };

  /** Keeps desktop clicks working while ignoring the synthetic click after mobile long press. */
  const handleFileClick = (): void => {
    if (skipNextFileClickRef.current) {
      skipNextFileClickRef.current = false;
      return;
    }

    handleOpenFileCard();
  };

  return (
    <article className={cardClassName}>
      <button
        aria-pressed={selected}
        className={selected ? 'selection-toggle is-selected' : 'selection-toggle'}
        onClick={() => onToggleSelection(selectionKey)}
        title={selected ? '取消选择' : '选择文件'}
        type="button"
      >
        {selected ? <Check size={13} /> : null}
      </button>
      <button
        aria-pressed={selectionMode ? selected : undefined}
        className="file-card__open"
        onClick={handleFileClick}
        onTouchCancel={longPressSelection.cancel}
        onTouchEnd={handleFileTouchEnd}
        onTouchMove={longPressSelection.handleTouchMove}
        onTouchStart={longPressSelection.handleTouchStart}
        type="button"
      >
        <LazyMediaSlot
          className="file-thumb"
          render={(visible) => (
            <FileThumbnailMedia
              authCode={authCode}
              cacheEnabled={cacheEnabled}
              cacheFolder={cacheFolder}
              file={file}
              serverUrl={serverUrl}
              visible={visible}
            />
          )}
        >
          {isVideo ? <span className="file-play"><Play size={16} /></span> : null}
        </LazyMediaSlot>
        <span className="file-card__body">
          <strong title={file.name}>{file.name}</strong>
          <span>
            {file.fileType}
            {file.sizeLabel ? ` · ${file.sizeLabel}` : ''}
            {file.width && file.height ? ` · ${file.width}x${file.height}` : ''}
          </span>
        </span>
      </button>
    </article>
  );
};

const LazyMediaSlot = ({
  children,
  className,
  render,
}: {
  children?: ReactNode;
  className: string;
  render: (visible: boolean) => ReactNode;
}) => {
  return (
    <InView fallbackInView rootMargin={LAZY_MEDIA_ROOT_MARGIN} triggerOnce>
      {({ inView, ref }) => (
        <span className={className} ref={ref}>
          {render(inView)}
          {children}
        </span>
      )}
    </InView>
  );
};

const FileThumbnailMedia = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  file,
  serverUrl,
  visible,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  file: FolderFileSummary;
  serverUrl: string;
  visible: boolean;
}) => {
  const isVideo = VIDEO_TYPES.has(file.fileType);
  const thumbnailUrl = createThumbnailUrl({
    authCode,
    baseUrl: serverUrl,
    md5: file.md5,
    type: isVideo ? 'poster' : 'h220',
  });
  const thumbnailCache = useCachedMediaUrl({
    enabled: cacheEnabled && visible,
    fileId: file.id,
    folder: cacheFolder,
    kind: 'file-thumbnail',
    md5: file.md5,
    sourceUrl: visible ? thumbnailUrl : undefined,
    variant: isVideo ? 'poster' : 'h220',
  });

  return thumbnailCache.displayUrl ? (
    <img
      alt=""
      loading="lazy"
      onLoad={thumbnailCache.rememberLoadedResource}
      src={thumbnailCache.displayUrl}
    />
  ) : (
    <FileIcon file={file} />
  );
};

export const FileIcon = ({ file }: { file: FolderFileSummary }) => {
  if (file.md5 && !VIDEO_TYPES.has(file.fileType)) {
    return <FileImage size={24} />;
  }
  return <File size={24} />;
};

const CoverImageGrid = ({
  cacheEnabled,
  cacheFolder,
  items,
}: {
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  items: Array<{ md5: string; url: string }>;
}) => {
  return (
    <div className={items.length === 1 ? 'folder-cover-images is-single' : 'folder-cover-images'}>
      {items.map((item) => (
        <CachedImage
          alt=""
          cacheEnabled={cacheEnabled}
          cacheFolder={cacheFolder}
          key={item.url}
          loading="lazy"
          md5={item.md5}
          sourceUrl={item.url}
        />
      ))}
    </div>
  );
};

const CachedImage = ({
  cacheEnabled,
  cacheFolder,
  md5,
  sourceUrl,
  ...imageProps
}: ImgHTMLAttributes<HTMLImageElement> & {
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  md5: string;
  sourceUrl: string;
}) => {
  return (
    <InView fallbackInView rootMargin={LAZY_MEDIA_ROOT_MARGIN} triggerOnce>
      {({ inView, ref }) => (
        <CachedImageContent
          {...imageProps}
          cacheEnabled={cacheEnabled}
          cacheFolder={cacheFolder}
          imageRef={ref}
          md5={md5}
          sourceUrl={sourceUrl}
          visible={inView}
        />
      )}
    </InView>
  );
};

const CachedImageContent = ({
  cacheEnabled,
  cacheFolder,
  imageRef,
  md5,
  sourceUrl,
  visible,
  ...imageProps
}: ImgHTMLAttributes<HTMLImageElement> & {
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  imageRef: Ref<HTMLImageElement>;
  md5: string;
  sourceUrl: string;
  visible: boolean;
}) => {
  const cachedImage = useCachedMediaUrl({
    enabled: cacheEnabled && visible,
    folder: cacheFolder,
    kind: 'folder-cover',
    md5,
    sourceUrl: visible ? sourceUrl : undefined,
    variant: 'h220',
  });

  return (
    <img
      {...imageProps}
      onLoad={(event) => {
        cachedImage.rememberLoadedResource();
        imageProps.onLoad?.(event);
      }}
      ref={imageRef}
      src={visible ? cachedImage.displayUrl : undefined}
    />
  );
};

/** Builds the folder grid class while keeping list mode and size preference independent. */
const getFolderGridClassName = (viewMode: 'grid' | 'list', cardSize: FolderCardSize): string => {
  return viewMode === 'list'
    ? `folder-grid is-${cardSize} is-list`
    : `folder-grid is-${cardSize}`;
};

/**
 * Calculates finger movement between touch start and touch end.
 */
const getTouchMoveDistance = (startPoint: { x: number; y: number }, touch: ReactTouch): number => {
  return Math.hypot(touch.clientX - startPoint.x, touch.clientY - startPoint.y);
};

interface UseMobileLongPressSelectionOptions {
  enabled: boolean;
  onLongPress: () => void;
}

/**
 * Detects mobile long press while cancelling when the user is scrolling.
 */
const useMobileLongPressSelection = ({
  enabled,
  onLongPress,
}: UseMobileLongPressSelectionOptions) => {
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const triggeredRef = useRef(false);

  const cancel = (): void => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    startPointRef.current = null;
  };

  const handleTouchStart = (event: ReactTouchEvent<HTMLElement>): void => {
    if (!enabled) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    cancel();
    triggeredRef.current = false;
    startPointRef.current = { x: touch.clientX, y: touch.clientY };
    timerRef.current = window.setTimeout(() => {
      triggeredRef.current = true;
      timerRef.current = undefined;
      onLongPress();
    }, LONG_PRESS_DELAY_MS);
  };

  const handleTouchMove = (event: ReactTouchEvent<HTMLElement>): void => {
    const startPoint = startPointRef.current;
    const touch = event.touches[0];

    if (!startPoint || !touch || getTouchMoveDistance(startPoint, touch) <= LONG_PRESS_MOVE_TOLERANCE) {
      return;
    }

    cancel();
  };

  const handleTouchEnd = (): boolean => {
    const wasTriggered = triggeredRef.current;

    cancel();
    triggeredRef.current = false;

    return wasTriggered;
  };

  return {
    cancel,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
  };
};
