import type { AdminTaskCounts } from '@kwphoto/core';

import type { MobileCacheFolderSummary, MobileCacheStats } from '../mobile-local-cache';
import type { CacheFolderTotals, CacheFolderTreeNode, CacheMetaPillData } from './adminTypes';

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

export const createEmptyTaskCounts = (): AdminTaskCounts => ({
  active: 0,
  completed: 0,
  failed: 0,
  paused: 0,
  waiting: 0,
});

export const createEmptyCacheStats = (): MobileCacheStats => ({
  approximateSize: 0,
  appDataSize: 0,
  applicationSupportSize: 0,
  coverCount: 0,
  directoryCount: 0,
  documentSize: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  nativeTemporarySize: 0,
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
});

export const getCacheFolderMetaPills = (totals: CacheFolderTotals): CacheMetaPillData[] => {
  const items: CacheMetaPillData[] = [
    { icon: 'folder-outline', label: `${totals.directoryCount} 目录`, value: totals.directoryCount },
    { icon: 'image-outline', label: `${totals.thumbnailCount} 列表图`, value: totals.thumbnailCount },
    { icon: 'film-outline', label: `${totals.videoPosterCount} 视频海报`, value: totals.videoPosterCount },
    { icon: 'sparkles-outline', label: `${totals.hdThumbnailCount} 高清图`, value: totals.hdThumbnailCount },
    { icon: 'albums-outline', label: `${totals.coverCount} 封面`, value: totals.coverCount },
    { icon: 'expand-outline', label: `${totals.originalImageCount} 原图`, value: totals.originalImageCount },
    { icon: 'videocam-outline', label: `${totals.originalVideoCount} 视频`, value: totals.originalVideoCount },
  ];
  const visibleItems = items.filter((item) => item.value > 0);

  return visibleItems.length > 0 ? visibleItems : [{ icon: 'server-outline', label: '0 资源', value: 0 }];
};

/**
 * Generates composition pills for the top-level cache hero card.
 */
export const getCacheCompositionPills = (stats: MobileCacheStats): CacheMetaPillData[] => {
  const items: CacheMetaPillData[] = [
    { icon: 'folder-outline', label: `${stats.directoryCount} 目录`, value: stats.directoryCount },
    { icon: 'image-outline', label: `${stats.thumbnailCount} 列表图`, value: stats.thumbnailCount },
    { icon: 'film-outline', label: `${stats.videoPosterCount} 视频海报`, value: stats.videoPosterCount },
    { icon: 'sparkles-outline', label: `${stats.hdThumbnailCount} 高清图`, value: stats.hdThumbnailCount },
    { icon: 'albums-outline', label: `${stats.coverCount} 封面`, value: stats.coverCount },
    { icon: 'expand-outline', label: `${stats.originalImageCount} 原图`, value: stats.originalImageCount },
    { icon: 'videocam-outline', label: `${stats.originalVideoCount} 视频`, value: stats.originalVideoCount },
  ];
  const visibleItems = items.filter((item) => item.value > 0);

  return visibleItems.length > 0 ? visibleItems : [{ icon: 'server-outline', label: '0 资源', value: 0 }];
};

/**
 * Builds a folder-only cache tree from the mobile cache index.
 */
export const buildCacheFolderTree = (folders: MobileCacheFolderSummary[]): CacheFolderTreeNode[] => {
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

const createCacheFolderTreeNode = (folder: MobileCacheFolderSummary): CacheFolderTreeNode => {
  const totals = createTotalsFromFolder(folder);

  return {
    branchTotals: { ...totals },
    children: [],
    depth: 0,
    folder,
    id: folder.folderScopeKey,
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

const createTotalsFromFolder = (folder: MobileCacheFolderSummary): CacheFolderTotals => ({
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

export const collectCacheTreeFolders = (node: CacheFolderTreeNode): MobileCacheFolderSummary[] => {
  return [
    node.folder,
    ...node.children.flatMap((child) => collectCacheTreeFolders(child)),
  ];
};

const isRootCacheFolder = (folder: MobileCacheFolderSummary): boolean => {
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
