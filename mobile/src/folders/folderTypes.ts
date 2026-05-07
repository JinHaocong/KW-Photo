import type {
  FileDetail,
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from '@kwphoto/core';

export type DirectorySelectionKind = 'file' | 'folder';
export type DirectorySelectionKey = `${DirectorySelectionKind}:${string}`;
export type PreviewImageSource = 'hd' | 'original' | 'thumbnail';
export type PreviewGestureAction = 'close' | 'next' | 'previous';
export type PreviewMode = 'original' | 'thumbnail';

export interface PreviewImageGalleryItem {
  file: FolderFileSummary;
  thumbnailUri?: string;
  uri: string;
}

export interface SelectionItem {
  file?: FolderFileSummary;
  folder?: FolderSummary;
  key: DirectorySelectionKey;
  kind: DirectorySelectionKind;
}

export type DirectoryListItem =
  | { key: string; type: 'initial-loading' }
  | { key: string; type: 'folder-heading' }
  | { folders: FolderSummary[]; key: string; placeholderCount: number; type: 'folder-row' }
  | { key: string; type: 'folder-empty' }
  | { count: number; key: string; type: 'file-heading' }
  | { group: FolderFileGroup; key: string; type: 'file-group-heading' }
  | { file: FolderFileSummary; key: string; type: 'media-file' }
  | { files: FolderFileSummary[]; key: string; placeholderCount: number; type: 'normal-file-row' }
  | { key: string; type: 'file-empty' };

export interface PathItem {
  id?: number;
  isRoot?: boolean;
  name: string;
}

export type PreviewDetailRow = { label: string; value: string };

export type FolderStackRoute = {
  name: 'directory';
  params: {
    folderId?: number;
  };
};

export type DirectoryBreadcrumb = FolderDirectory['breadcrumbs'][number];

export type CreatePreviewDetailRows = (file: FolderFileSummary, detail?: FileDetail) => PreviewDetailRow[];
