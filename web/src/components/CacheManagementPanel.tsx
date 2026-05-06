import { ChevronDown, ChevronRight, Database, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  clearLocalCache,
  deleteLocalCacheFolderGroups,
  formatCacheSize,
  listLocalCacheFolders,
  subscribeLocalCacheChanges,
} from '../shared/local-cache';
import type { LocalCacheFolderSummary } from '../shared/local-cache';

interface CacheManagementPanelProps {
  cacheEnabled: boolean;
  description?: string;
  onShowToast: (message: string) => void;
  onToggleCache: (enabled: boolean) => void;
  scope: string;
  title?: string;
}

interface CacheFolderTotals {
  coverCount: number;
  directoryCount: number;
  hdThumbnailCount: number;
  itemCount: number;
  mediaCount: number;
  originalImageCount: number;
  originalVideoCount: number;
  size: number;
  thumbnailCount: number;
}

interface CacheFolderTreeNode {
  branchTotals: CacheFolderTotals;
  children: CacheFolderTreeNode[];
  depth: number;
  folder: LocalCacheFolderSummary;
  id: string;
  name: string;
  path: string;
  totals: CacheFolderTotals;
}

/**
 * Displays local cache settings and folder-level cache usage.
 */
export const CacheManagementPanel = ({
  cacheEnabled,
  description = '只缓存已经加载过的目录、缩略图和预览资源。命中缓存时会先显示本地内容，再后台做差量更新。',
  onShowToast,
  onToggleCache,
  scope,
  title = '本地缓存',
}: CacheManagementPanelProps) => {
  const [clearing, setClearing] = useState(false);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [folders, setFolders] = useState<LocalCacheFolderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const totalSize = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.size, 0),
    [folders],
  );
  const thumbnailCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.thumbnailCount, 0),
    [folders],
  );
  const hdThumbnailCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.hdThumbnailCount, 0),
    [folders],
  );
  const coverCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.coverCount, 0),
    [folders],
  );
  const originalImageCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.originalImageCount, 0),
    [folders],
  );
  const originalVideoCount = useMemo(
    () => folders.reduce((sum, folder) => sum + folder.originalVideoCount, 0),
    [folders],
  );
  const folderTree = useMemo(() => buildCacheFolderTree(folders), [folders]);

  const refreshCacheFolders = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      setFolders(await listLocalCacheFolders(scope));
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refreshCacheFolders();

    return subscribeLocalCacheChanges(() => {
      void refreshCacheFolders();
    });
  }, [refreshCacheFolders]);

  /**
   * Clears every cache item under the current account and server scope.
   */
  const handleClearAll = async (): Promise<void> => {
    setClearing(true);

    try {
      await clearLocalCache(scope);
      await refreshCacheFolders();
      onShowToast('本地缓存已清理');
    } catch {
      onShowToast('清理缓存失败，请稍后重试');
    } finally {
      setClearing(false);
    }
  };

  /**
   * Clears one cache tree branch and keeps unrelated branches untouched.
   */
  const handleClearTreeNode = async (node: CacheFolderTreeNode): Promise<void> => {
    const branchFolders = collectCacheTreeFolders(node);

    if (branchFolders.length === 0) {
      return;
    }

    try {
      await deleteLocalCacheFolderGroups(branchFolders);
      await refreshCacheFolders();
      onShowToast(`${node.name} 的缓存已清理`);
    } catch {
      onShowToast('清理文件夹缓存失败，请稍后重试');
    }
  };

  /**
   * Toggles one cache tree branch while keeping every branch collapsed by default.
   */
  const handleToggleTreeNode = useCallback((nodeId: string): void => {
    setExpandedNodeIds((current) => {
      const next = new Set(current);

      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      return next;
    });
  }, []);

  return (
    <section className="cache-panel">
      <div className="section-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="cache-panel__actions">
          <label className="switch-control">
            <input
              checked={cacheEnabled}
              onChange={(event) => onToggleCache(event.target.checked)}
              type="checkbox"
            />
            <span />
            <strong>{cacheEnabled ? '已开启' : '已关闭'}</strong>
          </label>
          <button className="secondary-btn" disabled={loading} onClick={() => void refreshCacheFolders()} type="button">
            <RefreshCw size={15} />
            刷新
          </button>
          <button
            className="danger-btn"
            disabled={clearing || folders.length === 0}
            onClick={() => void handleClearAll()}
            type="button"
          >
            <Trash2 size={15} />
            清理全部
          </button>
        </div>
      </div>

      <div className="cache-stats">
        <article>
          <span>缓存文件夹</span>
          <strong>{folders.length}</strong>
        </article>
        <article>
          <span>文件缩略图</span>
          <strong>{thumbnailCount}</strong>
        </article>
        <article>
          <span>高清缩略图</span>
          <strong>{hdThumbnailCount}</strong>
        </article>
        <article>
          <span>文件夹封面</span>
          <strong>{coverCount}</strong>
        </article>
        <article>
          <span>原图</span>
          <strong>{originalImageCount}</strong>
        </article>
        <article>
          <span>原视频</span>
          <strong>{originalVideoCount}</strong>
        </article>
        <article>
          <span>占用空间</span>
          <strong>{formatCacheSize(totalSize)}</strong>
        </article>
      </div>

      <div className="cache-list">
        {loading ? (
          <div className="cache-state">
            <Database size={20} />
            <span>正在读取本地缓存...</span>
          </div>
        ) : null}

        {!loading && folders.length === 0 ? (
          <div className="cache-state">
            <Database size={20} />
            <span>还没有缓存。打开文件夹、缩略图或预览原图后会自动记录。</span>
          </div>
        ) : null}

        {folderTree.map((node) => (
          <CacheFolderTreeRow
            expandedNodeIds={expandedNodeIds}
            key={node.id}
            node={node}
            onClearNode={handleClearTreeNode}
            onToggleNode={handleToggleTreeNode}
          />
        ))}
      </div>
    </section>
  );
};

