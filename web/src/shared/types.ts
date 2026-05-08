export type ThemeName =
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'orange'
  | 'gray'
  | 'purple'
  | 'red'
  | 'indigo'
  | 'teal'
  | 'cyan'
  | 'rose';

export type WorkspacePage =
  | 'photos'
  | 'recent'
  | 'albums'
  | 'folders'
  | 'people'
  | 'search'
  | 'tags'
  | 'map'
  | 'upload'
  | 'share'
  | 'trash'
  | 'hidden'
  | 'admin'
  | 'settings';

export type AdminTab = 'overview' | 'gallery' | 'tasks' | 'users' | 'cache' | 'system';
export type ViewMode = 'timeline' | 'grid' | 'list';
export type FolderCardSize = 'small' | 'medium' | 'large';
export type FolderSortField = 'tokenAt' | 'mtime' | 'fileName' | 'size' | 'fileType';
export type SortDirection = 'ASC' | 'DESC';

export interface ThemeToken {
  hex: string;
  light: string;
  selection: string;
}

export interface FolderSummary {
  id: number;
  name: string;
  path: string;
  fileCount: number;
  childCount: number;
  updatedAt: string;
  coverFallback: string;
  coverHashes: string[];
  galleryName?: string;
  trashCount: number;
}

export interface FolderFileSummary {
  dateValue?: number;
  id: number;
  md5: string;
  name: string;
  fileType: string;
  dateLabel: string;
  modifiedDateLabel?: string;
  modifiedValue?: number;
  sizeLabel?: string;
  sizeValue?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface FolderFileGroup {
  day: string;
  addr?: string;
  list: FolderFileSummary[];
}

export interface FolderBreadcrumbItem {
  folderId?: number;
  galleryFolderId?: number;
  id?: number;
  name: string;
  path?: string;
}

export interface FolderDirectory {
  folderId?: number;
  path: string;
  folders: FolderSummary[];
  files: FolderFileGroup[];
  breadcrumbs: FolderBreadcrumbItem[];
  trashCount: number;
}

export interface UploadTask {
  error?: string;
  file: File;
  fileId?: number;
  id: number;
  name: string;
  sizeLabel: string;
  state: 'queued' | 'checking' | 'uploading' | 'scanning' | 'done' | 'skipped' | 'failed';
  status: string;
  target?: UploadTarget;
  targetPath?: string;
  progress: number;
}

export interface UploadTarget {
  folderId?: number;
  name?: string;
  path?: string;
}

export interface NavigationItem {
  page: WorkspacePage;
  icon: string;
  label: string;
  badge?: string;
  adminOnly?: boolean;
}

export interface CommandItem {
  icon: string;
  title: string;
  description: string;
  action: () => void;
}

export type SessionStatus = 'booting' | 'guest' | 'checking' | 'authenticated' | 'error';

export interface ApiInfo {
  version: string;
  build?: string;
  activated?: boolean;
  arch?: string;
  platform?: string;
  dbStatus?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
  authCode?: string;
}

export interface CurrentUser {
  id: number;
  uid?: string;
  username: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  otpEnable?: boolean;
}

export interface SessionSnapshot {
  serverUrl: string;
  apiInfo?: ApiInfo;
  tokens?: AuthTokens;
  user?: CurrentUser;
}
