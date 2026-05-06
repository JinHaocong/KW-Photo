export type ThumbnailType =
  | 'h220'
  | 's260'
  | 'preview'
  | 'poster'
  | 'proxy'
  | 'portrait'
  | 'live_preview';

export type FilePreviewType = 'proxy' | 'hd' | 'ori' | 'transcode' | 'motion';
export type VideoPreviewType = 'direct' | 'transcode' | 'flv' | 'motion';

/**
 * Builds a loadable MT Photos thumbnail URL.
 * @param params Media URL params from current session and file metadata.
 * @returns Absolute thumbnail URL, or undefined when required auth data is absent.
 */
export const createThumbnailUrl = ({
  authCode,
  baseUrl,
  md5,
  type = 'h220',
}: {
  authCode?: string;
  baseUrl: string;
  md5?: string;
  type?: ThumbnailType;
}): string | undefined => {
  if (!authCode || !md5) {
    return undefined;
  }

  const url = new URL(`/gateway/${type}/${encodeURIComponent(md5)}`, normalizeBaseUrl(baseUrl));
  url.searchParams.set('auth_code', authCode);

  return normalizeMediaTargetUrl(url).toString();
};

/**
 * Builds a loadable MT Photos file preview URL.
 * @param params Media URL params from current session and file metadata.
 * @returns Absolute preview URL, or undefined when file identity or auth data is absent.
 */
export const createFilePreviewUrl = ({
  authCode,
  baseUrl,
  id,
  md5,
  type = 'proxy',
}: {
  authCode?: string;
  baseUrl: string;
  id?: number;
  md5?: string;
  type?: FilePreviewType;
}): string | undefined => {
  if (!authCode || !md5 || !id || id <= 0) {
    return undefined;
  }

  const url = new URL(`/gateway/file/${id}/${encodeURIComponent(md5)}`, normalizeBaseUrl(baseUrl));
  url.searchParams.set('auth_code', authCode);
  url.searchParams.set('type', type);

  return normalizeMediaTargetUrl(url).toString();
};

/**
 * Builds a loadable MT Photos video URL.
 * @param params Video URL params from current session and file metadata.
 * @returns Absolute video URL, or undefined when file identity or auth data is absent.
 */
export const createVideoPreviewUrl = ({
  authCode,
  baseUrl,
  id,
  md5,
  type = 'direct',
}: {
  authCode?: string;
  baseUrl: string;
  id?: number;
  md5?: string;
  type?: VideoPreviewType;
}): string | undefined => {
  if (!authCode || !md5 || !id || id <= 0) {
    return undefined;
  }

  const url = new URL(createVideoPreviewPath(id, md5, type), normalizeBaseUrl(baseUrl));

  url.searchParams.set('auth_code', authCode);

  if (type === 'transcode') {
    url.searchParams.set('type', 'transcode');
  }

  if (type === 'motion') {
    url.searchParams.set('type', 'video');
  }

  return normalizeMediaTargetUrl(url).toString();
};

/**
 * Builds an absolute URL for server-hosted static assets such as flv.min.js.
 * @param params Server base URL and asset path.
 * @returns Absolute asset URL.
 */
export const createServerAssetUrl = ({
  baseUrl,
  path,
}: {
  baseUrl: string;
  path: string;
}): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return new URL(normalizedPath, normalizeBaseUrl(baseUrl)).toString();
};

const createVideoPreviewPath = (id: number, md5: string, type: VideoPreviewType): string => {
  const encodedMd5 = encodeURIComponent(md5);

  if (type === 'flv') {
    return `/gateway/flv/${id}/${encodedMd5}`;
  }

  if (type === 'motion') {
    return `/gateway/fileMotion/${id}/${encodedMd5}`;
  }

  return `/gateway/file/${id}/${encodedMd5}`;
};

const normalizeBaseUrl = (baseUrl: string): string => {
  return baseUrl.replace(/\/+$/, '');
};

/**
 * Keeps private/local media hosts on HTTP, but uses HTTPS for public hosts.
 */
const normalizeMediaTargetUrl = (url: URL): URL => {
  if (url.protocol !== 'http:' || isPrivateHost(url.hostname)) {
    return url;
  }

  const nextUrl = new URL(url.toString());
  nextUrl.protocol = 'https:';

  return nextUrl;
};

const isPrivateHost = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname === '::1' ||
    hostname === '[::1]'
  );
};
