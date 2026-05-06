import type {
  FolderHistoryAction,
  FolderNavigationPreview,
} from './folder-page-types';

const FOLDER_ID_QUERY_KEY = 'folderId';
const FOLDER_HISTORY_STATE_KEY = '__kwphotoFolderHistory';

interface FolderHistoryState {
  [FOLDER_HISTORY_STATE_KEY]: true;
  folderId?: number;
  index: number;
  preview?: FolderNavigationPreview;
}

interface WriteFolderHistoryOptions {
  index?: number;
  preview?: FolderNavigationPreview;
}

/**
 * Reads the folder id from the current browser URL.
 */
export const readFolderIdFromLocation = (): number | undefined => {
  const folderId = Number(
    new URL(window.location.href).searchParams.get(FOLDER_ID_QUERY_KEY),
  );

  return Number.isInteger(folderId) && folderId > 0 ? folderId : undefined;
};

/**
 * Reads the current folder-specific history state when it was created by this page.
 */
export const readFolderHistoryState = (): FolderHistoryState | undefined => {
  const state = window.history.state as Partial<FolderHistoryState> | null;

  return state?.[FOLDER_HISTORY_STATE_KEY] ? state as FolderHistoryState : undefined;
};

/**
 * Writes the current folder id into browser history without reloading the app.
 */
export const writeFolderHistoryState = (
  folderId: number | undefined,
  action: FolderHistoryAction,
  options: WriteFolderHistoryOptions = {},
): void => {
  const state: FolderHistoryState = {
    [FOLDER_HISTORY_STATE_KEY]: true,
    folderId,
    index: options.index ?? readFolderHistoryState()?.index ?? 0,
    preview: options.preview,
  };
  const url = createFolderHistoryUrl(folderId);

  if (action === 'replace') {
    window.history.replaceState(state, '', url);
    return;
  }

  window.history.pushState(state, '', url);
};

const createFolderHistoryUrl = (folderId: number | undefined): string => {
  const url = new URL(window.location.href);

  if (folderId === undefined) {
    url.searchParams.delete(FOLDER_ID_QUERY_KEY);
  } else {
    url.searchParams.set(FOLDER_ID_QUERY_KEY, String(folderId));
  }

  return `${url.pathname}${url.search}${url.hash}`;
};
