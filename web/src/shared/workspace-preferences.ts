import { ADMIN_TAB_KEYS } from '@kwphoto/core';

import { THEME_NAMES } from './theme';
import type {
  AdminTab,
  FolderCardSize,
  FolderSortField,
  SortDirection,
  ThemeName,
  ViewMode,
  WorkspacePage,
} from './types';

const WORKSPACE_PREFERENCE_KEY = 'kwphoto:workspace-preferences';

const WORKSPACE_PAGES: WorkspacePage[] = [
  'photos',
  'recent',
  'albums',
  'folders',
  'people',
  'search',
  'tags',
  'map',
  'upload',
  'share',
  'trash',
  'hidden',
  'admin',
  'settings',
];

const VIEW_MODES: ViewMode[] = ['timeline', 'grid', 'list'];
const FOLDER_CARD_SIZES: FolderCardSize[] = ['small', 'medium', 'large'];
const FOLDER_SORT_FIELDS: FolderSortField[] = ['tokenAt', 'mtime', 'fileName', 'size', 'fileType'];
const SORT_DIRECTIONS: SortDirection[] = ['DESC', 'ASC'];
const ADMIN_TABS: AdminTab[] = [...ADMIN_TAB_KEYS];
const MOBILE_MENU_MIN_COUNT = 3;
const MOBILE_MENU_MAX_COUNT = 6;
const DEFAULT_MOBILE_MENU_PAGES: WorkspacePage[] = ['photos', 'folders', 'search', 'upload', 'admin', 'settings'];

export interface WorkspacePreferences {
  admin: WorkspaceAdminPreferences;
  activePage: WorkspacePage;
  activeTheme: ThemeName;
  folderViews: Record<string, WorkspaceFolderViewPreference>;
  localCache: WorkspaceLocalCachePreferences;
  login: WorkspaceLoginPreferences;
  mobileMenu: WorkspaceMobileMenuPreferences;
  serverAddresses: WorkspaceServerAddressPreferences;
  viewMode: ViewMode;
}

export interface WorkspaceAdminPreferences {
  activeTab: AdminTab;
}

export interface WorkspaceFolderSortPreference {
  direction: SortDirection;
  field: FolderSortField;
}

export interface WorkspaceFolderViewPreference {
  cardSize: FolderCardSize;
  showFolderCovers: boolean;
  sort: WorkspaceFolderSortPreference;
}

export interface WorkspaceLocalCachePreferences {
  enabled: boolean;
}

export interface WorkspaceLoginPreferences {
  serverUrl: string;
  username: string;
}

export interface WorkspaceMobileMenuPreferences {
  pages: WorkspacePage[];
}

export interface WorkspaceServerAddressPreferences {
  backupUrl: string;
  history: string[];
  preferred: WorkspaceServerAddressPreferenceRole;
  primaryUrl: string;
}

export type WorkspaceServerAddressPreferenceRole = 'primary' | 'backup';

const DEFAULT_FOLDER_VIEW_PREFERENCE: WorkspaceFolderViewPreference = {
  cardSize: 'medium',
  showFolderCovers: true,
  sort: {
    direction: 'DESC',
    field: 'tokenAt',
  },
};

const DEFAULT_WORKSPACE_PREFERENCES: WorkspacePreferences = {
  admin: {
    activeTab: 'overview',
  },
  activePage: 'photos',
  activeTheme: 'green',
  folderViews: {},
  localCache: {
    enabled: true,
  },
  login: {
    serverUrl: '',
    username: '',
  },
  mobileMenu: {
    pages: DEFAULT_MOBILE_MENU_PAGES,
  },
  serverAddresses: {
    backupUrl: '',
    history: [],
    preferred: 'primary',
    primaryUrl: '',
  },
  viewMode: 'timeline',
};

/**
 * Loads persisted workspace UI preferences with runtime fallback validation.
 */
