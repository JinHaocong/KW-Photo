import { Image } from 'react-native';
import type { PanResponderGestureState, ViewStyle } from 'react-native';

import type {
  FileDetail,
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from '@kwphoto/core';

import {
  cacheMobileMediaResourceFromUrl,
  readCachedMobileMediaUri,
} from '../mobile-local-cache';
import type { MobileLocalCacheFolderRef } from '../mobile-local-cache';
import type {
  MobileFolderCardSize,
  MobileFolderViewMode,
} from '../mobile-storage';
import {
  COVER_IMAGE_TYPES,
  DIRECT_VIDEO_PREVIEW_TYPES,
  FOLDER_GRID_COLUMN_COUNT,
  FOLDER_GRID_GAP,
  PREVIEW_SWIPE_CLOSE_DISTANCE,
  PREVIEW_SWIPE_DIRECTION_RATIO,
  PREVIEW_SWIPE_STEP_DISTANCE,
  SYNTHETIC_SORT_FILE_GROUP_LABELS,
  VIDEO_FALLBACK_ASPECT_RATIO,
  VIDEO_TYPE_KEYWORDS,
  VIDEO_TYPES,
} from './folderConstants';
import type {
  DirectoryListItem,
  DirectorySelectionKey,
  PathItem,
  PreviewGestureAction,
  PreviewImageGalleryItem,
  PreviewImageSource,
  PreviewMode,
  SelectionItem,
} from './folderTypes';

/**
 * Flattens the directory into virtual-list rows so thumbnails can be enabled by row viewability.
 */
export const createDirectoryListItems = ({
  cardSize,
  directory,
  folderColumnCount,
  initialLoading,
  viewMode,
}: {
  cardSize: MobileFolderCardSize;
  directory?: FolderDirectory;
  folderColumnCount: number;
  initialLoading: boolean;
  viewMode: MobileFolderViewMode;
}): DirectoryListItem[] => {
  if (initialLoading) {
    return [{ key: 'initial-loading', type: 'initial-loading' }];
  }

  if (!directory) {
    return [];
  }

  const folderRows = chunkFolderGridRows(directory.folders, folderColumnCount);
  const fileCount = directory.files.reduce((sum, group) => sum + group.list.length, 0);
  const normalColumnCount = viewMode === 'list' ? 1 : FOLDER_GRID_COLUMN_COUNT[cardSize];

  return [
    { key: 'folder-heading', type: 'folder-heading' },
    ...(folderRows.length > 0
      ? folderRows.map((folders, index) => ({
          folders,
          key: `folder-row-${index}-${folders.map((folder) => folder.id || folder.path).join('-')}`,
          placeholderCount: Math.max(0, folderColumnCount - folders.length),
          type: 'folder-row' as const,
        }))
      : [{ key: 'folder-empty', type: 'folder-empty' as const }]),
    { count: fileCount, key: 'file-heading', type: 'file-heading' },
    ...(directory.files.length > 0
      ? directory.files.flatMap((group, groupIndex) => {
          const groupKey = createFileGroupListKey(group, groupIndex);
          const mediaFiles = group.list.filter(isMediaFile);
          const normalRows = chunkFileGridRows(
            group.list.filter((file) => !isMediaFile(file)),
            normalColumnCount,
          );

          return [
            ...(shouldRenderFileGroupHeading(group)
              ? [{ group, key: `file-group-heading-${groupKey}`, type: 'file-group-heading' as const }]
              : []),
            ...mediaFiles.map((file, fileIndex) => ({
              file,
              key: `media-file-${groupKey}-${fileIndex}-${createFileThumbnailKey(file)}`,
              type: 'media-file' as const,
            })),
            ...normalRows.map((files, rowIndex) => ({
              files,
              key: `normal-file-row-${groupKey}-${rowIndex}-${files.map(createFileThumbnailKey).join('-')}`,
              placeholderCount: Math.max(0, normalColumnCount - files.length),
              type: 'normal-file-row' as const,
            })),
          ];
        })
      : [{ key: 'file-empty', type: 'file-empty' as const }]),
  ];
};

const createFileGroupListKey = (group: FolderFileGroup, index: number): string => {
  return `${index}-${group.day}-${group.addr ?? ''}-${group.list.length}`;
};

const shouldRenderFileGroupHeading = (group: FolderFileGroup): boolean => {
  return Boolean(group.addr || !isSyntheticSortFileGroup(group));
};

const isSyntheticSortFileGroup = (group: FolderFileGroup): boolean => {
  return SYNTHETIC_SORT_FILE_GROUP_LABELS.has(group.day);
};

export const createFileThumbnailKey = (file: FolderFileSummary): string => {
  return `file:${file.id || file.md5 || file.name}:${file.md5}:h220`;
};

export const chunkFileGridRows = (files: FolderFileSummary[], columnCount: number): FolderFileSummary[][] => {
  const safeColumnCount = Math.max(1, columnCount);
  const rows: FolderFileSummary[][] = [];

  for (let index = 0; index < files.length; index += safeColumnCount) {
    rows.push(files.slice(index, index + safeColumnCount));
  }

  return rows;
};

export const getPreviewWarmThumbnailItems = (
  items: PreviewImageGalleryItem[],
  currentIndex: number,
  radius: number,
): PreviewImageGalleryItem[] => {
  const startIndex = Math.max(0, currentIndex - radius);
  const endIndex = Math.min(items.length - 1, currentIndex + radius);

  return items
    .slice(startIndex, endIndex + 1)
    .filter((_item, index) => startIndex + index !== currentIndex);
};

export const warmPreviewThumbnailUri = async ({
  cacheEnabled,
  cacheFolder,
  item,
}: {
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  item: PreviewImageGalleryItem;
}): Promise<string | undefined> => {
  const sourceUrl = item.thumbnailUri ?? item.uri;

  if (!sourceUrl) {
    return undefined;
  }

  let displayUri = sourceUrl;

  if (cacheEnabled && item.thumbnailUri) {
    const cacheParams = {
      fileId: item.file.id,
      folder: cacheFolder,
      kind: 'file-thumbnail' as const,
      md5: item.file.md5,
      url: item.thumbnailUri,
      variant: 'h220',
    };
    const cachedUri = await readCachedMobileMediaUri(cacheParams);
    const downloadedUri = cachedUri ? undefined : await cacheMobileMediaResourceFromUrl(cacheParams);

    displayUri = cachedUri ?? downloadedUri ?? sourceUrl;
  }

  await Image.prefetch(displayUri).catch(() => false);
  return displayUri;
};

export const isSameStringRecord = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  return leftKeys.length === rightKeys.length && leftKeys.every((key) => left[key] === right[key]);
};

