import { AlertTriangle, Download, HelpCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createAdminMaintenanceTask,
  exportAdminDeletedFiles,
  fetchAdminDeletedFiles,
} from '../../services/admin-service';
import type {
  AdminDeletedFileGroup,
  AdminDeletedFileRecord,
  AdminDeletedFilesResult,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { Modal } from '../Modal';

interface AdminDeletedFilesDialogProps {
  apiOptions: ApiClientOptions;
  onClose: () => void;
  onShowToast: (message: string) => void;
  open: boolean;
}

const DELETED_FILE_GROUP_ROW_HEIGHT = 64;
const DELETED_FILE_ROW_HEIGHT = 96;

interface DeletedFilesDateShortcut {
  count: number;
  date: string;
  label: string;
  rowIndex: number;
  year: string;
}

interface DeletedFilesDateShortcutGroup {
  count: number;
  firstRowIndex: number;
  shortcuts: DeletedFilesDateShortcut[];
  year: string;
}

type DeletedFilesVirtualRow =
  | {
      group: AdminDeletedFileGroup;
      key: string;
      type: 'group';
    }
  | {
      file: AdminDeletedFileRecord;
      key: string;
      type: 'file';
    };

/**
 * Shows abnormal files in-place, matching the demo data contract without leaving the admin page.
 */
export const AdminDeletedFilesDialog = ({
  apiOptions,
  onClose,
  onShowToast,
  open,
}: AdminDeletedFilesDialogProps) => {
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [expandedDateYears, setExpandedDateYears] = useState<Set<string>>(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminDeletedFilesResult>();
  const virtualListRef = useRef<HTMLDivElement>(null);

  /**
   * Loads abnormal files through /gallery/findDeletedFiles.
   */
  const loadDeletedFiles = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      setResult(await fetchAdminDeletedFiles(apiOptions));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
      setResult(undefined);
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (!open) {
      setExpandedDateYears(new Set());
      setHelpOpen(false);
      return;
    }

    void loadDeletedFiles();
  }, [loadDeletedFiles, open]);

  /**
   * Submits the same cleanup task used by the demo page.
   */
  const handleCleanDeletedFiles = async (): Promise<void> => {
    if (!window.confirm('确定删除这些文件的缩略图及相关数据吗？')) {
      return;
    }

    setActionLoading('clean');

    try {
      await createAdminMaintenanceTask(apiOptions, 'cleanGarbageData');
      onShowToast('清理任务提交成功，请关注后台任务信息');
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
    }
  };

  /**
   * Starts the server-side export for JPG previews of abnormal files.
   */
  const handleExportDeletedFiles = async (): Promise<void> => {
    setActionLoading('export');

    try {
      const payload = await exportAdminDeletedFiles(apiOptions);
      const targetFolderPath = readExportTargetFolderPath(payload);

      onShowToast(targetFolderPath ? `导出任务已提交：${targetFolderPath}` : '导出任务已提交');
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
    }
  };

  const groups = result?.groups ?? [];
  const totalCount = result?.totalCount ?? 0;
  const empty = !loading && !error && totalCount === 0;
  const virtualRows = useMemo(() => createDeletedFilesVirtualRows(groups), [groups]);
  const dateShortcutGroups = useMemo(() => createDeletedFileDateShortcutGroups(groups), [groups]);
  const hasDateShortcutRail = dateShortcutGroups.some((group) => group.shortcuts.length > 0);
  const rowVirtualizer = useVirtualizer({
    count: virtualRows.length,
    estimateSize: (index) => (
      virtualRows[index]?.type === 'group'
        ? DELETED_FILE_GROUP_ROW_HEIGHT
        : DELETED_FILE_ROW_HEIGHT
    ),
    getItemKey: (index) => virtualRows[index]?.key ?? index,
    getScrollElement: () => virtualListRef.current,
    overscan: 8,
  });

  useEffect(() => {
    rowVirtualizer.scrollToOffset(0);
    setExpandedDateYears(new Set());
  }, [result]);

  /**
   * Jumps the virtualized list to one abnormal-file date group.
   */
  const handleJumpToDeletedFileDate = (shortcut: DeletedFilesDateShortcut): void => {
    rowVirtualizer.scrollToIndex(shortcut.rowIndex, { align: 'start' });
  };

  /**
   * Expands or collapses one year inside the date jump rail.
   */
  const handleToggleDeletedFileYear = (year: string): void => {
    setExpandedDateYears((current) => {
      const next = new Set(current);

      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }

      return next;
    });
  };

  return (
    <Modal
      className="admin-deleted-files-dialog"
      onClose={onClose}
      open={open}
      title={(
        <div className="admin-deleted-files-title">
          <span className="admin-deleted-files-title__icon">
            <AlertTriangle size={18} />
          </span>
          <div>
            <h2>状态异常文件</h2>
            <p>扫描图库时原始文件已不存在，但数据库仍保留记录的文件。</p>
          </div>
        </div>
      )}
    >
      <section className="admin-deleted-files-overview">
        <div className="admin-deleted-files-overview__copy">
          <strong>异常文件概览</strong>
          <span>先确认目录挂载和路径映射是否正常，再执行清理任务。</span>
        </div>
        <div className="admin-deleted-files-overview__count">
          <strong>{loading ? '-' : totalCount}</strong>
          <span>{loading ? '正在读取' : '个文件'}</span>
        </div>
      </section>

      <section className="admin-deleted-files-actions" aria-label="状态异常文件操作">
        <button className="secondary-btn" disabled={loading} onClick={() => void loadDeletedFiles()} type="button">
          <RefreshCw size={15} />
          刷新
        </button>
        <button
          className="secondary-btn"
          disabled={actionLoading === 'export' || totalCount === 0}
          onClick={() => void handleExportDeletedFiles()}
          type="button"
        >
          <Download size={15} />
          {actionLoading === 'export' ? '提交中' : '导出 JPG 压缩图'}
        </button>
        <button
          aria-pressed={helpOpen}
          className={`secondary-btn${helpOpen ? ' is-active' : ''}`}
          onClick={() => setHelpOpen((current) => !current)}
          type="button"
        >
          <HelpCircle size={15} />
          {helpOpen ? '收起说明' : '说明'}
        </button>
        <button
          className="secondary-btn is-danger-soft"
          disabled={actionLoading === 'clean' || totalCount === 0}
          onClick={() => void handleCleanDeletedFiles()}
          type="button"
        >
          <Trash2 size={15} />
          {actionLoading === 'clean' ? '提交中' : '清理异常文件'}
        </button>
      </section>

      {helpOpen ? (
        <section className="admin-deleted-files-help-inline">
          <p>扫描图库过程中，如果照片文件已经不存在，MT Photos 会把这个文件标记为异常文件。</p>
          <p>系统不会立即删除缩略图和数据，是为了兼顾目录挂载失败、目录未映射、位置变更等临时异常。</p>
          <p>确认这些文件确实已删除后，再执行清理任务删除对应缩略图及相关数据。</p>
        </section>
      ) : null}

      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? <div className="admin-state">正在读取状态异常文件...</div> : null}
      {empty ? <div className="admin-state">当前没有状态异常文件。</div> : null}

      {virtualRows.length > 0 ? (
        <div className="admin-deleted-file-list-shell">
          <div className="admin-deleted-file-virtual-list" ref={virtualListRef} role="list">
            <div className="admin-deleted-file-virtual-spacer" style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const row = virtualRows[virtualItem.index];

                if (!row) {
                  return null;
                }

                return (
                  <div
                    className="admin-deleted-file-virtual-row"
                    key={virtualItem.key}
                    style={{ height: virtualItem.size, transform: `translateY(${virtualItem.start}px)` }}
                  >
                    {row.type === 'group' ? <DeletedFileGroupHeader group={row.group} /> : <DeletedFileRow file={row.file} />}
                  </div>
                );
              })}
            </div>
          </div>
          {hasDateShortcutRail ? (
            <DeletedFileDateRail
              expandedYears={expandedDateYears}
              groups={dateShortcutGroups}
              onJump={handleJumpToDeletedFileDate}
              onToggleYear={handleToggleDeletedFileYear}
            />
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
};

const DeletedFileDateRail = ({
  expandedYears,
  groups,
  onJump,
  onToggleYear,
}: {
  expandedYears: Set<string>;
  groups: DeletedFilesDateShortcutGroup[];
  onJump: (shortcut: DeletedFilesDateShortcut) => void;
  onToggleYear: (year: string) => void;
}) => {
  return (
    <aside aria-label="按日期跳转" className="admin-deleted-file-date-rail">
      {groups.map((group) => {
        const expanded = expandedYears.has(group.year);

        return (
          <div className="admin-deleted-file-date-rail__group" key={group.year}>
            <button
              aria-expanded={expanded}
              className={`admin-deleted-file-date-rail__year-toggle${expanded ? ' is-expanded' : ''}`}
              onClick={() => onToggleYear(group.year)}
              title={`${expanded ? '收起' : '展开'} ${group.year} · ${group.count} 个文件`}
              type="button"
            >
              <span className="admin-deleted-file-date-rail__year">{group.year}</span>
              <span aria-hidden="true" className="admin-deleted-file-date-rail__year-action">
                {expanded ? '-' : '+'}
              </span>
            </button>

            {expanded ? group.shortcuts.map((shortcut) => (
              <button
                className="admin-deleted-file-date-rail__date"
                key={`${shortcut.date}-${shortcut.rowIndex}`}
                onClick={() => onJump(shortcut)}
                title={`${shortcut.date} · ${shortcut.count} 个文件`}
                type="button"
              >
                <span className="admin-deleted-file-date-rail__dot" />
                <span className="admin-deleted-file-date-rail__label">{shortcut.label}</span>
              </button>
            )) : null}
          </div>
        );
      })}
    </aside>
  );
};

const DeletedFileGroupHeader = ({ group }: { group: AdminDeletedFileGroup }) => {
  return (
    <section className="admin-deleted-file-group-header">
      <strong>{group.day}</strong>
      <span>{group.list.length} 个文件{group.addr ? ` · ${group.addr}` : ''}</span>
    </section>
  );
};

const DeletedFileRow = ({ file }: { file: AdminDeletedFileRecord }) => {
  const filePath = getVisibleDeletedFilePath(file.filePath);

  return (
    <article className="admin-table-row admin-deleted-file-row">
      <div className="admin-table-row__main">
        <strong title={file.fileName}>
          <AlertTriangle size={15} />
          {file.fileName}
        </strong>
        {filePath ? <span title={filePath}>{filePath}</span> : null}
      </div>
      <div className="admin-table-row__meta">
        <span>ID {file.id || '-'}</span>
        <span title={file.md5}>{file.md5 || '-'}</span>
      </div>
    </article>
  );
};

/**
 * Hides placeholder paths returned by the abnormal-file endpoint.
 */
const getVisibleDeletedFilePath = (filePath: string): string => {
  const normalizedPath = filePath.trim();

  return normalizedPath && normalizedPath !== '-' ? normalizedPath : '';
};

/**
 * Builds date jump targets that match the flattened virtual-row indexes.
 */
function createDeletedFileDateShortcutGroups(groups: AdminDeletedFileGroup[]): DeletedFilesDateShortcutGroup[] {
  const groupMap = new Map<string, DeletedFilesDateShortcutGroup>();
  let rowIndex = 0;

  groups.forEach((group) => {
    const year = readDeletedFileDateYear(group.day);
    const shortcut: DeletedFilesDateShortcut = {
      count: group.list.length,
      date: group.day,
      label: formatDeletedFileDateShortcutLabel(group.day),
      rowIndex,
      year,
    };
    const shortcutGroup = groupMap.get(year) ?? {
      count: 0,
      firstRowIndex: rowIndex,
      shortcuts: [],
      year,
    };

    shortcutGroup.count += group.list.length;
    shortcutGroup.shortcuts.push(shortcut);
    groupMap.set(year, shortcutGroup);

    rowIndex += group.list.length + 1;
  });

  return Array.from(groupMap.values());
}

function readDeletedFileDateYear(date: string): string {
  return date.match(/^\d{4}/)?.[0] ?? date;
}

function formatDeletedFileDateShortcutLabel(date: string): string {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);

  return match ? `${match[1]}-${match[2]}` : date;
}

/**
 * Flattens grouped abnormal files into positioned rows for fixed-height virtual rendering.
 */
const createDeletedFilesVirtualRows = (
  groups: AdminDeletedFileGroup[],
): DeletedFilesVirtualRow[] => {
  const rows: DeletedFilesVirtualRow[] = [];

  groups.forEach((group, groupIndex) => {
    const groupKey = `${group.day}-${group.addr ?? ''}-${groupIndex}`;

    rows.push({
      group,
      key: `${groupKey}-header`,
      type: 'group',
    });

    group.list.forEach((file, fileIndex) => {
      rows.push({
        file,
        key: `${groupKey}-${file.id}-${file.md5}-${fileIndex}`,
        type: 'file',
      });
    });
  });

  return rows;
};

/**
 * Extracts the optional export directory path from different backend response shapes.
 */
const readExportTargetFolderPath = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return '';
  }

  const record = payload as Record<string, unknown>;
  const target = record.targetFolderPath ?? record.path ?? record.folderPath;

  return typeof target === 'string' ? target : '';
};