const EMPTY_CACHE_TOTALS: CacheFolderTotals = {
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  itemCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  size: 0,
  thumbnailCount: 0,
};

const CacheFolderTreeRow = ({
  expandedNodeIds,
  node,
  onClearNode,
  onToggleNode,
}: {
  expandedNodeIds: ReadonlySet<string>;
  node: CacheFolderTreeNode;
  onClearNode: (node: CacheFolderTreeNode) => Promise<void>;
  onToggleNode: (nodeId: string) => void;
}) => {
  const folders = collectCacheTreeFolders(node);
  const hasChildren = node.children.length > 0;
  const expanded = expandedNodeIds.has(node.id);
  const resourceCount = node.branchTotals.directoryCount + node.branchTotals.mediaCount;

  return (
    <div className="cache-tree-node" style={{ '--cache-tree-depth': node.depth } as CSSProperties}>
      <article className="cache-folder-row is-tree">
        <div className="cache-folder-row__title">
          <button
            aria-expanded={hasChildren ? expanded : undefined}
            aria-label={hasChildren ? (expanded ? `收起 ${node.name}` : `展开 ${node.name}`) : undefined}
            className={hasChildren ? 'cache-tree-toggle' : 'cache-tree-toggle is-leaf'}
            disabled={!hasChildren}
            onClick={() => onToggleNode(node.id)}
            type="button"
          >
            {hasChildren ? (expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : null}
          </button>
          <div>
            <strong title={node.name}>{node.name}</strong>
            <span title={node.path}>{node.path}</span>
          </div>
        </div>
        <div className="cache-folder-row__meta">
          <span>{node.branchTotals.directoryCount} 个目录快照</span>
          <span>{node.branchTotals.thumbnailCount} 张缩略图</span>
          <span>{node.branchTotals.hdThumbnailCount} 张高清图</span>
          <span>{node.branchTotals.coverCount} 张封面</span>
          <span>{node.branchTotals.originalImageCount} 张原图</span>
          <span>{node.branchTotals.originalVideoCount} 个视频</span>
          <span>{formatCacheSize(node.branchTotals.size)}</span>
        </div>
        <button
          className="secondary-btn"
          disabled={resourceCount === 0}
          onClick={() => void onClearNode(node)}
          title={folders.length > 1 ? `清理 ${folders.length} 个缓存节点` : '清理缓存'}
          type="button"
        >
          {folders.length > 1 ? '清理分支' : '清理'}
        </button>
      </article>
      {hasChildren && expanded ? (
        <div className="cache-tree-node__children">
          {node.children.map((child) => (
            <CacheFolderTreeRow
              expandedNodeIds={expandedNodeIds}
              key={child.id}
              node={child}
              onClearNode={onClearNode}
              onToggleNode={onToggleNode}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * Builds a folder-only tree. Path segments are used only to infer parent-child
 * relationships, so statistics stay attached to real cached folders.
 */
const buildCacheFolderTree = (folders: LocalCacheFolderSummary[]): CacheFolderTreeNode[] => {
  const roots: CacheFolderTreeNode[] = [];
  const nodes = folders.map(createCacheFolderTreeNode);

  nodes.forEach((node) => {
    const parentNode = findNearestCachedParentNode(node, nodes);

    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  });

  hydrateCacheTreeNodes(roots, 0);

  return roots;
};

const createCacheFolderTreeNode = (folder: LocalCacheFolderSummary): CacheFolderTreeNode => {
  const totals = createTotalsFromFolder(folder);

  return {
    branchTotals: { ...totals },
    children: [],
    depth: 0,
    folder,
    id: `${folder.scope}::folder::${folder.folderKey}`,
    name: folder.folderName,
    path: folder.folderPath,
    totals,
  };
};

const findNearestCachedParentNode = (
  node: CacheFolderTreeNode,
  nodes: CacheFolderTreeNode[],
): CacheFolderTreeNode | undefined => {
  const ancestors = nodes
    .filter((candidate) => {
      return (
        candidate.id !== node.id &&
        candidate.folder.scope === node.folder.scope &&
        isCachePathAncestor(candidate.folder.folderPath, node.folder.folderPath)
      );
    })
    .sort((first, second) => {
      return getCachePathDepth(second.folder.folderPath) - getCachePathDepth(first.folder.folderPath);
    });

  if (ancestors[0]) {
    return ancestors[0];
  }

  const rootNode = nodes.find((candidate) => {
    return (
      candidate.id !== node.id &&
      candidate.folder.scope === node.folder.scope &&
      isRootCacheFolder(candidate.folder)
    );
  });

  return isRootCacheFolder(node.folder) ? undefined : rootNode;
};

const hydrateCacheTreeNodes = (nodes: CacheFolderTreeNode[], depth: number): CacheFolderTotals => {
  const totals = { ...EMPTY_CACHE_TOTALS };

  nodes
    .sort((first, second) => first.name.localeCompare(second.name, 'zh-Hans-CN'))
    .forEach((node) => {
      node.depth = depth;

      const childTotals = hydrateCacheTreeNodes(node.children, depth + 1);

      node.totals = createTotalsFromFolder(node.folder);
      node.branchTotals = addCacheTotals(createTotalsFromFolder(node.folder), childTotals);
      addCacheTotals(totals, node.branchTotals);
    });

  return totals;
};

const createTotalsFromFolder = (folder: LocalCacheFolderSummary): CacheFolderTotals => ({
  coverCount: folder.coverCount,
  directoryCount: folder.directoryCount,
  hdThumbnailCount: folder.hdThumbnailCount,
  itemCount: folder.itemCount,
  mediaCount: folder.mediaCount,
  originalImageCount: folder.originalImageCount,
  originalVideoCount: folder.originalVideoCount,
  size: folder.size,
  thumbnailCount: folder.thumbnailCount,
});

const addCacheTotals = (target: CacheFolderTotals, source: CacheFolderTotals): CacheFolderTotals => {
  target.coverCount += source.coverCount;
  target.directoryCount += source.directoryCount;
  target.hdThumbnailCount += source.hdThumbnailCount;
  target.itemCount += source.itemCount;
  target.mediaCount += source.mediaCount;
  target.originalImageCount += source.originalImageCount;
  target.originalVideoCount += source.originalVideoCount;
  target.size += source.size;
  target.thumbnailCount += source.thumbnailCount;

  return target;
};

const collectCacheTreeFolders = (node: CacheFolderTreeNode): LocalCacheFolderSummary[] => {
  return [
    node.folder,
    ...node.children.flatMap((child) => collectCacheTreeFolders(child)),
  ];
};

const isCachePathAncestor = (parentPath: string, childPath: string): boolean => {
  const normalizedParentPath = normalizeCacheTreePath(parentPath);
  const normalizedChildPath = normalizeCacheTreePath(childPath);

  if (!normalizedParentPath || normalizedParentPath === normalizedChildPath) {
    return false;
  }

  return normalizedChildPath.startsWith(`${normalizedParentPath}/`);
};

const isRootCacheFolder = (folder: LocalCacheFolderSummary): boolean => {
  return folder.folderKey === 'root' || normalizeCacheTreePath(folder.folderPath) === '根目录';
};

const normalizeCacheTreePath = (path: string): string => {
  return path.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').trim();
};

const getCachePathDepth = (path: string): number => {
  return normalizeCacheTreePath(path).split('/').filter(Boolean).length;
};
