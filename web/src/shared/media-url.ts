export type {
  FilePreviewType,
  ThumbnailType,
  VideoPreviewType,
} from '@kwphoto/core/media-url';
export {
  createFilePreviewUrl,
  createServerAssetUrl,
  createThumbnailUrl,
  createVideoPreviewUrl,
} from '@kwphoto/core/media-url';

import { getDesktopBridge } from '../platform/desktop-bridge';

const DEV_MEDIA_PROXY_PATH = '/__kwphoto_mt_proxy';

/**
 * Converts cross-origin media URLs to a same-origin dev proxy URL for local Web preview.
 * Desktop builds with a native media bridge return undefined because media should render from cached Blob URLs.
 */
export const createBrowserMediaUrl = (url?: string): string | undefined => {
  if (!url || hasNativeMediaBridge()) {
    return undefined;
  }

  if (!shouldUseLocalMediaProxy(url)) {
    return url;
  }

  return `${DEV_MEDIA_PROXY_PATH}?target=${encodeURIComponent(url)}`;
};

/**
 * Uses the Vite media proxy only in a browser served from localhost.
 */
const shouldUseLocalMediaProxy = (targetUrl: string): boolean => {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return false;
  }

  try {
    const targetOrigin = new URL(targetUrl).origin;
    const currentHostname = window.location.hostname;

    return targetOrigin !== window.location.origin && isLocalDevHost(currentHostname);
  } catch {
    return false;
  }
};

const isLocalDevHost = (hostname: string): boolean => {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
};

const hasNativeMediaBridge = (): boolean => {
  return Boolean(getDesktopBridge()?.localCache);
};
