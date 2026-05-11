import { AlertCircle, ChevronDown, ChevronRight, Database, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  clearAllLocalCache,
  clearUnusedLocalCache,
  clearUsefulLocalCache,
  deleteLocalCacheFolderGroups,
  formatCacheSize,
  listLocalCacheFolders,
  readLocalCacheStats,
  subscribeLocalCacheChanges,
} from '../shared/local-cache';
import type { LocalCacheFolderSummary, LocalCacheStats } from '../shared/local-cache';

interface CacheManagementPanelProps {
  cacheEnabled: boolean;
  description?: string;
  onShowToast: (message: string) => void;
  onToggleCache: (enabled: boolean) => void;
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
  videoPosterCount: number;
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

const EMPTY_CACHE_STATS: LocalCacheStats = {
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
  totalCount: 0,
  totalSize: 0,
  unusedCount: 0,
  unusedSize: 0,
  usefulCount: 0,
  usefulSize: 0,
  videoPosterCount: 0,
};

/**
 * Displays local cache settings and folder-level cache usage.
 */
export const CacheManagementPanel = ({
  cacheEnabled,
  description = '只缓存已经加载过的目录、缩略图和预览资源。命中缓存时会先显示本地内容，再后台做差量更新。',
  onShowToast,
  onToggleCache,
  title = '本地缓存',
}: CacheManagementPanelProps) => {
  const [clearing, setClearing] = useState<'all' | 'unused' | 'useful' | ''>('');
  const [cacheStats, setCacheStats] = useState<LocalCacheStats>(EMPTY_CACHE_STATS);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [folders, setFolders] = useState<LocalCacheFolderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const folderTree = useMemo(() => buildCacheFolderTree(folders), [folders]);

  const refreshCacheFolders = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const [nextFolders, nextStats] = await Promise.all([
        listLocalCacheFolders(),
        readLocalCacheStats(),
      ]);

      setFolders(nextFolders);
      setCacheStats(nextStats);
    } catch {
      setFolders([]);
      setCacheStats(EMPTY_CACHE_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCacheFolders();

    return subscribeLocalCacheChanges(() => {
      void refreshCacheFolders();
    });
  }, [refreshCacheFolders]);

  /**
   * Clears indexed cache entries that can still be used by folders and previews.
   */
  const handleClearUseful = async (): Promise<void> => {
    setClearing('useful');

    try {
      await clearUsefulLocalCache();
      await refreshCacheFolders();
      onShowToast('可用缓存已清理');
    } catch {
      onShowToast('清理缓存失败，请稍后重试');
    } finally {
      setClearing('');
    }
  };

  /**
   * Clears orphaned desktop blobs and stale browser records without touching useful cache.
   */
  const handleClearUnused = async (): Promise<void> => {
    setClearing('unused');

    try {
      await clearUnusedLocalCache();
      await refreshCacheFolders();
      onShowToast('残留缓存已清理');
    } catch {
      onShowToast('清理残留缓存失败，请稍后重试');
    } finally {
      setClearing('');
    }
  };