export const createEmptyDirectory = (): FolderDirectory => {
  return {
    breadcrumbs: [],
    files: [],
    folders: [],
    path: '',
    trashCount: 0,
  };
};

export const formatSelectionSummary = (folderCount: number, fileCount: number): string => {
  return `${folderCount} 个文件夹，${fileCount} 个文件`;
};

export const getCoverCandidateFiles = (directory: FolderDirectory): FolderFileSummary[] => {
  return directory.files
    .flatMap((group) => group.list)
    .filter(isCoverCandidateFile);
};

export const isCoverCandidateFile = (file: FolderFileSummary): boolean => {
  if (!file.md5 || isVideoFile(file)) {
    return false;
  }

  return COVER_IMAGE_TYPES.has(file.fileType) || Boolean(file.width && file.height);
};

export const isImageFile = (file: FolderFileSummary): boolean => {
  if (isVideoFile(file)) {
    return false;
  }

  return COVER_IMAGE_TYPES.has(normalizePreviewFileType(file.fileType)) || Boolean(file.width && file.height);
};

export const isMediaFile = (file: FolderFileSummary): boolean => {
  return isImageFile(file) || isVideoFile(file);
};

export const getMediaAspectRatio = (file: FolderFileSummary): number | undefined => {
  return getLoadedImageAspectRatio(file.width, file.height);
};

