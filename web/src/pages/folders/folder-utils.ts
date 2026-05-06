import { VIDEO_TYPES } from '../../components/FolderBrowser';
import type {
  DirectorySelectionItem,
  DirectorySelectionKey,
  FileDirectorySelectionItem,
  FolderDirectorySelectionItem,
} from '../../shared/directory-selection';
import type {
  FolderDirectory,
  FolderFileSummary,
  UploadTarget,
} from '../../shared/types';

export { sortDirectory } from '@kwphoto/core';

export const FORBIDDEN_FOLDER_NAME_PATTERN = /[\\/:*?"<>|]/;
export const MAX_FOLDER_COVER_COUNT = 4;

const COVER_IMAGE_TYPES = new Set([
  'AVIF',
  'BMP',
  'GIF',
  'HEIC',
  'HEIF',
  'IMAGE',
  'JPEG',
  'JPG',
  'PNG',
  'TIF',
  'TIFF',
  'WEBP',
]);

export const createEmptyDirectory = (): FolderDirectory => {
  return {
    breadcrumbs: [],
    files: [],
    folders: [],
    path: '',
    trashCount: 0,
  };
};

export const pruneSelectedKeys = (selectedKeys: Set<DirectorySelectionKey>, visibleItems: DirectorySelectionItem[]): Set<DirectorySelectionKey> => {
  if (selectedKeys.size === 0) {
    return selectedKeys;
  }

  const visibleKeys = new Set(visibleItems.map((item) => item.key));
  const nextKeys = new Set(Array.from(selectedKeys).filter((key) => visibleKeys.has(key)));

  return nextKeys.size === selectedKeys.size ? selectedKeys : nextKeys;
};

export const isFileSelectionItem = (item: DirectorySelectionItem): item is FileDirectorySelectionItem => {
  return item.kind === 'file';
};

export const isFolderSelectionItem = (item: DirectorySelectionItem): item is FolderDirectorySelectionItem => {
  return item.kind === 'folder';
};

export const formatSelectionSummary = (folderCount: number, fileCount: number): string => {
  if (folderCount === 0 && fileCount === 0) {
    return '0 个文件夹，0 个文件';
  }

  return `${folderCount} 个文件夹，${fileCount} 个文件`;
};

export const createShareUrl = (serverUrl: string, key: string, password: string): string => {
  const url = new URL('/s', normalizeBaseUrl(serverUrl));

  url.searchParams.set('key', key);

  if (password) {
    url.searchParams.set('pwd', password);
  }

  return url.toString();
};

export const copyTextToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

export const createUploadTarget = (folderId: number | undefined, path: string): UploadTarget => {
  return {
    folderId,
    name: path || '默认上传目录',
    path: path || '默认上传目录',
  };
};

/**
 * Flattens a folder directory into image files that can be used as cover hashes.
 */
export const getCoverCandidateFiles = (directory: FolderDirectory): FolderFileSummary[] => {
  return directory.files
    .flatMap((group) => group.list)
    .filter(isCoverCandidateFile);
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};

/**
 * Keeps cover selection limited to image-like files with stable md5 hashes.
 */
const isCoverCandidateFile = (file: FolderFileSummary): boolean => {
  if (!file.md5 || VIDEO_TYPES.has(file.fileType)) {
    return false;
  }

  return COVER_IMAGE_TYPES.has(file.fileType) || Boolean(file.width && file.height);
};