export const loadWorkspacePreferences = (): WorkspacePreferences => {
  try {
    const rawPreferences = window.localStorage.getItem(WORKSPACE_PREFERENCE_KEY);

    if (!rawPreferences) {
      return DEFAULT_WORKSPACE_PREFERENCES;
    }

    const parsedPreferences = JSON.parse(rawPreferences) as Partial<WorkspacePreferences>;

    return {
      admin: parseAdminPreferences(parsedPreferences.admin),
      activePage: isWorkspacePage(parsedPreferences.activePage)
        ? parsedPreferences.activePage
        : DEFAULT_WORKSPACE_PREFERENCES.activePage,
      activeTheme: isThemeName(parsedPreferences.activeTheme)
        ? parsedPreferences.activeTheme
        : DEFAULT_WORKSPACE_PREFERENCES.activeTheme,
      folderViews: parseFolderViews(parsedPreferences.folderViews),
      localCache: parseLocalCachePreferences(parsedPreferences.localCache),
      login: parseLoginPreferences(parsedPreferences.login),
      mobileMenu: parseMobileMenuPreferences(parsedPreferences.mobileMenu),
      serverAddresses: parseServerAddressPreferences(parsedPreferences.serverAddresses),
      viewMode: isViewMode(parsedPreferences.viewMode)
        ? parsedPreferences.viewMode
        : DEFAULT_WORKSPACE_PREFERENCES.viewMode,
    };
  } catch {
    return DEFAULT_WORKSPACE_PREFERENCES;
  }
};

/**
 * Persists workspace UI preferences for refresh and relaunch restoration.
 */
export const saveWorkspacePreferences = (preferences: Partial<WorkspacePreferences>): void => {
  try {
    window.localStorage.setItem(
      WORKSPACE_PREFERENCE_KEY,
      JSON.stringify({
        ...loadWorkspacePreferences(),
        ...preferences,
      }),
    );
  } catch {
    // Storage can be unavailable in private contexts; UI should keep working.
  }
};

/**
 * Reads admin-center preferences from the unified workspace preference object.
 */
export const readAdminPreferences = (): WorkspaceAdminPreferences => {
  return loadWorkspacePreferences().admin;
};

/**
 * Persists admin-center preferences into the unified workspace preference object.
 */
export const writeAdminPreferences = (preferences: WorkspaceAdminPreferences): void => {
  saveWorkspacePreferences({ admin: parseAdminPreferences(preferences) });
};

/**
 * Reads login-page preferences from the unified workspace preference object.
 */
export const readLoginPreferences = (): WorkspaceLoginPreferences => {
  return loadWorkspacePreferences().login;
};

/**
 * Persists login-page preferences without storing passwords or tokens.
 */
export const writeLoginPreferences = (preferences: WorkspaceLoginPreferences): void => {
  saveWorkspacePreferences({ login: preferences });
};

/**
 * Reads mobile bottom-menu preferences from the unified workspace object.
 */
export const readMobileMenuPreferences = (): WorkspaceMobileMenuPreferences => {
  return loadWorkspacePreferences().mobileMenu;
};

/**
 * Persists mobile bottom-menu preferences with count and required-page guards.
 */
export const writeMobileMenuPreferences = (preferences: WorkspaceMobileMenuPreferences): void => {
  saveWorkspacePreferences({ mobileMenu: parseMobileMenuPreferences(preferences) });
};

/**
 * Reads server address preferences from the unified workspace object.
 */
export const readServerAddressPreferences = (): WorkspaceServerAddressPreferences => {
  return loadWorkspacePreferences().serverAddresses;
};

/**
 * Persists server address preferences and records every saved primary/backup address.
 */
export const writeServerAddressPreferences = (preferences: WorkspaceServerAddressPreferences): void => {
  const currentPreferences = loadWorkspacePreferences();
  const serverAddresses = parseServerAddressPreferences({
    ...preferences,
    history: [
      ...preferences.history,
      preferences.primaryUrl,
      preferences.backupUrl,
    ],
  });
  const preferredServerUrl = getPreferredServerUrl(serverAddresses);

  saveWorkspacePreferences({
    login: {
      ...currentPreferences.login,
      serverUrl: preferredServerUrl || currentPreferences.login.serverUrl,
    },
    serverAddresses,
  });
};

