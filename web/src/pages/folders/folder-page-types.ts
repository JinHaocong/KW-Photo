import type {
  FolderBreadcrumbItem,
  FolderCardSize,
  FolderSortField,
  SortDirection,
} from '../../shared/types';

export type BatchActionKey = 'delete' | 'download' | 'move' | 'share';
export type FolderHistoryAction = 'push' | 'replace';

export interface FolderNavigationPreview {
  breadcrumbs: FolderBreadcrumbItem[];
  folderId?: number;
  path?: string;
}

export interface FolderSortPreference {
  direction: SortDirection;
  field: FolderSortField;
}

export interface FolderViewPreference {
  cardSize: FolderCardSize;
  showFolderCovers: boolean;
  sort: FolderSortPreference;
}
