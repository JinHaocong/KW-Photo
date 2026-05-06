import type { FolderDirectory, FolderFileSummary, FolderSummary } from './types';

export type DirectorySelectionKind = 'file' | 'folder';
export type DirectorySelectionKey = `${DirectorySelectionKind}:${string}`;

interface BaseDirectorySelectionItem {
  key: DirectorySelectionKey;
  name: string;
}

export interface FolderDirectorySelectionItem extends BaseDirectorySelectionItem {
  folder: FolderSummary;
  id: number;
  kind: 'folder';
  path: string;
}

export interface FileDirectorySelectionItem extends BaseDirectorySelectionItem {
  file: FolderFileSummary;
  fileType: string;
  id: number;
  kind: 'file';
  md5: string;
}

export type DirectorySelectionItem = FolderDirectorySelectionItem | FileDirectorySelectionItem;

/**
 * Creates a stable key for one folder card inside the current directory.
 */
export const createFolderSelectionKey = (folder: FolderSummary): DirectorySelectionKey => {
  return `folder:${folder.id || folder.path || folder.name}`;
};

/**
 * Creates a stable key for one file card inside the current directory.
 */
export const createFileSelectionKey = (file: FolderFileSummary): DirectorySelectionKey => {
  return `file:${file.id || file.md5 || file.name}`;
};

/**
 * Flattens the current directory into selectable folder and file items.
 */
export const getDirectorySelectionItems = (directory: FolderDirectory): DirectorySelectionItem[] => {
  return [
    ...directory.folders.map(createFolderSelectionItem),
    ...directory.files.flatMap((group) => group.list.map(createFileSelectionItem)),
  ];
};

const createFolderSelectionItem = (folder: FolderSummary): FolderDirectorySelectionItem => {
  return {
    folder,
    id: folder.id,
    key: createFolderSelectionKey(folder),
    kind: 'folder',
    name: folder.name,
    path: folder.path,
  };
};

const createFileSelectionItem = (file: FolderFileSummary): FileDirectorySelectionItem => {
  return {
    file,
    fileType: file.fileType,
    id: file.id,
    key: createFileSelectionKey(file),
    kind: 'file',
    md5: file.md5,
    name: file.name,
  };
};
