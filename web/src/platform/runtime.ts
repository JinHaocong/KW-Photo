import { getDesktopBridge, isElectronRuntime, type DesktopRuntimeInfo } from './desktop-bridge';

export type RuntimeKind = 'web' | 'electron';

/**
 * Detects whether the app is running inside the Electron desktop shell.
 * @returns Current runtime kind.
 */
export const getRuntimeKind = (): RuntimeKind => {
  return isElectronRuntime() ? 'electron' : 'web';
};

/**
 * Returns the platform label used by diagnostics and settings screens.
 * @returns Human-readable platform label.
 */
export const getPlatformLabel = (): string => {
  const runtime = getRuntimeKind();

  if (runtime === 'electron') {
    return 'Electron App';
  }

  return 'Web Browser';
};

/**
 * Reads detailed Electron runtime information when the desktop preload bridge is available.
 */
export const readDesktopRuntimeInfo = async (): Promise<DesktopRuntimeInfo | undefined> => {
  return getDesktopBridge()?.getRuntimeInfo();
};
