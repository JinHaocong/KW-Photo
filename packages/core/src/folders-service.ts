import type {
  FolderBreadcrumbItem,
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from './types';
import type { ApiClientOptions } from './api-client';
import { createApiClient } from './api-client';

export interface CreateFolderParams {
  parentId?: number;
  name: string;
  path?: string;
}

export interface MoveFolderFilesParams {
  sourceFolderId: number;
  targetFolderId: number;
  fileIds: number[];
}

export interface MoveFolderParams {
  folderId: number;
  targetFolderId: number;
}

export interface RenameFolderParams {
  folderId: number;
  name: string;
}

export interface SetFolderCoverParams {
  coverHashes: string[];
  folderId: number;
}

interface CreateFolderResponse {
  code?: string;
  id?: number;
  msg?: string;
}

interface FolderPathEditResponse {
  code?: string;
  msg?: string;
}

interface FolderCoverResponse {
  code?: string;
  msg?: string;
}

interface FolderAutoCoverItem {
  cover?: string;
  id?: number;
  s_cover?: string;
}

interface FolderDirectoryResponse {
  path?: string;
  folderList?: FolderItemResponse[];
  fileList?: Array<FolderFileGroupResponse | FolderFileResponse>;
  trashNum?: number;
}

interface FolderItemResponse {
  id?: number;
  name?: string;
  path?: string;
  galleryName?: string;
  galleryFolderNum?: number;
  folderNum?: number;
  foldersNum?: number;
  subFolderNum?: number;
  subFileNum?: number;
  fileCount?: number;
  fileNum?: number;
  filesNum?: number;
  count?: number;
  trashNum?: number;
  cover?: string | null;
  s_cover?: string | null;
}

interface FolderFileGroupResponse {
  day?: string;
  addr?: string;
  list?: FolderFileResponse[];
}

interface FolderFileResponse {
  id?: number;
  MD5?: string;
  md5?: string;
  fileName?: string;
  name?: string;
  fileType?: string;
  type?: string;
  tokenAt?: number | string;
  mtime?: number | string;
  size?: number | string;
  fileSize?: number | string;
  width?: number | string;
  height?: number | string;
  duration?: number | string;
}

const inFlightDirectoryRequests = new Map<string, Promise<FolderDirectory>>();

/**
 * Fetches root folders for folder workspaces.
 * @param options Authenticated API client options.
 * @returns Root folder directory.
 */
export const fetchRootFolders = async (options: ApiClientOptions): Promise<FolderDirectory> => {
  return reuseInFlightDirectoryRequest(createDirectoryRequestKey(options, 'root'), async () => {
    const response = await createApiClient(options).request<FolderDirectoryResponse>('/gateway/folders/root');

    return mapDirectory(response, undefined, []);
  });
};

/**
 * Fetches children, files and breadcrumbs for one folder.
 * @param options Authenticated API client options.
 * @param folderId Folder id.
 * @returns Folder directory with breadcrumbs.
 */
export const fetchFolderDirectory = async (options: ApiClientOptions, folderId: number): Promise<FolderDirectory> => {
  return reuseInFlightDirectoryRequest(createDirectoryRequestKey(options, folderId), async () => {
    const client = createApiClient(options);
    const [directory, breadcrumbs] = await Promise.all([
      client.request<FolderDirectoryResponse>(`/gateway/foldersV2/${folderId}`),
      client.request<FolderBreadcrumbItem[]>(`/gateway/folderBreadcrumbs/${folderId}`),
    ]);

    return mapDirectory(directory, folderId, breadcrumbs);
  });
};

/**
 * Creates a folder under the selected parent.
 * @param options Authenticated API client options.
 * @param params Create-folder payload.
 * @returns Created folder summary.
 */
export const createFolder = (options: ApiClientOptions, params: CreateFolderParams): Promise<CreateFolderResponse> => {
  return createApiClient(options).request<CreateFolderResponse>('/gateway/folders/create', {
    method: 'POST',
    body: {
      name: params.name,
      path: params.path,
      pid: params.parentId,
    },
  });
};

/**
 * Renames one server folder using MT Photos folder path edit API.
 * @param options Authenticated API client options.
 * @param params Rename payload.
 * @returns Backend operation result.
 */
export const renameFolder = (options: ApiClientOptions, params: RenameFolderParams): Promise<FolderPathEditResponse> => {
  return createApiClient(options).request<FolderPathEditResponse>('/gateway/folderPathEdit', {
    method: 'POST',
    body: {
      folderId: params.folderId,
      name: params.name,
      type: 'rename',
    },
  });
};

/**
 * Moves one folder into another server folder.
 * @param options Authenticated API client options.
 * @param params Folder id and destination folder id.
 * @returns Backend operation result.
 */
export const moveFolder = (options: ApiClientOptions, params: MoveFolderParams): Promise<FolderPathEditResponse> => {
  return createApiClient(options).request<FolderPathEditResponse>('/gateway/folderPathEdit', {
    method: 'POST',
    body: {
      distId: params.targetFolderId,
      folderId: params.folderId,
      type: 'move',
    },
  });
};

/**
 * Deletes one folder through the folder path edit API.
 * @param options Authenticated API client options.
 * @param folderId Folder id to delete.
 * @returns Backend operation result.
 */
export const deleteFolder = (options: ApiClientOptions, folderId: number): Promise<FolderPathEditResponse> => {
  return createApiClient(options).request<FolderPathEditResponse>('/gateway/folderPathEdit', {
    method: 'POST',
    body: {
      folderId,
      type: 'delete',
    },
  });
};

/**
 * Sets one folder cover using the MT Photos s_cover hash payload.
 * @param options Authenticated API client options.
 * @param params Folder id and selected cover hashes.
 * @returns Backend operation result.
 */
export const setFolderCover = (options: ApiClientOptions, params: SetFolderCoverParams): Promise<FolderCoverResponse> => {
  return createApiClient(options).request<FolderCoverResponse>(`/gateway/setFolderCover/${params.folderId}`, {
    method: 'PATCH',
    body: {
      s_cover: params.coverHashes.join(','),
    },
  });
};

/**
 * Lets the server pick folder covers automatically for the selected folder tree.
 * @param options Authenticated API client options.
 * @param folderId Folder id to auto-cover.
 * @returns Server-updated cover records.
 */
export const autoSetFolderCover = (options: ApiClientOptions, folderId: number): Promise<FolderAutoCoverItem[]> => {
  return createApiClient(options).request<FolderAutoCoverItem[]>(`/gateway/folderAutoCover/${folderId}`, {
    method: 'POST',
  });
};

/**
 * Requests a preview for moving files between folders.
 * @param options Authenticated API client options.
 * @param params Move preview payload.
 * @returns Service-provided preview result.
 */
export const previewFolderFileMove = <TPreview>(options: ApiClientOptions, params: MoveFolderFilesParams): Promise<TPreview> => {
  return createApiClient(options).request<TPreview>('/gateway/folder_files_move/preview', {
    method: 'POST',
    body: { ...params },
  });
};

const mapDirectory = (response: FolderDirectoryResponse, folderId: number | undefined, breadcrumbs: FolderBreadcrumbItem[]): FolderDirectory => {
  return {
    breadcrumbs: breadcrumbs.map(mapBreadcrumbItem),
    files: normalizeFileGroups(response.fileList ?? []),
    folderId,
    folders: (response.folderList ?? []).map((folder) => mapFolder(folder, response.path ?? '')),
    path: response.path ?? '',
    trashCount: response.trashNum ?? 0,
  };
};

/**
 * Reuses the same folder request while React development StrictMode remounts the page.
 */
const reuseInFlightDirectoryRequest = (key: string, factory: () => Promise<FolderDirectory>): Promise<FolderDirectory> => {
  const inFlightRequest = inFlightDirectoryRequests.get(key);

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const request = factory().finally(() => {
    if (inFlightDirectoryRequests.get(key) === request) {
      inFlightDirectoryRequests.delete(key);
    }
  });

  inFlightDirectoryRequests.set(key, request);

  return request;
};

const createDirectoryRequestKey = (options: ApiClientOptions, folderId: number | 'root'): string => {
  return `${normalizeBaseUrl(options.baseUrl)}::${folderId}`;
};

const mapBreadcrumbItem = (item: FolderBreadcrumbItem): FolderBreadcrumbItem => {
  return {
    ...item,
    id: readOptionalNumber(item.id, item.folderId, item.galleryFolderId),
    name: item.name || item.path || '未命名文件夹',
  };
};

const mapFolder = (folder: FolderItemResponse, parentPath: string): FolderSummary => {
  const childCount = readNumber(folder.subFolderNum, folder.galleryFolderNum, folder.folderNum, folder.foldersNum);
  const fileCount = readNumber(folder.subFileNum, folder.fileNum, folder.filesNum, folder.fileCount, folder.count);
  const coverHashes = parseCoverHashes(folder.s_cover || folder.cover || '');
  const displayName = folder.galleryName || folder.name || '未命名文件夹';
  const pathName = folder.name || displayName;

  return {
    childCount,
    coverFallback: createCoverGradient(folder.id ?? 0),
    coverHashes,
    fileCount,
    galleryName: folder.galleryName,
    id: folder.id ?? 0,
    name: displayName,
    path: folder.path || joinPath(parentPath, pathName),
    status: fileCount === 0 && childCount === 0 ? 'empty' : 'ready',
    trashCount: folder.trashNum ?? 0,
    updatedAt: folder.galleryName ? `图库 ${folder.galleryName}` : '已同步',
  };
};

/**
 * Normalizes root/detail fileList because MT Photos may return flat files or grouped day rows.
 * @param fileList Raw fileList from folder APIs.
 * @returns File groups ready for folder page rendering.
 */
const normalizeFileGroups = (fileList: Array<FolderFileGroupResponse | FolderFileResponse>): FolderFileGroup[] => {
  if (fileList.length === 0) {
    return [];
  }

  if (fileList.some(isFileGroupResponse)) {
    return fileList
      .filter(isFileGroupResponse)
      .map(mapFileGroup)
      .filter((group) => group.list.length > 0);
  }

  const groupMap = new Map<string, FolderFileSummary[]>();

  fileList.forEach((file) => {
    const mappedFile = mapFile(file as FolderFileResponse);
    const day = mappedFile.dateLabel || '未知日期';
    const groupFiles = groupMap.get(day) ?? [];

    groupFiles.push(mappedFile);
    groupMap.set(day, groupFiles);
  });

  return Array.from(groupMap.entries()).map(([day, list]) => ({ day, list }));
};

const mapFileGroup = (group: FolderFileGroupResponse): FolderFileGroup => {
  return {
    addr: group.addr,
    day: group.day || '未知日期',
    list: (group.list ?? []).map(mapFile),
  };
};

const mapFile = (file: FolderFileResponse): FolderFileSummary => {
  const md5 = file.MD5 || file.md5 || '';
  const size = readOptionalNumber(file.fileSize, file.size);
  const dateValue = readDateValue(file.tokenAt || file.mtime);
  const modifiedValue = readDateValue(file.mtime);

  return {
    dateLabel: formatDateLabel(file.tokenAt || file.mtime),
    dateValue,
    duration: readOptionalNumber(file.duration),
    fileType: normalizeFileType(file.fileType || file.type),
    height: readOptionalNumber(file.height),
    id: file.id ?? 0,
    md5,
    modifiedDateLabel: formatDateLabel(file.mtime),
    modifiedValue,
    name: file.fileName || file.name || md5 || '未命名文件',
    sizeLabel: size === undefined ? undefined : formatFileSize(size),
    sizeValue: size,
    width: readOptionalNumber(file.width),
  };
};

const isFileGroupResponse = (item: FolderFileGroupResponse | FolderFileResponse): item is FolderFileGroupResponse => {
  return Array.isArray((item as FolderFileGroupResponse).list);
};

const parseCoverHashes = (value: string): string[] => {
  return value
    .split(',')
    .map((hash) => hash.trim())
    .filter(Boolean)
    .slice(0, 4);
};

const joinPath = (parentPath: string, name: string): string => {
  if (!parentPath) {
    return name ? `/${name}` : '';
  }

  return `${parentPath.replace(/\/+$/, '')}/${name}`;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};

const normalizeFileType = (fileType?: string): string => {
  return fileType?.toUpperCase?.() || 'FILE';
};

const formatDateLabel = (value?: number | string): string => {
  if (!value) {
    return '未知日期';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatFileSize = (size: number): string => {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

const readNumber = (...values: Array<number | string | undefined | null>): number => {
  return readOptionalNumber(...values) ?? 0;
};

const readOptionalNumber = (...values: Array<number | string | undefined | null>): number | undefined => {
  for (const value of values) {
    const numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
};

const readDateValue = (value?: number | string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
};

const createCoverGradient = (seed: number): string => {
  const gradients = [
    'linear-gradient(135deg,#dcfce7,#10b981 48%,#064e3b)',
    'linear-gradient(135deg,#dbeafe,#6366f1 52%,#111827)',
    'linear-gradient(135deg,#fef3c7,#f97316 54%,#7c2d12)',
    'linear-gradient(135deg,#fce7f3,#ec4899 50%,#831843)',
    'linear-gradient(135deg,#cffafe,#06b6d4 48%,#164e63)',
    'linear-gradient(135deg,#ede9fe,#8b5cf6 52%,#312e81)',
  ];

  return gradients[Math.abs(seed) % gradients.length];
};