  /**
   * Clears indexed records and orphaned payloads in one action.
   */
  const handleClearAll = async (): Promise<void> => {
    setClearing('all');

    try {
      await clearAllLocalCache();
      await refreshCacheFolders();
      onShowToast('全部缓存已清理');
    } catch {
      onShowToast('清理全部缓存失败，请稍后重试');
    } finally {
      setClearing('');
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
            disabled={Boolean(clearing) || cacheStats.usefulCount === 0}
            onClick={() => void handleClearUseful()}
            type="button"
          >
            <Trash2 size={15} />
            {clearing === 'useful' ? '清理中' : '清理可用'}
          </button>
          <button
            className="danger-btn"
            disabled={Boolean(clearing) || cacheStats.unusedCount === 0}
            onClick={() => void handleClearUnused()}
            type="button"
          >
            <AlertCircle size={15} />
            {clearing === 'unused' ? '清理中' : '清理残留'}
          </button>
          <button
            className="danger-btn"
            disabled={Boolean(clearing) || cacheStats.totalCount === 0}
            onClick={() => void handleClearAll()}
            type="button"
          >
            <Trash2 size={15} />
            {clearing === 'all' ? '清理中' : '清理全部'}
          </button>
        </div>
      </div>

      <div className="cache-metrics">
        <div className="cache-stats cache-stats--summary">
          <article>
            <span>总缓存</span>
            <strong>{formatCacheSize(cacheStats.totalSize)}</strong>
          </article>
          <article>
            <span>可用缓存</span>
            <strong>{formatCacheSize(cacheStats.usefulSize)}</strong>
          </article>
          <article className="is-warning">
            <span>残留缓存</span>
            <strong>{formatCacheSize(cacheStats.unusedSize)}</strong>
          </article>
        </div>

        <div className="cache-stats cache-stats--details">
          <article>
            <span>缓存文件夹</span>
            <strong>{folders.length}</strong>
          </article>
          <article>
            <span>文件缩略图</span>
            <strong>{cacheStats.thumbnailCount}</strong>
          </article>
          <article>
            <span>高清缩略图</span>
            <strong>{cacheStats.hdThumbnailCount}</strong>
          </article>
          <article>
            <span>视频海报</span>
            <strong>{cacheStats.videoPosterCount}</strong>
          </article>
          <article>
            <span>文件夹封面</span>
            <strong>{cacheStats.coverCount}</strong>
          </article>
          <article>
            <span>原图</span>
            <strong>{cacheStats.originalImageCount}</strong>
          </article>
          <article>
            <span>原视频</span>
            <strong>{cacheStats.originalVideoCount}</strong>
          </article>
          <article>
            <span>残留资源</span>
            <strong>{cacheStats.unusedCount}</strong>
          </article>
        </div>
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
            <span>
              {cacheStats.unusedCount > 0
                ? '没有可用缓存目录，当前仅检测到残留缓存。'
                : '还没有缓存。打开文件夹、缩略图或预览原图后会自动记录。'}
            </span>
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
  videoPosterCount: 0,
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
          <span>{node.branchTotals.videoPosterCount} 张视频海报</span>
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
  const nodesByPath = new Map<string, CacheFolderTreeNode>();
  const rootNodesByScope = new Map<string, CacheFolderTreeNode>();

  nodes.forEach((node) => {
    nodesByPath.set(createCacheTreePathKey(node.folder.scope, node.folder.folderPath), node);

    if (isRootCacheFolder(node.folder)) {
      rootNodesByScope.set(node.folder.scope, node);
    }
  });

  nodes
    .sort((first, second) => getCachePathDepth(first.folder.folderPath) - getCachePathDepth(second.folder.folderPath))
    .forEach((node) => {
      const parentNode = findNearestCachedParentNode(node, nodesByPath, rootNodesByScope);

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
  nodesByPath: Map<string, CacheFolderTreeNode>,
  rootNodesByScope: Map<string, CacheFolderTreeNode>,
): CacheFolderTreeNode | undefined => {
  const pathSegments = normalizeCacheTreePath(node.folder.folderPath).split('/').filter(Boolean);

  for (let length = pathSegments.length - 1; length > 0; length -= 1) {
    const parentPath = pathSegments.slice(0, length).join('/');
    const parentNode = nodesByPath.get(createCacheTreePathKey(node.folder.scope, parentPath));

    if (parentNode && parentNode.id !== node.id) {
      return parentNode;
    }
  }

  const rootNode = rootNodesByScope.get(node.folder.scope);

  return rootNode && rootNode.id !== node.id && !isRootCacheFolder(node.folder) ? rootNode : undefined;
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
  videoPosterCount: folder.videoPosterCount,
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
  target.videoPosterCount += source.videoPosterCount;

  return target;
};

const collectCacheTreeFolders = (node: CacheFolderTreeNode): LocalCacheFolderSummary[] => {
  return [
    node.folder,
    ...node.children.flatMap((child) => collectCacheTreeFolders(child)),
  ];
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

const createCacheTreePathKey = (scope: string, path: string): string => {
  return `${scope}::${normalizeCacheTreePath(path)}`;
};