/**
 * Returns server addresses ordered by the configured preference.
 */
export const getServerAddressCandidates = (preferences: WorkspaceServerAddressPreferences): string[] => {
  const preferredUrl = getPreferredServerUrl(preferences);
  const fallbackUrl = preferences.preferred === 'backup' ? preferences.primaryUrl : preferences.backupUrl;

  return normalizeServerAddressList([preferredUrl, fallbackUrl]);
};

/**
 * Reads local-cache UI preferences from the unified workspace preference object.
 */
export const readLocalCachePreferences = (): WorkspaceLocalCachePreferences => {
  return loadWorkspacePreferences().localCache;
};

/**
 * Persists local-cache UI preferences into the unified workspace preference object.
 */
export const writeLocalCachePreferences = (preferences: WorkspaceLocalCachePreferences): void => {
  saveWorkspacePreferences({ localCache: preferences });
};

/**
 * Reads one account's folder view preferences from the unified workspace object.
 */
export const readFolderViewWorkspacePreference = (accountKey: string): WorkspaceFolderViewPreference => {
  return loadWorkspacePreferences().folderViews[accountKey] ?? createDefaultFolderViewPreference();
};

/**
 * Persists one account's folder view preferences into the unified workspace object.
 */
export const writeFolderViewWorkspacePreference = (
  accountKey: string,
  preference: WorkspaceFolderViewPreference,
): void => {
  const currentPreferences = loadWorkspacePreferences();

  saveWorkspacePreferences({
    folderViews: {
      ...currentPreferences.folderViews,
      [accountKey]: parseFolderViewPreference(preference),
    },
  });
};

export const createDefaultFolderViewPreference = (): WorkspaceFolderViewPreference => {
  return {
    cardSize: DEFAULT_FOLDER_VIEW_PREFERENCE.cardSize,
    showFolderCovers: DEFAULT_FOLDER_VIEW_PREFERENCE.showFolderCovers,
    sort: { ...DEFAULT_FOLDER_VIEW_PREFERENCE.sort },
  };
};

const isWorkspacePage = (value: unknown): value is WorkspacePage => {
  return typeof value === 'string' && WORKSPACE_PAGES.includes(value as WorkspacePage);
};

const isThemeName = (value: unknown): value is ThemeName => {
  return typeof value === 'string' && THEME_NAMES.includes(value as ThemeName);
};

const isViewMode = (value: unknown): value is ViewMode => {
  return typeof value === 'string' && VIEW_MODES.includes(value as ViewMode);
};

const isAdminTab = (value: unknown): value is AdminTab => {
  return typeof value === 'string' && ADMIN_TABS.includes(value as AdminTab);
};

const parseFolderViews = (value: unknown): Record<string, WorkspaceFolderViewPreference> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, preference]) => [key, parseFolderViewPreference(preference)]),
  );
};

const parseAdminPreferences = (value: unknown): WorkspaceAdminPreferences => {
  if (!isRecord(value)) {
    return DEFAULT_WORKSPACE_PREFERENCES.admin;
  }

  return {
    activeTab: isAdminTab(value.activeTab)
      ? value.activeTab
      : DEFAULT_WORKSPACE_PREFERENCES.admin.activeTab,
  };
};

