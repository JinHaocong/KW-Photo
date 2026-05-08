export interface DesktopRuntimeInfo {
  platform: string;
  versions: {
    chrome?: string;
    electron?: string;
    node?: string;
  };
}

export interface DesktopLocalCacheBridge {
  clear: (params: { scope?: string | null }) => Promise<void>;
  clearAll: () => Promise<void>;
  clearUnused: () => Promise<void>;
  deleteFolder: (params: { folderScopeKey: string }) => Promise<void>;
  fetchMedia: (params: { url: string }) => Promise<{
    blobBytes: number[];
    contentType?: string;
    statusCode: number;
  }>;
  inspect: () => Promise<{
    records: unknown[];
    unusedCount: number;
    unusedSize: number;
  }>;
  listRecords: (params: { scope?: string | null }) => Promise<unknown[]>;
  readRecord: (params: { key: string }) => Promise<unknown>;
  storageInfo: () => Promise<{
    blobsDir: string;
    indexPath: string;
    rootDir: string;
  }>;
  writeRecord: (params: { blobBytes: number[] | null; record: unknown }) => Promise<void>;
}

export interface KwphotoDesktopBridge {
  getRuntimeInfo: () => Promise<DesktopRuntimeInfo>;
  localCache?: DesktopLocalCacheBridge;
  platform: string;
}

declare global {
  interface Window {
    kwphotoDesktop?: KwphotoDesktopBridge;
  }
}

/**
 * Reads the Electron preload bridge when the Web app is hosted by the desktop shell.
 */
export const getDesktopBridge = (): KwphotoDesktopBridge | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.kwphotoDesktop;
};

/**
 * Detects whether the current renderer is running inside the Electron shell.
 */
export const isElectronRuntime = (): boolean => {
  return Boolean(getDesktopBridge());
};