export const getLoadedImageAspectRatio = (width?: number, height?: number): number | undefined => {
  if (!width || !height || width <= 0 || height <= 0) {
    return undefined;
  }

  return width / height;
};

export const getMediaPlaceholderAspectRatio = (file: FolderFileSummary): number | undefined => {
  return isVideoFile(file) ? VIDEO_FALLBACK_ASPECT_RATIO : undefined;
};

export const getMediaWaterfallColumnCount = (cardSize: MobileFolderCardSize): number => {
  if (cardSize === 'small') {
    return 3;
  }

  if (cardSize === 'large') {
    return 1;
  }

  return 2;
};

export const createFolderCardLayoutStyle = ({
  cardSize,
  containerWidth,
  viewMode,
}: {
  cardSize: MobileFolderCardSize;
  containerWidth: number;
  viewMode: MobileFolderViewMode;
}): ViewStyle | undefined => {
  if (containerWidth <= 0) {
    return undefined;
  }

  if (viewMode === 'list') {
    return {
      flexBasis: '100%',
      flexGrow: 0,
      flexShrink: 0,
      maxWidth: '100%',
      width: '100%',
    };
  }

  const columnCount = FOLDER_GRID_COLUMN_COUNT[cardSize];
  const itemWidth = Math.floor((containerWidth - FOLDER_GRID_GAP * (columnCount - 1)) / columnCount);

  return {
    flexBasis: itemWidth,
    flexGrow: 0,
    flexShrink: 0,
    maxWidth: itemWidth,
    width: itemWidth,
  };
};

export const createFolderGridLayoutStyle = ({
  cardSize,
  containerWidth,
  viewMode,
}: {
  cardSize: MobileFolderCardSize;
  containerWidth: number;
  viewMode: MobileFolderViewMode;
}): ViewStyle | undefined => {
  if (containerWidth <= 0) {
    return undefined;
  }

  if (viewMode === 'list') {
    return { width: '100%' };
  }

  const columnCount = FOLDER_GRID_COLUMN_COUNT[cardSize];
  const itemWidth = Math.floor((containerWidth - FOLDER_GRID_GAP * (columnCount - 1)) / columnCount);
  const trackWidth = itemWidth * columnCount + FOLDER_GRID_GAP * (columnCount - 1);

  return { width: trackWidth };
};

export const chunkFolderGridRows = (folders: FolderSummary[], columnCount: number): FolderSummary[][] => {
  const safeColumnCount = Math.max(1, columnCount);
  const rows: FolderSummary[][] = [];

  for (let index = 0; index < folders.length; index += safeColumnCount) {
    rows.push(folders.slice(index, index + safeColumnCount));
  }

  return rows;
};

export const buildMediaWaterfallColumns = (
  files: FolderFileSummary[],
  columnCount: number,
): FolderFileSummary[][] => {
  const safeColumnCount = Math.max(1, columnCount);
  const columns = Array.from({ length: safeColumnCount }, () => [] as FolderFileSummary[]);
  const columnHeights = Array.from({ length: safeColumnCount }, () => 0);

  files.forEach((file) => {
    let targetIndex = 0;

    for (let index = 1; index < columnHeights.length; index += 1) {
      if (columnHeights[index] < columnHeights[targetIndex]) {
        targetIndex = index;
      }
    }

    columns[targetIndex].push(file);
    columnHeights[targetIndex] += getMediaWaterfallWeight(file);
  });

  return columns;
};

const getMediaWaterfallWeight = (file: FolderFileSummary): number => {
  const aspectRatio = getMediaAspectRatio(file) ?? getMediaPlaceholderAspectRatio(file);

  if (!aspectRatio) {
    return 1;
  }

  return 1 / aspectRatio;
};

