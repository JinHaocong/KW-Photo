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
  status: 'ready' | 'scanning' | 'empty';
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

export interface UploadTarget {
  folderId?: number;
  name?: string;
  path?: string;
}