const parseFolderViewPreference = (value: unknown): WorkspaceFolderViewPreference => {
  if (!isRecord(value)) {
    return createDefaultFolderViewPreference();
  }

  const sort = isRecord(value.sort) ? value.sort : {};

  return {
    cardSize: isFolderCardSize(value.cardSize)
      ? value.cardSize
      : DEFAULT_FOLDER_VIEW_PREFERENCE.cardSize,
    showFolderCovers: typeof value.showFolderCovers === 'boolean'
      ? value.showFolderCovers
      : DEFAULT_FOLDER_VIEW_PREFERENCE.showFolderCovers,
    sort: {
      direction: isSortDirection(sort.direction)
        ? sort.direction
        : DEFAULT_FOLDER_VIEW_PREFERENCE.sort.direction,
      field: isFolderSortField(sort.field)
        ? sort.field
        : DEFAULT_FOLDER_VIEW_PREFERENCE.sort.field,
    },
  };
};

const parseLocalCachePreferences = (value: unknown): WorkspaceLocalCachePreferences => {
  if (!isRecord(value)) {
    return DEFAULT_WORKSPACE_PREFERENCES.localCache;
  }

  return {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
  };
};

const parseLoginPreferences = (value: unknown): WorkspaceLoginPreferences => {
  if (!isRecord(value)) {
    return DEFAULT_WORKSPACE_PREFERENCES.login;
  }

  return {
    serverUrl: typeof value.serverUrl === 'string' ? value.serverUrl : '',
    username: typeof value.username === 'string' ? value.username : '',
  };
};

const parseMobileMenuPreferences = (value: unknown): WorkspaceMobileMenuPreferences => {
  if (!isRecord(value)) {
    return DEFAULT_WORKSPACE_PREFERENCES.mobileMenu;
  }

  return {
    pages: normalizeMobileMenuPages(Array.isArray(value.pages) ? value.pages : []),
  };
};

const parseServerAddressPreferences = (value: unknown): WorkspaceServerAddressPreferences => {
  if (!isRecord(value)) {
    return DEFAULT_WORKSPACE_PREFERENCES.serverAddresses;
  }

  const primaryUrl = normalizeServerAddress(value.primaryUrl);
  const backupUrl = normalizeServerAddress(value.backupUrl);
  const preferred = value.preferred === 'backup' ? 'backup' : 'primary';
  const rawHistory = Array.isArray(value.history) ? value.history : [];

  return {
    backupUrl,
    history: normalizeServerAddressList([primaryUrl, backupUrl, ...rawHistory]),
    preferred,
    primaryUrl,
  };
};

const normalizeMobileMenuPages = (pages: unknown[]): WorkspacePage[] => {
  const selectedPages = pages.filter(isWorkspacePage);
  const uniquePages = Array.from(new Set(selectedPages)).filter((page) => page !== 'settings');
  const nextPages = uniquePages.slice(0, MOBILE_MENU_MAX_COUNT - 1);

  DEFAULT_MOBILE_MENU_PAGES.forEach((page) => {
    if (nextPages.length >= MOBILE_MENU_MIN_COUNT - 1 || page === 'settings' || nextPages.includes(page)) {
      return;
    }

    nextPages.push(page);
  });

  return [...nextPages.slice(0, MOBILE_MENU_MAX_COUNT - 1), 'settings'];
};

const normalizeServerAddress = (value: unknown): string => {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
};

const normalizeServerAddressList = (addresses: unknown[]): string[] => {
  return Array.from(new Set(addresses.map(normalizeServerAddress).filter(Boolean)));
};

export const getPreferredServerUrl = (preferences: WorkspaceServerAddressPreferences): string => {
  if (preferences.preferred === 'backup') {
    return preferences.backupUrl || preferences.primaryUrl;
  }

  return preferences.primaryUrl || preferences.backupUrl;
};

const isFolderCardSize = (value: unknown): value is FolderCardSize => {
  return typeof value === 'string' && FOLDER_CARD_SIZES.includes(value as FolderCardSize);
};

const isFolderSortField = (value: unknown): value is FolderSortField => {
  return typeof value === 'string' && FOLDER_SORT_FIELDS.includes(value as FolderSortField);
};

const isSortDirection = (value: unknown): value is SortDirection => {
  return typeof value === 'string' && SORT_DIRECTIONS.includes(value as SortDirection);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};