export const createPreviewDetailRows = (
  file: FolderFileSummary,
  detail?: FileDetail,
): Array<{ label: string; value: string }> => {
  const dimensions = detail?.width && detail.height
    ? `${detail.width}x${detail.height}`
    : file.width && file.height
      ? `${file.width}x${file.height}`
      : undefined;
  const rows = [
    { label: '名称', value: detail?.name ?? file.name },
    { label: '类型', value: detail?.fileType ?? file.fileType },
    { label: '大小', value: detail?.sizeLabel ?? file.sizeLabel },
    { label: '尺寸', value: dimensions },
    { label: '拍摄', value: detail?.dateLabel ?? file.dateLabel },
    { label: '设备', value: detail?.deviceName },
    { label: '位置', value: detail?.location },
    { label: 'MD5', value: detail?.md5 ?? file.md5 },
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
};

export const createDirectoryPathItems = (directory: FolderDirectory): PathItem[] => {
  const breadcrumbs = directory.breadcrumbs
    .map((item) => ({
      id: getBreadcrumbItemId(item),
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

export const createCurrentDirectoryPathItems = (directory: FolderDirectory): PathItem[] => {
  const pathItems = createDirectoryPathItems(directory);
  const isRootDirectory = directory.folderId === undefined && directory.breadcrumbs.length === 0;

  if (isRootDirectory) {
    return [{ isRoot: true, name: '根目录' }];
  }

  return [{ isRoot: true, name: '根目录' }, ...pathItems];
};

export const createFolderStackRoutes = (breadcrumbs: FolderDirectory['breadcrumbs']) => {
  const folderRoutes = breadcrumbs
    .map(getBreadcrumbItemId)
    .filter((folderId): folderId is number => folderId !== undefined && folderId > 0)
    .map((folderId) => ({ name: 'directory' as const, params: { folderId } }));

  return [{ name: 'directory' as const, params: { folderId: undefined } }, ...folderRoutes];
};

export const getBreadcrumbItemId = (item: FolderDirectory['breadcrumbs'][number]): number | undefined => {
  return item.id ?? item.folderId ?? item.galleryFolderId;
};

export const createFolderSelectionKey = (folder: FolderSummary): DirectorySelectionKey => {
  return `folder:${folder.id || folder.path || folder.name}`;
};

export const createFileSelectionKey = (file: FolderFileSummary): DirectorySelectionKey => {
  return `file:${file.id || file.md5 || file.name}`;
};

export const mergePreviewFileIntoList = (
  files: FolderFileSummary[],
  previewFile?: FolderFileSummary,
): FolderFileSummary[] => {
  if (!previewFile) {
    return files;
  }

  if (files.some((file) => createFileSelectionKey(file) === createFileSelectionKey(previewFile))) {
    return files.map((file) => (
      createFileSelectionKey(file) === createFileSelectionKey(previewFile) ? { ...file, ...previewFile } : file
    ));
  }

  return [previewFile, ...files];
};

export const createPreviewMediaKey = (file: FolderFileSummary): string => {
  if (file.id > 0) {
    return `file:${file.id}:${file.md5 || file.name}`;
  }

  return `file:${file.md5 || file.name}`;
};

export const getDirectorySelectionItems = (directory: FolderDirectory): SelectionItem[] => {
  return [
    ...directory.folders.map((folder) => ({
      folder,
      key: createFolderSelectionKey(folder),
      kind: 'folder' as const,
    })),
    ...directory.files.flatMap((group) => group.list.map((file) => ({
      file,
      key: createFileSelectionKey(file),
      kind: 'file' as const,
    }))),
  ];
};

export const isSelectedFile = (file: FolderFileSummary | undefined): file is FolderFileSummary => {
  return Boolean(file);
};

export const isSelectedFolder = (folder: FolderSummary | undefined): folder is FolderSummary => {
  return Boolean(folder);
};

export const normalizePreviewFileType = (fileType?: string): string => {
  return fileType?.trim().toUpperCase() ?? '';
};

export const isVideoFileType = (fileType?: string): boolean => {
  const normalizedType = fileType?.trim().toLowerCase() ?? '';

  if (!normalizedType) {
    return false;
  }

  if (VIDEO_TYPES.has(normalizePreviewFileType(fileType))) {
    return true;
  }

  return VIDEO_TYPE_KEYWORDS.some((keyword) => normalizedType.includes(keyword));
};

export const isDirectVideoFileType = (fileType?: string): boolean => {
  const normalizedType = fileType?.trim().toLowerCase() ?? '';

  if (!normalizedType) {
    return false;
  }

  if (DIRECT_VIDEO_PREVIEW_TYPES.has(normalizePreviewFileType(fileType))) {
    return true;
  }

  return ['mp4', 'mov', 'm4v', 'quicktime'].some((keyword) => normalizedType.includes(keyword));
};

export const isVideoFile = (file: FolderFileSummary): boolean => {
  return isVideoFileType(file.fileType);
};

export const isDirectVideoPreviewSupported = (file?: FolderFileSummary): boolean => {
  return Boolean(file && isDirectVideoFileType(file.fileType));
};

export const shouldCapturePreviewGesture = (gestureState: PanResponderGestureState): boolean => {
  return Boolean(getPreviewGestureAction(gestureState));
};

export const getPreviewGestureAction = (gestureState: PanResponderGestureState): PreviewGestureAction | undefined => {
  const absX = Math.abs(gestureState.dx);
  const absY = Math.abs(gestureState.dy);

  if (
    gestureState.dy > PREVIEW_SWIPE_CLOSE_DISTANCE &&
    gestureState.dy > absX * PREVIEW_SWIPE_DIRECTION_RATIO
  ) {
    return 'close';
  }

  if (
    absX > PREVIEW_SWIPE_STEP_DISTANCE &&
    absX > absY * PREVIEW_SWIPE_DIRECTION_RATIO
  ) {
    return gestureState.dx > 0 ? 'previous' : 'next';
  }

  return undefined;
};

export const getVideoPlaybackUrl = (
  file: FolderFileSummary,
  directUrl?: string,
  transcodeUrl?: string,
): string | undefined => {
  if (isDirectVideoPreviewSupported(file)) {
    return directUrl ?? transcodeUrl;
  }

  return transcodeUrl ?? directUrl;
};

export const INFUSE_URL_SCHEME = 'infuse://';

const INFUSE_PLAYBACK_URL = 'infuse://x-callback-url/play';

/**
 * Builds the Infuse x-callback playback URL for one remote video.
 */
export const createInfusePlaybackUrl = ({
  filename,
  sourceUrl,
}: {
  filename?: string;
  sourceUrl: string;
}): string => {
  const params = new URLSearchParams();

  params.set('url', sourceUrl);

  if (filename?.trim()) {
    params.set('filename', filename.trim());
  }

  return `${INFUSE_PLAYBACK_URL}?${params.toString()}`;
};

export const getPreviewActionLabel = (
  file: FolderFileSummary | undefined,
  mode: PreviewMode,
  preparing: boolean,
): string => {
  if (preparing) {
    return '准备中';
  }

  if (mode === 'original') {
    return '显示高清预览图';
  }

  return file && isVideoFile(file) ? '内置播放视频' : '显示原图';
};

export const getPreviewImageSourceLabel = (source: PreviewImageSource): string => {
  if (source === 'original') {
    return '原图';
  }

  if (source === 'hd') {
    return '高清缩略图';
  }

  return '列表缩略图';
};

export const getPreviewCacheLabel = ({
  cacheChecked,
  cacheEnabled,
  cacheHit,
  sourceName,
}: {
  cacheChecked: boolean;
  cacheEnabled: boolean;
  cacheHit: boolean;
  sourceName: string;
}): string => {
  if (!cacheEnabled) {
    return `${sourceName} / 网络`;
  }

  if (!cacheChecked) {
    return `${sourceName} / 检查缓存中`;
  }

  return cacheHit ? `${sourceName} / 本地缓存` : `${sourceName} / 网络，加载后写入缓存`;
};

export const createMobileShareUrl = (serverUrl: string, key: string, password = ''): string => {
  const url = new URL('/s', serverUrl.replace(/\/+$/, ''));

  url.searchParams.set('key', key);

  if (password) {
    url.searchParams.set('password', password);
  }

  return url.toString();
};
