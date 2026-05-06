import type { FolderCardSize, FolderSortField, SortDirection } from '../../shared/types';
import {
  readFolderViewWorkspacePreference,
  writeFolderViewWorkspacePreference,
} from '../../shared/workspace-preferences';
import type { FolderViewPreference } from './folder-page-types';

export const FOLDER_CARD_SIZE_LABEL: Record<FolderCardSize, string> = {
  large: '大',
  medium: '中',
  small: '小',
};
export const FOLDER_CARD_SIZE_OPTIONS: FolderCardSize[] = ['small', 'medium', 'large'];
export const SORT_DIRECTION_LABEL: Record<SortDirection, string> = {
  ASC: '升序',
  DESC: '降序',
};
export const SORT_FIELD_LABEL: Record<FolderSortField, string> = {
  fileName: '文件名',
  fileType: '类型',
  mtime: '修改时间',
  size: '大小',
  tokenAt: '拍摄时间',
};
export const SORT_FIELD_OPTIONS: FolderSortField[] = ['tokenAt', 'mtime', 'fileName', 'size', 'fileType'];
export const SORT_DIRECTION_OPTIONS: SortDirection[] = ['DESC', 'ASC'];

/** Reads folder UI preferences from the unified workspace preference object. */
export const loadFolderViewPreference = (userId?: number): FolderViewPreference => {
  return readFolderViewWorkspacePreference(getFolderPreferenceStorageSuffix(userId));
};

/** Persists folder UI preferences into the unified workspace preference object. */
export const saveFolderViewPreference = (userId: number | undefined, preference: FolderViewPreference): void => {
  writeFolderViewWorkspacePreference(getFolderPreferenceStorageSuffix(userId), preference);
};

const getFolderPreferenceStorageSuffix = (userId?: number): string => {
  return userId === undefined ? 'default' : String(userId);
};
