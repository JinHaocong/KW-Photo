import { AlertTriangle, CheckSquare, ChevronLeft, ChevronRight, Image as ImageIcon, Images, RefreshCw, Square, Trash2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';

import {
  deleteAdminDuplicateFile,
  findAdminDuplicateFiles,
} from '../../services/admin-service';
import type {
  AdminDuplicateFileDeletePayload,
  AdminDuplicateFileRecord,
  AdminGallery,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { createBrowserMediaUrl, createThumbnailUrl } from '../../shared/media-url';
import type { WorkspaceDuplicateFilesPreferences } from '../../shared/workspace-preferences';
import { readAdminPreferences, writeAdminPreferences } from '../../shared/workspace-preferences';
import { Modal } from '../Modal';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500, 1000] as const;
const DELETE_QUEUE_CONCURRENCY = 5;
const AUTO_SELECT_RULES = [
  {
    description: '选中每项重复文件中的第 2-N 个文件',
    label: '按顺序选中',
    value: 'order',
  },
  {
    description: '保留最早修改的文件，选中其余的 2-N 个文件',
    label: '按修改时间选中',
    value: 'mtime',
  },
  {
    description: '保留最早拍摄的文件，选中其余的 2-N 个文件',
    label: '按拍摄时间选中',
    value: 'token_at',
  },
  {
    description: '选中包含关键字的文件',
    label: '按路径选中',
    value: 'path',
  },
] as const;
const AUTO_SELECT_PATH_EXAMPLE = 'IMG_\\d{4}\\.HEIC';

type AutoSelectMode = (typeof AUTO_SELECT_RULES)[number]['value'];
type DuplicatePaginationItem = number | 'ellipsis';

interface AdminDuplicateFilesDialogProps {
  apiOptions: ApiClientOptions;
  authCode?: string;
  galleries: AdminGallery[];
  onClose: () => void;
  onEnsureAuthCode?: () => Promise<string | undefined>;
  onShowToast: (message: string) => void;
  open: boolean;
}

interface DuplicateFileGroup {
  files: AdminDuplicateFileRecord[];
  key: string;
  md5: string;
}

interface AutoSelectOptions {
  mode: AutoSelectMode;
  pathKeyword: string;
  useRegex: boolean;
}

interface DeleteProgress {
  finished: number;
  total: number;
}

interface DuplicateDeleteQueueResult {
  file: AdminDuplicateFileRecord;
  reason?: unknown;
  status: 'fulfilled' | 'rejected';
}

/**
 * Shows duplicate-file scan results in grouped form and supports direct cleanup.
 */
export const AdminDuplicateFilesDialog = ({
  apiOptions,
  authCode,
  galleries,
  onClose,
  onEnsureAuthCode,
  onShowToast,
  open,
}: AdminDuplicateFilesDialogProps) => {
  const initialDuplicateFilesPreferences = useMemo(() => readAdminPreferences().duplicateFiles, []);
  const [actionLoading, setActionLoading] = useState('');
  const [autoSelectError, setAutoSelectError] = useState('');
  const [autoSelectMode, setAutoSelectMode] = useState<AutoSelectMode>(initialDuplicateFilesPreferences.autoSelectMode);
  const [autoSelectOpen, setAutoSelectOpen] = useState(false);
  const [autoSelectPathKeyword, setAutoSelectPathKeyword] = useState('');
  const [autoSelectUseRegex, setAutoSelectUseRegex] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<AdminDuplicateFileRecord[]>([]);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({ finished: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [multiSelect, setMultiSelect] = useState(true);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(initialDuplicateFilesPreferences.pageSize);
  const [resolvedAuthCode, setResolvedAuthCode] = useState(authCode);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [showThumbnails, setShowThumbnails] = useState(initialDuplicateFilesPreferences.showThumbnails);
  const deferredSelectedKeys = useDeferredValue(selectedKeys);
  const [, startSelectionTransition] = useTransition();
  const autoLoadKeyRef = useRef('');
  const virtualListRef = useRef<HTMLDivElement>(null);
  const availableGalleryOptions = useMemo(() => createGalleryOptions(galleries), [galleries]);
  const groups = useMemo(() => createDuplicateFileGroups(files), [files]);
  const sortedGroups = useMemo(() => sortDuplicateFileGroupsBySelection(groups, deferredSelectedKeys), [deferredSelectedKeys, groups]);
  const totalPages = Math.max(1, Math.ceil(sortedGroups.length / pageSize));
  const safePageNo = Math.min(pageNo, totalPages);
  const pagedGroups = useMemo(() => {
    const startIndex = (safePageNo - 1) * pageSize;

    return sortedGroups.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safePageNo, sortedGroups]);
  const paginationItems = useMemo(() => createDuplicatePaginationItems(safePageNo, totalPages), [safePageNo, totalPages]);
  const hasAutoSelectCandidates = pagedGroups.some((group) => group.files.length > 1);
  const groupVirtualizer = useVirtualizer({
    count: pagedGroups.length,
    estimateSize: (index) => estimateDuplicateFileGroupSize(pagedGroups[index], showThumbnails),
    getItemKey: (index) => pagedGroups[index]?.key ?? index,
    getScrollElement: () => virtualListRef.current,
    overscan: 6,
  });
  const selectedFiles = useMemo(() => {
    return files.filter((file) => selectedKeys.has(createDuplicateFileKey(file)));
  }, [files, selectedKeys]);
  const allGallerySelected = availableGalleryOptions.length > 0 && selectedGalleryIds.length === availableGalleryOptions.length;

  /**
   * Persists duplicate-file UI preferences without disturbing other admin preferences.
   */
  const persistDuplicateFilesPreferences = useCallback((preferences: Partial<WorkspaceDuplicateFilesPreferences>): void => {
    writeAdminPreferences({ duplicateFiles: preferences });
  }, []);

  /**
   * Loads duplicate files for the selected gallery ids.
   */
  const loadDuplicateFiles = useCallback(async (targetGalleryIds: number[]): Promise<void> => {
    if (targetGalleryIds.length === 0) {
      setFiles([]);
      setHasChecked(false);
      setError('请先选择要检查的图库。');
      return;
    }

    setError('');
    setHasChecked(false);
    setLoading(true);

    try {
      const duplicateFiles = await findAdminDuplicateFiles(apiOptions, targetGalleryIds);

      setFiles(duplicateFiles);
      setHasChecked(true);
      setPageNo(1);
      setSelectedKeys(new Set());
      onShowToast(duplicateFiles.length > 0 ? `发现 ${duplicateFiles.length} 个重复文件` : '没有发现重复文件');
    } catch (requestError) {
      setFiles([]);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions, onShowToast]);

  useEffect(() => {
    if (!open) {
      autoLoadKeyRef.current = '';
      setActionLoading('');
      setAutoSelectError('');
      setAutoSelectOpen(false);
      setError('');
      setFiles([]);
      setGalleryPickerOpen(false);
      setHasChecked(false);
      setDeleteProgress({ finished: 0, total: 0 });
      setPageNo(1);
      setResolvedAuthCode(authCode);
      setSelectedGalleryIds([]);
      setSelectedKeys(new Set());
      return;
    }

    const defaultGalleryIds = availableGalleryOptions.map((gallery) => gallery.id);
    const autoLoadKey = defaultGalleryIds.join(',');

    // React 开发模式和父组件重渲染都可能让 effect 再跑一次，同一图库范围只自动扫描一次。
    if (autoLoadKeyRef.current === autoLoadKey) {
      return;
    }

    autoLoadKeyRef.current = autoLoadKey;
    setSelectedGalleryIds(defaultGalleryIds);
    void loadDuplicateFiles(defaultGalleryIds);
  }, [availableGalleryOptions, loadDuplicateFiles, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (authCode) {
      setResolvedAuthCode(authCode);
      return;
    }

    if (!onEnsureAuthCode) {
      return;
    }

    let ignore = false;

    void onEnsureAuthCode().then((nextAuthCode) => {
      if (!ignore && nextAuthCode) {
        setResolvedAuthCode(nextAuthCode);
      }
    }).catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [authCode, onEnsureAuthCode, open]);

  useEffect(() => {
    if (pageNo > totalPages) {
      setPageNo(totalPages);
    }
  }, [pageNo, totalPages]);

  useEffect(() => {
    groupVirtualizer.scrollToOffset(0);
  }, [pageNo, pageSize, showThumbnails]);

  /**
   * Selects all galleries, or clears the whole gallery scope when everything is selected.
   */
  const handleToggleAllGalleries = (): void => {
    setSelectedGalleryIds(allGallerySelected ? [] : availableGalleryOptions.map((gallery) => gallery.id));
    resetResultAfterScopeChange();
  };

  /**
   * Toggles one gallery id and clears stale duplicate-file results.
   */
  const handleToggleGallery = (galleryId: number): void => {
    setSelectedGalleryIds((current) => {
      const next = current.includes(galleryId)
        ? current.filter((id) => id !== galleryId)
        : [...current, galleryId];

      return next.sort((first, second) => first - second);
    });
    resetResultAfterScopeChange();
  };

  /**
   * Toggles one duplicate file row while keeping the Set immutable for React.
   */
  const handleToggleFile = (file: AdminDuplicateFileRecord): void => {
    const fileKey = createDuplicateFileKey(file);
    const wasSelected = selectedKeys.has(fileKey);

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(fileKey)) {
        next.delete(fileKey);
      } else {
        next.add(fileKey);
      }

      return next;
    });

    if (!wasSelected) {
      startSelectionTransition(() => setPageNo(1));
    }
  };

  /**
   * Updates page size and stores the choice for the next duplicate-file check.
   */
  const handleChangePageSize = (nextPageSize: (typeof PAGE_SIZE_OPTIONS)[number]): void => {
    setPageSize(nextPageSize);
    setPageNo(1);
    persistDuplicateFilesPreferences({ pageSize: nextPageSize });
  };

  /**
   * Toggles group thumbnails and keeps the display preference persistent.
   */
  const handleToggleThumbnails = (): void => {
    setShowThumbnails((current) => {
      const nextValue = !current;

      persistDuplicateFilesPreferences({ showThumbnails: nextValue });
      return nextValue;
    });
  };

  /**
   * Stores the active one-click selection rule as soon as the user chooses it.
   */
  const handleChangeAutoSelectMode = (mode: AutoSelectMode): void => {
    setAutoSelectMode(mode);
    persistDuplicateFilesPreferences({ autoSelectMode: mode });
  };

  /**
   * Applies the selected one-click rule to the current page of duplicate groups.
   */
  const handleApplyAutoSelect = (): void => {
    const result = createAutoSelectedFiles(pagedGroups, {
      mode: autoSelectMode,
      pathKeyword: autoSelectPathKeyword,
      useRegex: autoSelectUseRegex,
    });

    if (result.error) {
      setAutoSelectError(result.error);
      return;
    }

    setSelectedKeys((current) => {
      const next = new Set(current);

      result.files.forEach((file) => next.add(createDuplicateFileKey(file)));

      return next;
    });
    startSelectionTransition(() => setPageNo(1));
    setAutoSelectError('');
    setAutoSelectOpen(false);
    onShowToast(`已选中 ${result.files.length} 个重复文件`);
  };

  /**
   * Deletes one or more duplicate file records and removes successful rows locally.
   */
  const handleDeleteFiles = async (targets: AdminDuplicateFileRecord[]): Promise<void> => {
    const deletableTargets = targets.filter((file) => getDuplicateFileDeletePayload(file, selectedGalleryIds));

    if (deletableTargets.length === 0) {
      onShowToast('缺少重复文件 ID 或 MD5，无法删除');
      return;
    }

    if (!window.confirm(`确定删除 ${deletableTargets.length} 个重复文件吗？文件会直接从服务端删除。`)) {
      return;
    }

    setActionLoading('delete');
    setDeleteProgress({ finished: 0, total: deletableTargets.length });
    setError('');

    try {
      const results = await runDuplicateFileDeleteQueue({
        apiOptions,
        files: deletableTargets,
        galleryIds: selectedGalleryIds,
        onProgress: (finished) => setDeleteProgress({ finished, total: deletableTargets.length }),
      });
      const deletedKeys = new Set<string>();

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          deletedKeys.add(createDuplicateFileKey(result.file));
        }
      });

      setFiles((current) => current.filter((file) => !deletedKeys.has(createDuplicateFileKey(file))));
      setSelectedKeys((current) => new Set([...current].filter((key) => !deletedKeys.has(key))));

      const failedCount = results.length - deletedKeys.size;

      if (failedCount > 0) {
        setError(`已删除 ${deletedKeys.size} 个，${failedCount} 个删除失败，请刷新后重试。`);
      }

      onShowToast(failedCount > 0 ? `已删除 ${deletedKeys.size} 个，${failedCount} 个失败` : `已删除 ${deletedKeys.size} 个重复文件`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
      setDeleteProgress({ finished: 0, total: 0 });
    }
  };

  const resetResultAfterScopeChange = (): void => {
    setError('');
    setFiles([]);
    setHasChecked(false);
    setPageNo(1);
    setSelectedKeys(new Set());
  };

  return (
    <>
      <Modal
      className="admin-duplicate-files-dialog"
      onClose={onClose}
      open={open}
      title={(
        <div className="admin-duplicate-files-title">
          <span className="admin-duplicate-files-title__icon">
            <CheckSquare size={18} />
          </span>
          <div>
            <h2>检查重复文件</h2>
            <p>按图库范围检查 MD5 重复文件；每组默认保留第一条，批量选择会选中其余重复项。</p>
          </div>
        </div>
      )}
    >
      <section className="admin-duplicate-files-overview">
        <div>
          <strong>{loading ? '-' : groups.length}</strong>
          <span>{loading ? '正在读取' : '组重复文件'}</span>
        </div>
        <div>
          <strong>{files.length}</strong>
          <span>个文件</span>
        </div>
        <div>
          <strong>{selectedFiles.length}</strong>
          <span>个已选择</span>
        </div>
      </section>

      <section className="admin-duplicate-files-warning">
        <AlertTriangle size={16} />
        <span>删除前建议先完成一次图库扫描并确认文件备份；删除按钮会直接调用服务端清理接口。</span>
      </section>

      <section className="admin-duplicate-files-topbar" aria-label="重复文件操作">
        <button
          aria-label="刷新重复文件"
          className="secondary-btn admin-duplicate-files-icon-button"
          disabled={loading || selectedGalleryIds.length === 0}
          onClick={() => void loadDuplicateFiles(selectedGalleryIds)}
          title="刷新重复文件"
          type="button"
        >
          <RefreshCw size={15} />
        </button>
        <button className="secondary-btn" disabled={!multiSelect || !hasAutoSelectCandidates} onClick={() => setAutoSelectOpen(true)} type="button">
          <CheckSquare size={15} />
          一键选中
        </button>
        <button
          className="secondary-btn is-danger-soft"
          disabled={!multiSelect || actionLoading === 'delete' || selectedFiles.length === 0}
          onClick={() => void handleDeleteFiles(selectedFiles)}
          type="button"
        >
          <Trash2 size={15} />
          {actionLoading === 'delete' ? formatDeleteProgress(deleteProgress) : `批量删除 (${selectedFiles.length})`}
        </button>
        <label className="admin-duplicate-files-switch">
          <input checked={multiSelect} onChange={(event) => setMultiSelect(event.target.checked)} type="checkbox" />
          <span>多选模式</span>
        </label>
        <button className="secondary-btn" onClick={handleToggleThumbnails} type="button">
          <Images size={15} />
          {showThumbnails ? '隐藏缩略图' : '显示缩略图'}
        </button>
        <div className="admin-duplicate-files-pagination" aria-label="分页">
          <button disabled={safePageNo <= 1} onClick={() => setPageNo((current) => Math.max(1, current - 1))} type="button">
            <ChevronLeft size={15} />
          </button>
          {paginationItems.map((item, index) => (
            item === 'ellipsis' ? (
              <span className="admin-duplicate-files-pagination__ellipsis" key={`ellipsis-${index}`}>...</span>
            ) : (
              <button
                className={item === safePageNo ? 'is-current' : ''}
                key={item}
                onClick={() => setPageNo(item)}
                type="button"
              >
                {item}
              </button>
            )
          ))}
          <button disabled={safePageNo >= totalPages} onClick={() => setPageNo((current) => Math.min(totalPages, current + 1))} type="button">
            <ChevronRight size={15} />
          </button>
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(event) => {
              handleChangePageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </section>

      <section className={`admin-duplicate-files-table-head${showThumbnails ? '' : ' is-thumbnail-hidden'}`}>
        <button className="secondary-btn" onClick={() => setGalleryPickerOpen((current) => !current)} type="button">
          选择图库
        </button>
        <span>路径</span>
        <span>图库</span>
        <span>操作</span>
      </section>

      {galleryPickerOpen ? (
        <section className="admin-duplicate-files-gallery-picker" aria-label="选择检查图库">
          <div className="admin-duplicate-files-gallery-picker__header">
            <div>
              <strong>选择图库</strong>
              <span>查看选中的图库中，是否有 MD5 值重复的文件。</span>
            </div>
            <div>
              <button className="secondary-btn" onClick={handleToggleAllGalleries} type="button">
                {allGallerySelected ? '取消全选' : '全选'}
              </button>
              <button
                className="secondary-btn"
                disabled={availableGalleryOptions.length === 0}
                onClick={() => {
                  const selectedSet = new Set(selectedGalleryIds);
                  const nextIds = availableGalleryOptions.filter((gallery) => !selectedSet.has(gallery.id)).map((gallery) => gallery.id);

                  setSelectedGalleryIds(nextIds);
                  resetResultAfterScopeChange();
                }}
                type="button"
              >
                反选
              </button>
              <button
                className="primary-btn"
                disabled={loading || selectedGalleryIds.length === 0}
                onClick={() => {
                  setGalleryPickerOpen(false);
                  void loadDuplicateFiles(selectedGalleryIds);
                }}
                type="button"
              >
                确定
              </button>
            </div>
          </div>
          <div className="admin-duplicate-files-gallery-grid">
            {availableGalleryOptions.map((gallery) => {
              const selected = selectedGalleryIds.includes(gallery.id);

              return (
                <button
                  className={`admin-duplicate-files-gallery-chip${selected ? ' is-active' : ''}`}
                  key={gallery.id}
                  onClick={() => handleToggleGallery(gallery.id)}
                  type="button"
                >
                  {selected ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span title={`${gallery.name} · ${gallery.path}`}>{gallery.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? <div className="admin-state">正在检查重复文件...</div> : null}
      {!loading && !error && !hasChecked ? <div className="admin-state">选择图库后点击“确定”，获取重复文件。</div> : null}
      {!loading && !error && hasChecked && groups.length === 0 ? <div className="admin-state">无重复文件。</div> : null}

      {pagedGroups.length > 0 ? (
        <div className="admin-duplicate-files-table-wrap">
          <div
            className={`admin-duplicate-files-virtual-list${showThumbnails ? '' : ' is-thumbnail-hidden'}`}
            ref={virtualListRef}
            role="list"
          >
            <div className="admin-duplicate-files-virtual-spacer" style={{ height: groupVirtualizer.getTotalSize() }}>
              {groupVirtualizer.getVirtualItems().map((virtualItem) => {
                const group = pagedGroups[virtualItem.index];

                if (!group) {
                  return null;
                }

                const groupSelectedCount = countSelectedFilesInGroup(group, selectedKeys);
                const groupSelected = groupSelectedCount > 0;
                const thumbnailUrl = createDuplicateFileThumbnailUrl({
                  authCode: resolvedAuthCode,
                  baseUrl: apiOptions.baseUrl,
                  file: group.files[0],
                });

                return (
                  <section
                    className="admin-duplicate-files-virtual-row"
                    data-index={virtualItem.index}
                    key={virtualItem.key}
                    ref={groupVirtualizer.measureElement}
                    role="listitem"
                    style={{ transform: `translateY(${virtualItem.start}px)` }}
                  >
                    <article className={`admin-duplicate-files-group-card${showThumbnails ? '' : ' is-thumbnail-hidden'}${groupSelected ? ' is-selected-group' : ''}`}>
                      <aside className="admin-duplicate-files-group-card__summary">
                        {showThumbnails ? (
                          <span className="admin-duplicate-files-preview" title={`MD5:${group.md5}`}>
                            {thumbnailUrl ? <img alt="" src={thumbnailUrl} /> : <ImageIcon size={24} />}
                            <em>{group.files.length}</em>
                          </span>
                        ) : (
                          <span className="admin-duplicate-files-group-marker" title={`MD5:${group.md5}`}>
                            <strong>{group.files.length}</strong>
                            <small>{groupSelectedCount > 0 ? '已选' : '文件'}</small>
                          </span>
                        )}
                        <span className="admin-duplicate-files-group-copy">
                          <strong>{group.files.length} 个文件</strong>
                          <small>{groupSelectedCount > 0 ? `${groupSelectedCount} 个已选` : 'MD5 重复组'}</small>
                        </span>
                      </aside>

                      <div className="admin-duplicate-files-group-card__rows">
                        {group.files.map((file, index) => {
                          const fileKey = createDuplicateFileKey(file);
                          const checked = selectedKeys.has(fileKey);
                          const canDelete = Boolean(getDuplicateFileDeletePayload(file, selectedGalleryIds));

                          return (
                            <div className={`admin-duplicate-files-file-row${checked ? ' is-selected' : ''}`} key={fileKey}>
                              <div className="admin-duplicate-files-path-cell">
                                {multiSelect ? (
                                  <input
                                    aria-label={`选择 ${file.fileName}`}
                                    checked={checked}
                                    onChange={() => handleToggleFile(file)}
                                    type="checkbox"
                                  />
                                ) : null}
                                <span title={file.filePath}>
                                  <strong>{formatDuplicateFilePath(file)}</strong>
                                  <small>{formatDuplicateFileMeta(file, index)}</small>
                                </span>
                              </div>
                              <div className="admin-duplicate-files-gallery-cell">{file.galleryIds.join(', ') || '-'}</div>
                              <div className="admin-duplicate-files-action-cell">
                                <button
                                  className="secondary-btn is-danger-soft"
                                  disabled={!canDelete || actionLoading === 'delete'}
                                  onClick={() => void handleDeleteFiles([file])}
                                  type="button"
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
      </Modal>

      <Modal
        asForm
        className="admin-duplicate-files-select-dialog"
        footer={(
          <button className="primary-btn" type="submit">
            确定
          </button>
        )}
        onClose={() => {
          setAutoSelectError('');
          setAutoSelectOpen(false);
        }}
        onSubmit={handleApplyAutoSelect}
        open={autoSelectOpen}
        title="一键选中"
      >
        <div className="admin-duplicate-files-select-options">
          {AUTO_SELECT_RULES.map((rule) => (
            <label className={`admin-duplicate-files-select-option${autoSelectMode === rule.value ? ' is-active' : ''}`} key={rule.value}>
              <input
                checked={autoSelectMode === rule.value}
                name="duplicate-auto-select-mode"
                onChange={() => {
                  setAutoSelectError('');
                  handleChangeAutoSelectMode(rule.value);
                }}
                type="radio"
                value={rule.value}
              />
              <span>
                <strong>{rule.label}</strong>
                <small>{rule.description}</small>
              </span>
            </label>
          ))}
        </div>

        {autoSelectMode === 'path' ? (
          <section className="admin-duplicate-files-path-rule">
            <label>
              <span>关键字</span>
              <input
                autoFocus
                onChange={(event) => {
                  setAutoSelectError('');
                  setAutoSelectPathKeyword(event.target.value);
                }}
                placeholder="输入文件路径或文件名关键字"
                value={autoSelectPathKeyword}
              />
            </label>
            <label className="admin-duplicate-files-switch">
              <input
                checked={autoSelectUseRegex}
                onChange={(event) => {
                  setAutoSelectError('');
                  setAutoSelectUseRegex(event.target.checked);
                }}
                type="checkbox"
              />
              <span>开启正则匹配</span>
            </label>
            <button
              className="secondary-btn"
              onClick={() => {
                setAutoSelectPathKeyword(AUTO_SELECT_PATH_EXAMPLE);
                setAutoSelectUseRegex(true);
                setAutoSelectError('');
              }}
              type="button"
            >
              举例：如果要匹配 IMG_0131.HEIC，那么可以输入 {AUTO_SELECT_PATH_EXAMPLE}
            </button>
          </section>
        ) : null}

        {autoSelectError ? <div className="admin-error">{autoSelectError}</div> : null}
      </Modal>
    </>
  );
};

const createDuplicateFileKey = (file: AdminDuplicateFileRecord): string => {
  return `${file.id}-${file.md5}-${file.filePath}`;
};

const createDuplicateFileGroups = (files: AdminDuplicateFileRecord[]): DuplicateFileGroup[] => {
  const groupMap = new Map<string, AdminDuplicateFileRecord[]>();

  files.forEach((file) => {
    const groupKey = file.md5 || `file-${file.id}`;
    const current = groupMap.get(groupKey) ?? [];

    current.push(file);
    groupMap.set(groupKey, current);
  });

  return [...groupMap.entries()].map(([md5, groupFiles]) => ({
    files: groupFiles,
    key: md5,
    md5,
  }));
};

/**
 * Moves groups containing selected rows to the top while keeping each bucket stable.
 */
const sortDuplicateFileGroupsBySelection = (
  groups: DuplicateFileGroup[],
  selectedKeys: Set<string>,
): DuplicateFileGroup[] => {
  if (selectedKeys.size === 0) {
    return groups;
  }

  return groups
    .map((group, index) => ({
      group,
      index,
      selected: group.files.some((file) => selectedKeys.has(createDuplicateFileKey(file))),
    }))
    .sort((first, second) => Number(second.selected) - Number(first.selected) || first.index - second.index)
    .map((entry) => entry.group);
};

/**
 * Counts selected rows in one group for group-level highlighting and badges.
 */
const countSelectedFilesInGroup = (group: DuplicateFileGroup, selectedKeys: Set<string>): number => {
  return group.files.reduce((total, file) => total + (selectedKeys.has(createDuplicateFileKey(file)) ? 1 : 0), 0);
};

/**
 * Estimates virtual group height from row count; real DOM measurement corrects long wrapped paths.
 */
const estimateDuplicateFileGroupSize = (group: DuplicateFileGroup | undefined, showThumbnails: boolean): number => {
  if (!group) {
    return 96;
  }

  const rowHeight = showThumbnails ? 72 : 64;

  return Math.max(96, group.files.length * rowHeight + 14);
};

const createGalleryOptions = (galleries: AdminGallery[]): Array<{ id: number; name: string; path: string }> => {
  return galleries
    .map((gallery) => {
      const id = Number(gallery.id);

      if (!Number.isFinite(id) || id <= 0) {
        return undefined;
      }

      return {
        id,
        name: gallery.name,
        path: gallery.path,
      };
    })
    .filter((gallery): gallery is { id: number; name: string; path: string } => Boolean(gallery));
};

/**
 * Creates a compact page-number window for duplicate-file pagination.
 */
const createDuplicatePaginationItems = (
  currentPage: number,
  totalPages: number,
): DuplicatePaginationItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = new Set<number>([1, totalPages]);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  for (let page = start; page <= end; page += 1) {
    items.add(page);
  }

  const pages = [...items].sort((first, second) => first - second);
  const result: DuplicatePaginationItem[] = [];

  pages.forEach((page, index) => {
    const previousPage = pages[index - 1];

    if (previousPage && page - previousPage > 1) {
      result.push('ellipsis');
    }

    result.push(page);
  });

  return result;
};

/**
 * Creates selected duplicate rows from the one-click rule without mutating the source groups.
 */
const createAutoSelectedFiles = (
  groups: DuplicateFileGroup[],
  options: AutoSelectOptions,
): { error?: string; files: AdminDuplicateFileRecord[] } => {
  if (options.mode === 'path') {
    return createPathMatchedFiles(groups, options.pathKeyword, options.useRegex);
  }

  const files = groups.flatMap((group) => {
    if (group.files.length <= 1) {
      return [];
    }

    if (options.mode === 'order') {
      return group.files.slice(1);
    }

    const dateField = options.mode === 'mtime' ? 'modifiedAt' : 'takenAt';

    // 先稳定排序，再跳过最早时间项，避免接口顺序变化导致保留对象不一致。
    return sortDuplicateFilesByDate(group.files, dateField).slice(1);
  });

  return files.length > 0 ? { files } : { error: '当前页没有可选中的重复文件。', files: [] };
};

/**
 * Selects files whose path or filename matches the user-provided keyword rule.
 */
const createPathMatchedFiles = (
  groups: DuplicateFileGroup[],
  keyword: string,
  useRegex: boolean,
): { error?: string; files: AdminDuplicateFileRecord[] } => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return { error: '请输入路径关键字。', files: [] };
  }

  let matcher: (value: string) => boolean;

  if (useRegex) {
    try {
      const expression = new RegExp(trimmedKeyword);

      matcher = (value) => expression.test(value);
    } catch {
      return { error: '正则表达式格式不正确。', files: [] };
    }
  } else {
    matcher = (value) => value.includes(trimmedKeyword);
  }

  const files = groups
    .flatMap((group) => group.files)
    .filter((file) => matcher(`${file.filePath} ${file.fileName}`));

  return files.length > 0 ? { files } : { error: '当前页没有匹配关键字的重复文件。', files: [] };
};

/**
 * Sorts duplicate files by a date field while keeping invalid dates behind valid dates.
 */
const sortDuplicateFilesByDate = (
  files: AdminDuplicateFileRecord[],
  field: 'modifiedAt' | 'takenAt',
): AdminDuplicateFileRecord[] => {
  return files
    .map((file, index) => ({
      file,
      index,
      timestamp: parseDuplicateFileTimestamp(file[field]),
    }))
    .sort((first, second) => first.timestamp - second.timestamp || first.index - second.index)
    .map((entry) => entry.file);
};

/**
 * Parses backend date strings and pushes missing values to the end of date sorting.
 */
const parseDuplicateFileTimestamp = (value?: string): number => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

/**
 * Deletes files through a small worker queue so bulk cleanup does not spike request concurrency.
 */
const runDuplicateFileDeleteQueue = async ({
  apiOptions,
  files,
  galleryIds,
  onProgress,
}: {
  apiOptions: ApiClientOptions;
  files: AdminDuplicateFileRecord[];
  galleryIds: number[];
  onProgress?: (finished: number) => void;
}): Promise<DuplicateDeleteQueueResult[]> => {
  const results: DuplicateDeleteQueueResult[] = new Array(files.length);
  let cursor = 0;
  let finished = 0;

  const runWorker = async (): Promise<void> => {
    while (cursor < files.length) {
      const index = cursor;
      const file = files[index];

      cursor += 1;

      try {
        const payload = getDuplicateFileDeletePayload(file, galleryIds);

        if (!payload) {
          throw new Error('缺少重复文件删除参数');
        }

        await deleteAdminDuplicateFile(apiOptions, payload);
        results[index] = { file, status: 'fulfilled' };
      } catch (reason) {
        results[index] = { file, reason, status: 'rejected' };
      } finally {
        finished += 1;
        onProgress?.(finished);
      }
    }
  };

  await Promise.all(Array.from(
    { length: Math.min(DELETE_QUEUE_CONCURRENCY, files.length) },
    () => runWorker(),
  ));

  return results;
};

/**
 * Builds the cleanup payload with the current selected gallery scope.
 */
const getDuplicateFileDeletePayload = (
  file: AdminDuplicateFileRecord,
  selectedGalleryIds: number[],
): AdminDuplicateFileDeletePayload | undefined => {
  const galleryIds = selectedGalleryIds;

  if (file.id <= 0 || !file.md5 || galleryIds.length === 0) {
    return undefined;
  }

  return {
    galleryIds,
    id: file.id,
    md5: file.md5,
  };
};

/**
 * Formats queue progress for the destructive batch button.
 */
const formatDeleteProgress = (progress: DeleteProgress): string => {
  if (progress.total <= 0) {
    return '删除中';
  }

  return `删除中 ${progress.finished}/${progress.total}`;
};

const formatDuplicateFilePath = (file: AdminDuplicateFileRecord): string => {
  return file.filePath || file.fileName || '-';
};

const formatDuplicateFileMeta = (file: AdminDuplicateFileRecord, index: number): string => {
  const time = file.takenAt || file.modifiedAt;
  const formattedTime = time ? time.replace('T', ' ').slice(0, 19) : '-';
  const prefix = index === 0 ? '保留参考' : '重复项';

  return `${prefix} · 修改时间：${formattedTime} · ${formatBytes(file.size)}`;
};

/**
 * Builds the first-file thumbnail used as the visual group marker.
 */
const createDuplicateFileThumbnailUrl = ({
  authCode,
  baseUrl,
  file,
}: {
  authCode?: string;
  baseUrl: string;
  file: AdminDuplicateFileRecord;
}): string | undefined => {
  return createBrowserMediaUrl(createThumbnailUrl({
    authCode,
    baseUrl,
    md5: file.md5,
    type: 'h220',
  }));
};

const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);

  return `${(size / 1024 ** unitIndex).toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};
