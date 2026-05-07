import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { ADMIN_TAB_KEYS, isAdminTab } from '@kwphoto/core';
import type { AdminTab } from '@kwphoto/core';

import type { MobilePage, MobileSession } from './mobile-types';

export type MobileFolderCardSize = 'small' | 'medium' | 'large';
export type MobileFolderSortDirection = 'ASC' | 'DESC';
export type MobileFolderSortField = 'tokenAt' | 'mtime' | 'fileName' | 'size' | 'fileType';
export type MobileFolderViewMode = 'grid' | 'list';
export type MobileAdminTab = AdminTab;
export type MobileServerAddressRole = 'primary' | 'backup';
export type MobileThemeName =
  | 'blue'
  | 'cyan'
  | 'gray'
  | 'green'
  | 'indigo'
  | 'orange'
  | 'pink'
  | 'purple'
  | 'red'
  | 'rose'
  | 'teal'
  | 'yellow';

export interface MobilePreferences {
  activeAdminTab?: MobileAdminTab;
  activePage?: MobilePage;
  activeTheme?: MobileThemeName;
  backupServerUrl?: string;
  currentFolderId?: number;
  folderCardSize?: MobileFolderCardSize;
  folderSortDirection?: MobileFolderSortDirection;
  folderSortField?: MobileFolderSortField;
  folderViewMode?: MobileFolderViewMode;
  lastUsername?: string;
  localCacheEnabled?: boolean;
  mobileMenuPages?: MobilePage[];
  preferredServerAddress?: MobileServerAddressRole;
  primaryServerUrl?: string;
  serverAddressHistory?: string[];
  serverUrl?: string;
  showFolderCovers?: boolean;
  updatedAt?: number;
}

const SESSION_KEY = 'kwphoto.mobile.session.v1';
const PREFERENCES_KEY = 'kwphoto.mobile.preferences.v1';

export const DEFAULT_MOBILE_SERVER_URL = 'https://d.mtmt.tech';
export const MOBILE_ADMIN_TABS: MobileAdminTab[] = [...ADMIN_TAB_KEYS];

/**
 * Reads the persisted authenticated mobile session from secure storage.
 */
export const readMobileSession = async (): Promise<MobileSession | undefined> => {
  const rawValue = await SecureStore.getItemAsync(SESSION_KEY);

  return parseJson<MobileSession>(rawValue);
};

/**
 * Persists the authenticated mobile session in secure storage.
 */
export const writeMobileSession = async (session: MobileSession): Promise<void> => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

/**
 * Clears only the authenticated session while preserving non-sensitive preferences.
 */
export const clearMobileSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};

/**
 * Reads mobile user behavior preferences from AsyncStorage.
 */
export const readMobilePreferences = async (): Promise<MobilePreferences> => {
  return parseJson<MobilePreferences>(await AsyncStorage.getItem(PREFERENCES_KEY)) ?? {};
};

/**
 * Merges user behavior preferences and keeps the latest write timestamp.
 */
export const mergeMobilePreferences = async (patch: MobilePreferences): Promise<MobilePreferences> => {
  const current = await readMobilePreferences();
  const nextPreferences: MobilePreferences = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(nextPreferences));
  return nextPreferences;
};

/**
 * Checks whether a persisted value is a supported mobile admin center tab.
 */
export const isMobileAdminTab = (value: unknown): value is MobileAdminTab => {
  return isAdminTab(value);
};

/**
 * Resets view behavior preferences but preserves connection hints.
 */
export const resetMobileBehaviorPreferences = async (): Promise<MobilePreferences> => {
  const current = await readMobilePreferences();
  const nextPreferences: MobilePreferences = {
    activeTheme: current.activeTheme,
    backupServerUrl: current.backupServerUrl,
    folderCardSize: current.folderCardSize,
    folderSortDirection: current.folderSortDirection,
    folderSortField: current.folderSortField,
    folderViewMode: current.folderViewMode,
    lastUsername: current.lastUsername,
    localCacheEnabled: current.localCacheEnabled,
    mobileMenuPages: current.mobileMenuPages,
    preferredServerAddress: current.preferredServerAddress,
    primaryServerUrl: current.primaryServerUrl,
    serverAddressHistory: current.serverAddressHistory,
    serverUrl: current.serverUrl,
    showFolderCovers: current.showFolderCovers,
    updatedAt: Date.now(),
  };

  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(nextPreferences));
  return nextPreferences;
};

/**
 * Normalizes persisted server addresses the same way as the Web workspace preferences.
 */
export const normalizeMobileServerAddress = (value: unknown): string => {
  return typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
};

/**
 * Deduplicates server address candidates while keeping their priority order.
 */
export const normalizeMobileServerAddressList = (addresses: unknown[]): string[] => {
  return Array.from(new Set(addresses.map(normalizeMobileServerAddress).filter(Boolean)));
};

/**
 * Returns the configured preferred server, falling back to the other configured slot.
 */
export const getPreferredMobileServerUrl = (
  preferences: Pick<MobilePreferences, 'backupServerUrl' | 'preferredServerAddress' | 'primaryServerUrl'>,
): string => {
  const primaryUrl = normalizeMobileServerAddress(preferences.primaryServerUrl);
  const backupUrl = normalizeMobileServerAddress(preferences.backupServerUrl);

  if (preferences.preferredServerAddress === 'backup') {
    return backupUrl || primaryUrl;
  }

  return primaryUrl || backupUrl;
};

/**
 * Returns primary/backup server addresses ordered by the saved preference.
 */
export const getMobileServerAddressCandidates = (
  preferences: Pick<MobilePreferences, 'backupServerUrl' | 'preferredServerAddress' | 'primaryServerUrl'>,
): string[] => {
  const primaryUrl = normalizeMobileServerAddress(preferences.primaryServerUrl);
  const backupUrl = normalizeMobileServerAddress(preferences.backupServerUrl);
  const preferredUrl = getPreferredMobileServerUrl(preferences);
  const fallbackUrl = preferences.preferredServerAddress === 'backup' ? primaryUrl : backupUrl;

  return normalizeMobileServerAddressList([preferredUrl, fallbackUrl]);
};

/**
 * Extends configured addresses with the active login/session address for startup recovery.
 */
export const getMobileRuntimeServerCandidates = (
  preferences: MobilePreferences,
  fallbackUrl?: string,
): string[] => {
  return normalizeMobileServerAddressList([
    ...getMobileServerAddressCandidates(preferences),
    fallbackUrl,
    preferences.serverUrl,
    DEFAULT_MOBILE_SERVER_URL,
  ]);
};

const parseJson = <TValue>(value: string | null | undefined): TValue | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value) as TValue;
  } catch {
    return undefined;
  }
};
