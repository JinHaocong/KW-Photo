import {
  Copy,
  Check,
  Download,
  Image as ImageIcon,
  Images,
  Info,
  MoreVertical,
  RefreshCw,
  RotateCw,
  Share2,
  SlidersHorizontal,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';

import { useCachedMediaUrl } from '../hooks/useCachedMediaUrl';
import { getDesktopBridge } from '../platform/desktop-bridge';
import { getApiErrorMessage } from '../services/api-client';
import type { FileAlbumSummary } from '../services/file-operations-service';
import type { FileDetail } from '../services/media-service';
import {
  cacheMediaResourceFromUrl,
  fetchMediaResourceBlob,
  subscribeLocalCacheChanges,
} from '../shared/local-cache';
import type { LocalCacheChangeDetail, LocalCacheFolderRef } from '../shared/local-cache';
import {
  createBrowserMediaUrl,
  createFilePreviewUrl,
  createThumbnailUrl,
  createVideoPreviewUrl,
} from '../shared/media-url';
import type { FolderFileSummary } from '../shared/types';
import { VIDEO_TYPES } from './FolderBrowser';

type PreviewSlide = Slide & {
  file: FolderFileSummary;
  thumbnailSrc?: string;
};

type PreviewImageSource = 'hd' | 'original' | 'thumbnail';
type PreviewMode = 'original' | 'thumbnail';
type PreviewBusyAction = 'album' | 'delete' | 'favorite' | 'refresh' | 'share';

interface PreviewMetaRow {
  label: string;
  value: string;
}

interface PreviewMembershipState {
  albumIds: number[];
  favoriteAlbumId?: number;
  favoriteFileIds: number[];
}

interface PreviewAlbumsState {
  albumIds: number[];
  albums: FileAlbumSummary[];
}

interface PreviewControlsProps {
  busyAction?: PreviewBusyAction;
  cacheLabel: string;
  detailError: string;
  detailLoading: boolean;
  displayName: string;
  downloading: boolean;
  favorite: boolean;
  hdReady: boolean;
  imageSource: PreviewImageSource;
  isVideo: boolean;
  metaRows: PreviewMetaRow[];
  mobileMetaVisible: boolean;
  onClose: () => void;
  onCopyMd5: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onOpenAlbums: () => void;
  onRefreshDescriptor: () => void;
  onRefreshInfo: () => void;
  onRefreshThumbs: () => void;
  onRotate: () => void;
  onShare: () => void;
  onToggleFavorite: () => void;
  onTogglePreviewMode: () => void;
  onToggleMobileMeta: () => void;
  previewActionDisabled: boolean;
  previewActionLabel: string;
  previewMode: PreviewMode;
  rotateDisabled: boolean;
  selectedIndex: number;
  total: number;
  videoPreparing: boolean;
  videoUsesTranscode: boolean;
}

const LIGHTBOX_MOBILE_QUERY = '(max-width: 860px)';
const PREVIEW_THUMBNAIL_PRELOAD_RADIUS = 3;
const DIRECT_VIDEO_PREVIEW_TYPES = new Set(['MP4', 'MOV', 'M4V']);
const VIDEO_TYPE_KEYWORDS = [
  'video',
  'mp4',
  'mov',
  'm4v',
  'webm',
  'ogg',
  'ogv',
  'avi',
  'mkv',
  'flv',
  'mts',
  'm2ts',
  '3gp',
  'quicktime',
];

export const FilePreviewDialog = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  file,
  files = [],
  onClose,
  onDeleteFile,
  onDownloadFile,
  onLoadPreviewAlbums,
  onLoadPreviewMembership,
  onLoadFileDetail,
  onPrepareVideoPreview,
  onRefreshPreviewDescriptor,
  onRefreshPreviewInfo,
  onRefreshPreviewThumbs,
  onSelectFile,
  onShareFile,
  onShowToast,
  onTogglePreviewAlbum,
  onTogglePreviewFavorite,
  serverUrl,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  file?: FolderFileSummary;
  files?: FolderFileSummary[];
  onClose: () => void;
  onDeleteFile?: (file: FolderFileSummary) => Promise<void>;
  onDownloadFile: (file: FolderFileSummary) => Promise<void>;
  onLoadFileDetail: (file: FolderFileSummary) => Promise<FileDetail>;
  onLoadPreviewAlbums?: (file: FolderFileSummary) => Promise<PreviewAlbumsState>;
  onLoadPreviewMembership?: (file: FolderFileSummary) => Promise<PreviewMembershipState>;
  onPrepareVideoPreview?: (file: FolderFileSummary) => Promise<void>;
  onRefreshPreviewDescriptor?: (file: FolderFileSummary) => Promise<number | undefined>;
  onRefreshPreviewInfo?: (file: FolderFileSummary) => Promise<FileDetail | void>;
  onRefreshPreviewThumbs?: (file: FolderFileSummary) => Promise<void>;
  onSelectFile?: (file: FolderFileSummary) => void;
  onShareFile?: (file: FolderFileSummary) => Promise<void>;
  onShowToast: (message: string) => void;
  onTogglePreviewAlbum?: (
    file: FolderFileSummary,
    album: FileAlbumSummary,
    included: boolean,
    currentAlbumIds: number[],
  ) => Promise<number[] | void>;
  onTogglePreviewFavorite?: (
    file: FolderFileSummary,
    state: {
      favoriteAlbumId?: number;
      isFavorite: boolean;
    },
  ) => Promise<number | undefined>;
  serverUrl: string;
}) => {
  const [detail, setDetail] = useState<FileDetail>();
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lightboxCacheVersion, setLightboxCacheVersion] = useState(0);
  const [mobileMetaVisible, setMobileMetaVisible] = useState(false);
  const [previewAlbumIds, setPreviewAlbumIds] = useState<number[]>([]);
  const [previewAlbums, setPreviewAlbums] = useState<FileAlbumSummary[]>([]);
  const [previewAlbumsError, setPreviewAlbumsError] = useState('');
  const [previewAlbumsLoading, setPreviewAlbumsLoading] = useState(false);
  const [previewAlbumsOpen, setPreviewAlbumsOpen] = useState(false);
  const [previewBusyAction, setPreviewBusyAction] = useState<PreviewBusyAction>();
  const [previewDisplayedImageSource, setPreviewDisplayedImageSource] = useState<PreviewImageSource>('thumbnail');
  const [previewDisplayedImageUrl, setPreviewDisplayedImageUrl] = useState<string>();
  const [previewFavoriteAlbumId, setPreviewFavoriteAlbumId] = useState<number>();
  const [previewFavoriteFileIds, setPreviewFavoriteFileIds] = useState<number[]>([]);
  const [previewHdLoadedUrl, setPreviewHdLoadedUrl] = useState<string>();
  const [previewMode, setPreviewMode] = useState<PreviewMode>('thumbnail');
  const [previewPendingImageSource, setPreviewPendingImageSource] = useState<PreviewImageSource>();
  const [previewRotation, setPreviewRotation] = useState(0);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const previewAutoOriginalSessionRef = useRef<string | undefined>(undefined);
  const previewHdLoadRequestRef = useRef(0);
  const previewImageLoadRequestRef = useRef(0);
  const previewModeRef = useRef<PreviewMode>('thumbnail');
  const nativeAppRuntime = isNativeAppRuntime();
  const previewFiles = useMemo(() => normalizePreviewFiles(file, files), [file, files]);
  const currentIndex = file ? previewFiles.findIndex((item) => isSamePreviewFile(item, file)) : -1;
  const selectedIndex = Math.max(0, currentIndex);
  const activeFile = currentIndex >= 0 ? previewFiles[currentIndex] : file;
  const activeFileKey = activeFile ? createPreviewMediaKey(activeFile) : undefined;
  const activeIsVideo = Boolean(activeFile && isVideoFileType(activeFile.fileType));
  const activePosterUrl = activeFile
    ? createThumbnailUrl({
        authCode,
        baseUrl: serverUrl,
        md5: activeFile.md5,
        type: activeIsVideo ? 'poster' : 'h220',
      })
    : undefined;
  const activeHdImageUrl = activeFile && !activeIsVideo
    ? createFilePreviewUrl({
        authCode,
        baseUrl: serverUrl,
        id: activeFile.id,
        md5: activeFile.md5,
        type: 'hd',
      })
    : undefined;
  const activeOriginalImageUrl = activeFile && !activeIsVideo
    ? createFilePreviewUrl({
        authCode,
        baseUrl: serverUrl,
        id: activeFile.id,
        md5: activeFile.md5,
        type: 'ori',
      })
    : undefined;
  const activeVideoDirectUrl = activeFile && activeIsVideo
    ? createVideoPreviewUrl({
        authCode,
        baseUrl: serverUrl,
        id: activeFile.id,
        md5: activeFile.md5,
        type: 'direct',
      })
    : undefined;
  const activeVideoTranscodeUrl = activeFile && activeIsVideo
    ? createVideoPreviewUrl({
        authCode,
        baseUrl: serverUrl,
        id: activeFile.id,
        md5: activeFile.md5,
        type: 'transcode',
      })
    : undefined;
  const activeVideoPlaybackUrl = activeFile && activeIsVideo
    ? getVideoPlaybackUrl(activeFile, activeVideoDirectUrl, activeVideoTranscodeUrl)
    : undefined;
  const activeOriginalMediaUrl = activeIsVideo ? activeVideoPlaybackUrl : activeOriginalImageUrl;
  const activeHdImageCache = useCachedMediaUrl({
    enabled: Boolean(activeHdImageUrl),
    fetchOnMiss: cacheEnabled || nativeAppRuntime,
    fileId: activeFile?.id,
    folder: cacheFolder,
    kind: 'file-hd-thumbnail',
    md5: activeFile?.md5,
    persistFetchedResource: cacheEnabled,
    showSourceOnMiss: !nativeAppRuntime,
    sourceUrl: activeHdImageUrl,
    variant: 'hd',
  });
  const activeOriginalImageCache = useCachedMediaUrl({
    enabled: Boolean(activeOriginalImageUrl),
    fetchOnMiss: previewMode === 'original' && (cacheEnabled || nativeAppRuntime),
    fileId: activeFile?.id,
    folder: cacheFolder,
    kind: 'image-preview',
    md5: activeFile?.md5,
    persistFetchedResource: cacheEnabled,
    showSourceOnMiss: previewMode === 'original' && !nativeAppRuntime,
    sourceUrl: activeOriginalImageUrl,
    variant: 'ori',
  });
  const activeVideoCache = useCachedMediaUrl({
    enabled: Boolean(activeIsVideo && previewMode === 'original' && activeVideoPlaybackUrl),
    fetchDelayMs: 1_200,
    fetchOnMiss: cacheEnabled || nativeAppRuntime,
    fileId: activeFile?.id,
    folder: cacheFolder,
    kind: 'video-preview',
    md5: activeFile?.md5,
    persistFetchedResource: cacheEnabled,
    showSourceOnMiss: !nativeAppRuntime,
    sourceUrl: activeIsVideo && previewMode === 'original' ? activeVideoPlaybackUrl : undefined,
    variant: isDirectVideoPreviewSupported(activeFile) ? 'direct' : 'transcode',
  });
  const activePosterCache = useCachedMediaUrl({
    enabled: Boolean(activePosterUrl),
    fetchOnMiss: cacheEnabled || nativeAppRuntime,
    fileId: activeFile?.id,
    folder: cacheFolder,
    kind: 'file-thumbnail',
    md5: activeFile?.md5,
    persistFetchedResource: cacheEnabled,
    showSourceOnMiss: !nativeAppRuntime,
    sourceUrl: activePosterUrl,
    variant: activeIsVideo ? 'poster' : 'h220',
  });
  const previewThumbnailUrls = usePreviewThumbnailUrls({
    authCode,
    cacheEnabled,
    cacheFolder,
    files: previewFiles,
    nativeAppRuntime,
    selectedIndex,
    serverUrl,
  });
  const previewHdReady = Boolean(activeHdImageCache.displayUrl && previewHdLoadedUrl === activeHdImageCache.displayUrl);
  const previewImageShowsOriginal = !activeIsVideo && previewDisplayedImageSource === 'original';
  const previewDisplayedMode: PreviewMode = previewImageShowsOriginal || (activeIsVideo && previewMode === 'original')
    ? 'original'
    : 'thumbnail';
  const activeImagePreviewUrl = !activeIsVideo
    ? previewDisplayedImageUrl ??
      (previewHdReady ? activeHdImageCache.displayUrl : activePosterCache.displayUrl)
    : undefined;
  const previewActionDisabled = Boolean(previewPendingImageSource) ||
    videoPreparing ||
    !activeFile ||
    (previewDisplayedMode === 'thumbnail' && !activeOriginalMediaUrl);
  const previewActionLabel = getPreviewActionLabel(activeFile, previewDisplayedMode, videoPreparing);
  const previewDisplayCache = activeIsVideo
    ? activeVideoCache
    : previewDisplayedImageSource === 'original'
      ? activeOriginalImageCache
      : previewDisplayedImageSource === 'hd'
        ? activeHdImageCache
        : activePosterCache;
  const previewCacheSourceName = activeIsVideo
    ? previewMode === 'original'
      ? '原视频'
      : '视频封面'
    : getPreviewImageSourceLabel(previewDisplayedImageSource);
  const previewCacheLabel = getPreviewCacheLabel({
    cacheChecked: previewDisplayCache.cacheChecked,
    cacheEnabled,
    cacheHit: previewDisplayCache.cacheHit,
    sourceName: previewCacheSourceName,
  });
  const previewVideoUsesTranscode = Boolean(
    activeFile && activeIsVideo && !isDirectVideoPreviewSupported(activeFile),
  );
  const previewIsFavorite = Boolean(
    activeFile &&
    (previewFavoriteFileIds.includes(activeFile.id) ||
      (previewFavoriteAlbumId && previewAlbumIds.includes(previewFavoriteAlbumId))),
  );
  const lightboxPlugins = useMemo(() => (activeIsVideo ? [Video] : [Zoom, Video]), [activeIsVideo]);
  const slides = useMemo(
    () =>
      previewFiles.map((previewFile) =>
        createPreviewSlide({
          activeFile,
          activeImageUrl: activeImagePreviewUrl,
          activePosterUrl: activePosterCache.displayUrl,
          activeVideoUrl: activeIsVideo ? activeVideoCache.displayUrl : undefined,
          authCode,
          file: previewFile,
          nativeAppRuntime,
          preloadedThumbnailUrl: previewThumbnailUrls.get(createPreviewMediaKey(previewFile)),
          serverUrl,
        }),
      ),
    [
      activeFile,
      activeIsVideo,
      activeImagePreviewUrl,
      activePosterCache.displayUrl,
      activeVideoCache.displayUrl,
      authCode,
      nativeAppRuntime,
      previewThumbnailUrls,
      previewFiles,
      serverUrl,
    ],
  );

  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  useEffect(() => {
    previewImageLoadRequestRef.current += 1;
    previewHdLoadRequestRef.current += 1;
    previewAutoOriginalSessionRef.current = undefined;
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUrl(undefined);
    setPreviewAlbumsError('');
    setPreviewAlbumsOpen(false);
    setPreviewBusyAction(undefined);
    setPreviewHdLoadedUrl(undefined);
    setPreviewMode('thumbnail');
    setPreviewPendingImageSource(undefined);
    setPreviewRotation(0);
    setVideoPreparing(false);
  }, [activeFile?.id, activeFile?.md5]);

  useEffect(() => {
    if (activeIsVideo || !activePosterCache.displayUrl) {
      return;
    }

    setPreviewDisplayedImageUrl((currentUrl) => (
      currentUrl && previewDisplayedImageSource !== 'thumbnail'
        ? currentUrl
        : activePosterCache.displayUrl
    ));
  }, [activeIsVideo, activePosterCache.displayUrl, previewDisplayedImageSource]);

  useEffect(() => {
    const hdUrl = activeHdImageCache.displayUrl;
    const requestId = previewHdLoadRequestRef.current + 1;
    let cancelled = false;

    previewHdLoadRequestRef.current = requestId;
    setPreviewHdLoadedUrl(undefined);

    if (activeIsVideo || !hdUrl) {
      setPreviewPendingImageSource((current) => (current === 'hd' ? undefined : current));
      return undefined;
    }

    if (previewModeRef.current === 'thumbnail') {
      setPreviewPendingImageSource('hd');
    }

    const commitHdPreview = (): void => {
      if (cancelled || previewHdLoadRequestRef.current !== requestId) {
        return;
      }

      setPreviewHdLoadedUrl(hdUrl);

      if (previewModeRef.current === 'thumbnail') {
        setPreviewDisplayedImageSource('hd');
        setPreviewDisplayedImageUrl(hdUrl);
        setPreviewPendingImageSource((current) => (current === 'hd' ? undefined : current));
      }
    };

    if (activeHdImageCache.cacheHit) {
      commitHdPreview();
      return undefined;
    }

    void preloadImage(hdUrl)
      .then((loaded) => {
        if (loaded) {
          activeHdImageCache.rememberLoadedResource();
          commitHdPreview();
        } else if (!cancelled && previewHdLoadRequestRef.current === requestId) {
          setPreviewPendingImageSource((current) => (current === 'hd' ? undefined : current));
        }
      })
      .catch(() => {
        if (!cancelled && previewHdLoadRequestRef.current === requestId) {
          setPreviewPendingImageSource((current) => (current === 'hd' ? undefined : current));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeFile?.id,
    activeFile?.md5,
    activeHdImageCache.cacheHit,
    activeHdImageCache.displayUrl,
    activeHdImageCache.rememberLoadedResource,
    activeIsVideo,
  ]);

  useEffect(() => {
    if (
      !cacheEnabled ||
      activeIsVideo ||
      !activeFileKey ||
      previewAutoOriginalSessionRef.current === activeFileKey ||
      !activeOriginalImageCache.cacheHit ||
      !activeOriginalImageCache.displayUrl
    ) {
      return;
    }

    previewAutoOriginalSessionRef.current = activeFileKey;
    previewImageLoadRequestRef.current += 1;
    setPreviewMode('original');
    setPreviewDisplayedImageSource('original');
    setPreviewDisplayedImageUrl(activeOriginalImageCache.displayUrl);
    setPreviewPendingImageSource(undefined);
  }, [
    activeFileKey,
    activeIsVideo,
    activeOriginalImageCache.cacheHit,
    activeOriginalImageCache.displayUrl,
    cacheEnabled,
  ]);

  useEffect(() => {
    const originalUrl = activeOriginalImageCache.displayUrl;
    const requestId = previewImageLoadRequestRef.current + 1;
    let cancelled = false;

    if (activeIsVideo || previewMode !== 'original') {
      return undefined;
    }

    previewImageLoadRequestRef.current = requestId;

    if (!originalUrl) {
      return undefined;
    }

    setPreviewPendingImageSource('original');

    const commitOriginalPreview = (): void => {
      if (cancelled || previewImageLoadRequestRef.current !== requestId) {
        return;
      }

      setPreviewDisplayedImageSource('original');
      setPreviewDisplayedImageUrl(originalUrl);
      setPreviewPendingImageSource((current) => (current === 'original' ? undefined : current));
    };

    if (activeOriginalImageCache.cacheHit) {
      commitOriginalPreview();
      return undefined;
    }

    void preloadImage(originalUrl)
      .then((loaded) => {
        if (loaded) {
          activeOriginalImageCache.rememberLoadedResource();
          commitOriginalPreview();
        } else if (!cancelled && previewImageLoadRequestRef.current === requestId) {
          setPreviewMode('thumbnail');
          setPreviewPendingImageSource((current) => (current === 'original' ? undefined : current));
          onShowToast('原图加载失败，请稍后重试');
        }
      })
      .catch(() => {
        if (!cancelled && previewImageLoadRequestRef.current === requestId) {
          setPreviewMode('thumbnail');
          setPreviewPendingImageSource((current) => (current === 'original' ? undefined : current));
          onShowToast('原图加载失败，请稍后重试');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeOriginalImageCache.cacheHit,
    activeOriginalImageCache.displayUrl,
    activeOriginalImageCache.rememberLoadedResource,
    activeIsVideo,
    onShowToast,
    previewMode,
  ]);

  useEffect(() => {
    if (
      activeIsVideo ||
      previewMode !== 'original' ||
      previewPendingImageSource !== 'original' ||
      activeOriginalImageCache.displayUrl
    ) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviewMode('thumbnail');
      setPreviewPendingImageSource(undefined);
      onShowToast('原图加载超时，请稍后重试');
    }, 20_000);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeIsVideo,
    activeOriginalImageCache.displayUrl,
    onShowToast,
    previewMode,
    previewPendingImageSource,
  ]);

  useEffect(() => {
    return subscribeLocalCacheChanges((detail) => {
      if (!shouldClearPreviewThumbnailUrls(detail, cacheFolder)) {
        return;
      }

      setLightboxCacheVersion((version) => version + 1);
      setMobileMetaVisible(false);
    });
  }, [cacheFolder, cacheFolder.folderKey, cacheFolder.scope]);

  useEffect(() => {
    if (!file) {
      return undefined;
    }

    document.body.classList.add('is-file-preview-open');

    return () => document.body.classList.remove('is-file-preview-open');
  }, [file]);

  useEffect(() => {
    setDetail(undefined);
    setDetailError('');
    setMobileMetaVisible(false);

    if (!activeFile || activeFile.id <= 0) {
      return undefined;
    }

    let cancelled = false;

    setDetailLoading(true);
    void onLoadFileDetail(activeFile)
      .then((nextDetail) => {
        if (!cancelled) {
          setDetail(nextDetail);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setDetailError(getApiErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFile, onLoadFileDetail]);

  useEffect(() => {
    setPreviewAlbumIds([]);
    setPreviewFavoriteAlbumId(undefined);
    setPreviewFavoriteFileIds([]);

    if (!activeFile || !onLoadPreviewMembership) {
      return undefined;
    }

    let cancelled = false;

    void onLoadPreviewMembership(activeFile)
      .then((membership) => {
        if (cancelled) {
          return;
        }

        setPreviewAlbumIds(membership.albumIds);
        setPreviewFavoriteAlbumId(membership.favoriteAlbumId);
        setPreviewFavoriteFileIds(membership.favoriteFileIds);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setPreviewAlbumsError(getApiErrorMessage(requestError));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFile, onLoadPreviewMembership]);

  /**
   * Keeps the parent selected file synchronized with the lightbox internal index.
   */
  const handleViewChange = useCallback(
    ({ index }: { index: number }): void => {
      const nextFile = previewFiles[index];

      if (!nextFile || !onSelectFile || (file && isSamePreviewFile(nextFile, file))) {
        return;
      }

      onSelectFile(nextFile);
    },
    [file, onSelectFile, previewFiles],
  );

  const handleCopyMd5 = useCallback(async (): Promise<void> => {
    const displayMd5 = detail?.md5 ?? activeFile?.md5;

    if (!displayMd5) {
      onShowToast('当前文件没有返回 MD5');
      return;
    }

    try {
      await copyText(displayMd5);
      onShowToast('MD5 已复制');
    } catch {
      onShowToast('复制失败，请手动选择 MD5');
    }
  }, [activeFile?.md5, detail?.md5, onShowToast]);

  const handleDownload = useCallback(async (): Promise<void> => {
    if (!activeFile || activeFile.id <= 0 || !activeFile.md5) {
      onShowToast('当前文件缺少下载信息');
      return;
    }

    setDownloading(true);

    try {
      await onDownloadFile(activeFile);
      onShowToast('已开始下载原文件');
    } catch (requestError) {
      onShowToast(getApiErrorMessage(requestError));
    } finally {
      setDownloading(false);
    }
  }, [activeFile, onDownloadFile, onShowToast]);

  /**
   * Creates and copies a preview share link for the active file.
   */
  const handleSharePreviewFile = useCallback(async (): Promise<void> => {
    if (!activeFile || !onShareFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('share');

    try {
      await onShareFile(activeFile);
      onShowToast('分享链接已生成并复制');
    } catch (requestError) {
      onShowToast(`分享失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onShareFile, onShowToast, previewBusyAction]);

  /**
   * Opens the official album picker for the active preview file.
   */
  const handleOpenPreviewAlbums = useCallback(async (): Promise<void> => {
    if (!activeFile || !onLoadPreviewAlbums || previewBusyAction) {
      return;
    }

    setPreviewAlbumsOpen(true);
    setPreviewAlbumsError('');
    setPreviewAlbumsLoading(true);
    setPreviewBusyAction('album');

    try {
      const state = await onLoadPreviewAlbums(activeFile);

      setPreviewAlbums(state.albums);
      setPreviewAlbumIds(state.albumIds);
    } catch (requestError) {
      setPreviewAlbumsError(getApiErrorMessage(requestError));
    } finally {
      setPreviewAlbumsLoading(false);
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onLoadPreviewAlbums, previewBusyAction]);

  /**
   * Adds or removes the active preview file from one album.
   */
  const handleTogglePreviewAlbum = useCallback(
    async (album: FileAlbumSummary): Promise<void> => {
      if (!activeFile || !onTogglePreviewAlbum || previewBusyAction) {
        return;
      }

      const included = previewAlbumIds.includes(album.id);

      setPreviewBusyAction('album');
      setPreviewAlbumsError('');

      try {
        const nextAlbumIds = await onTogglePreviewAlbum(activeFile, album, included, previewAlbumIds);

        setPreviewAlbumIds(nextAlbumIds ?? (
          included
            ? previewAlbumIds.filter((id) => id !== album.id)
            : Array.from(new Set([...previewAlbumIds, album.id]))
        ));
        onShowToast(included ? `已从「${album.name}」移除` : `已添加到「${album.name}」`);
      } catch (requestError) {
        setPreviewAlbumsError(getApiErrorMessage(requestError));
      } finally {
        setPreviewBusyAction(undefined);
      }
    },
    [activeFile, onShowToast, onTogglePreviewAlbum, previewAlbumIds, previewBusyAction],
  );

  /**
   * Toggles the active file in the official favorites album.
   */
  const handleTogglePreviewFavorite = useCallback(async (): Promise<void> => {
    if (!activeFile || !onTogglePreviewFavorite || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('favorite');

    try {
      const favoriteAlbumId = await onTogglePreviewFavorite(activeFile, {
        favoriteAlbumId: previewFavoriteAlbumId,
        isFavorite: previewIsFavorite,
      });
      const resolvedFavoriteAlbumId = favoriteAlbumId ?? previewFavoriteAlbumId;

      if (previewIsFavorite) {
        setPreviewFavoriteFileIds((ids) => ids.filter((id) => id !== activeFile.id));
        if (resolvedFavoriteAlbumId) {
          setPreviewAlbumIds((ids) => ids.filter((id) => id !== resolvedFavoriteAlbumId));
        }
        onShowToast('已取消收藏');
      } else {
        setPreviewFavoriteFileIds((ids) => Array.from(new Set([...ids, activeFile.id])));
        if (resolvedFavoriteAlbumId) {
          setPreviewFavoriteAlbumId(resolvedFavoriteAlbumId);
          setPreviewAlbumIds((ids) => Array.from(new Set([...ids, resolvedFavoriteAlbumId])));
        }
        onShowToast('已收藏');
      }
    } catch (requestError) {
      onShowToast(`收藏失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [
    activeFile,
    onShowToast,
    onTogglePreviewFavorite,
    previewBusyAction,
    previewFavoriteAlbumId,
    previewIsFavorite,
  ]);

  /**
   * Confirms and moves the active preview file to the recycle bin.
   */
  const handleDeletePreviewFile = useCallback(async (): Promise<void> => {
    if (!activeFile || !onDeleteFile || previewBusyAction) {
      return;
    }

    const confirmed = window.confirm(`将「${activeFile.name}」放到回收站。是否继续？`);

    if (!confirmed) {
      return;
    }

    setPreviewBusyAction('delete');

    try {
      await onDeleteFile(activeFile);
      onShowToast('已放到回收站');
    } catch (requestError) {
      onShowToast(`删除失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onDeleteFile, onShowToast, previewBusyAction]);

  /**
   * Refreshes server-generated thumbnails for the active file.
   */
  const handleRefreshPreviewThumbs = useCallback(async (): Promise<void> => {
    if (!activeFile || !onRefreshPreviewThumbs || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      await onRefreshPreviewThumbs(activeFile);
      onShowToast('已刷新缩略图，服务端缓存可能需要几分钟生效');
    } catch (requestError) {
      onShowToast(`刷新失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onRefreshPreviewThumbs, onShowToast, previewBusyAction]);

  /**
   * Refreshes face recognition descriptors for the active file.
   */
  const handleRefreshPreviewDescriptor = useCallback(async (): Promise<void> => {
    if (!activeFile || !onRefreshPreviewDescriptor || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      const affectedCount = await onRefreshPreviewDescriptor(activeFile);

      onShowToast(affectedCount && affectedCount > 0 ? '已刷新人脸识别' : '没有需要刷新的人脸数据');
    } catch (requestError) {
      onShowToast(`刷新失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onRefreshPreviewDescriptor, onShowToast, previewBusyAction]);

  /**
   * Refreshes EXIF metadata and reuses the current preview info panel.
   */
  const handleRefreshPreviewInfo = useCallback(async (): Promise<void> => {
    if (!activeFile || !onRefreshPreviewInfo || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      const nextDetail = await onRefreshPreviewInfo(activeFile);

      if (nextDetail) {
        setDetail(nextDetail);
      }
      setMobileMetaVisible(true);
      onShowToast('已刷新 EXIF 信息');
    } catch (requestError) {
      onShowToast(`刷新失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  }, [activeFile, onRefreshPreviewInfo, onShowToast, previewBusyAction]);

  /**
   * Rotates the current preview clockwise without mutating the stored file.
   */
  const handleRotatePreview = useCallback((): void => {
    if (activeIsVideo) {
      onShowToast('视频暂不支持旋转预览');
      return;
    }

    setPreviewRotation((rotation) => (rotation + 90) % 360);
  }, [activeIsVideo, onShowToast]);

  /**
   * Switches fullscreen preview between cached preview quality and original media.
   */
  const handleTogglePreviewMode = useCallback(async (): Promise<void> => {
    if (!activeFile || !activeOriginalMediaUrl) {
      onShowToast(activeIsVideo ? '当前视频没有可用内置播放地址' : '当前文件缺少原图地址');
      return;
    }

    if (previewDisplayedMode === 'original') {
      const fallbackImageUrl = previewHdReady
        ? activeHdImageCache.displayUrl ?? activePosterCache.displayUrl
        : activePosterCache.displayUrl;

      setPreviewMode('thumbnail');
      setPreviewPendingImageSource(undefined);

      if (!activeIsVideo) {
        setPreviewDisplayedImageSource(previewHdReady && fallbackImageUrl ? 'hd' : 'thumbnail');
        setPreviewDisplayedImageUrl(fallbackImageUrl);
      }

      return;
    }

    if (activeIsVideo && !isDirectVideoPreviewSupported(activeFile) && onPrepareVideoPreview) {
      setVideoPreparing(true);

      try {
        await onPrepareVideoPreview(activeFile);
      } catch (requestError) {
        onShowToast(`已尝试准备转码预览：${getApiErrorMessage(requestError)}`);
      } finally {
        setVideoPreparing(false);
      }
    }

    setPreviewMode('original');

    if (!activeIsVideo) {
      setPreviewPendingImageSource('original');
    }
  }, [
    activeFile,
    activeHdImageCache.displayUrl,
    activeIsVideo,
    activeOriginalMediaUrl,
    activePosterCache.displayUrl,
    onPrepareVideoPreview,
    onShowToast,
    previewDisplayedMode,
    previewHdReady,
  ]);

  if (!file || !activeFile || slides.length === 0) {
    return null;
  }

  const displayName = detail?.name ?? activeFile.name;
  const displayFileType = detail?.fileType ?? activeFile.fileType;
  const displayMd5 = detail?.md5 ?? activeFile.md5;
  const displaySize = detail?.sizeLabel ?? activeFile.sizeLabel ?? '未返回';
  const displayWidth = detail?.width ?? activeFile.width;
  const displayHeight = detail?.height ?? activeFile.height;
  const displayDate = detail?.dateLabel ?? activeFile.dateLabel;
  const resolution = displayWidth && displayHeight ? `${displayWidth} x ${displayHeight}` : '未返回';
  const metaRows = createMetaRows({
    date: displayDate,
    detail,
    fileType: displayFileType,
    md5: displayMd5,
    resolution,
    size: displaySize,
  });

  return (
    <>
      <Lightbox
        animation={{
          fade: 160,
          navigation: 220,
          swipe: 260,
          zoom: 150,
        }}
        key={`file-preview-${cacheFolder.scope}-${cacheFolder.folderKey}-${lightboxCacheVersion}`}
        carousel={{
          finite: true,
          imageFit: 'contain',
          padding: 0,
          preload: PREVIEW_THUMBNAIL_PRELOAD_RADIUS,
          spacing: 0,
        }}
        className={mobileMetaVisible ? 'kwphoto-lightbox is-mobile-meta-open' : 'kwphoto-lightbox'}
        close={onClose}
        controller={{
          closeOnBackdropClick: true,
          closeOnPullDown: true,
          closeOnPullUp: false,
          preventDefaultWheelX: true,
          touchAction: 'none',
        }}
        index={selectedIndex}
        labels={{
          Close: '关闭',
          Lightbox: '文件预览',
          Next: '下一个文件',
          Previous: '上一个文件',
        }}
        noScroll={{ disabled: false }}
        on={{
          exiting: () => setMobileMetaVisible(false),
          view: handleViewChange,
        }}
        open
        plugins={lightboxPlugins}
        render={{
          buttonZoom: () => null,
          controls: () => (
            <PreviewControls
              busyAction={previewBusyAction}
              cacheLabel={previewCacheLabel}
              detailError={detailError}
              detailLoading={detailLoading}
              displayName={displayName}
              downloading={downloading}
              favorite={previewIsFavorite}
              hdReady={previewHdReady}
              imageSource={previewDisplayedImageSource}
              isVideo={activeIsVideo}
              metaRows={metaRows}
              mobileMetaVisible={mobileMetaVisible}
              onClose={onClose}
              onCopyMd5={() => void handleCopyMd5()}
              onDelete={() => void handleDeletePreviewFile()}
              onDownload={() => void handleDownload()}
              onOpenAlbums={() => void handleOpenPreviewAlbums()}
              onRefreshDescriptor={() => void handleRefreshPreviewDescriptor()}
              onRefreshInfo={() => void handleRefreshPreviewInfo()}
              onRefreshThumbs={() => void handleRefreshPreviewThumbs()}
              onRotate={handleRotatePreview}
              onShare={() => void handleSharePreviewFile()}
              onToggleFavorite={() => void handleTogglePreviewFavorite()}
              onTogglePreviewMode={() => void handleTogglePreviewMode()}
              onToggleMobileMeta={() => setMobileMetaVisible((visible) => !visible)}
              previewActionDisabled={previewActionDisabled}
              previewActionLabel={previewActionLabel}
              previewMode={previewMode}
              rotateDisabled={activeIsVideo}
              selectedIndex={selectedIndex}
              total={slides.length}
              videoPreparing={videoPreparing}
              videoUsesTranscode={previewVideoUsesTranscode}
            />
          ),
          slideContainer: ({ children, slide }) => (
            <PreviewSlideContainer
              activeFileKey={activeFileKey}
              rotation={previewRotation}
              slide={slide as PreviewSlide}
            >
              {children}
            </PreviewSlideContainer>
          ),
        }}
        slides={slides}
        toolbar={{ buttons: [] }}
        video={{
          controls: true,
          controlsList: 'nodownload',
          playsInline: true,
          preload: 'metadata',
        }}
        zoom={{
          doubleClickMaxStops: 3,
          maxZoomPixelRatio: 5,
          pinchZoomV4: true,
          scrollToZoom: true,
          wheelZoomDistanceFactor: 220,
          zoomInMultiplier: 1.65,
        }}
      />
      <PreviewAlbumDialog
        albumIds={previewAlbumIds}
        albums={previewAlbums}
        busy={previewBusyAction === 'album'}
        error={previewAlbumsError}
        loading={previewAlbumsLoading}
        onClose={() => setPreviewAlbumsOpen(false)}
        onToggleAlbum={(album) => void handleTogglePreviewAlbum(album)}
        open={previewAlbumsOpen}
      />
    </>
  );
};

const PreviewControls = ({
  busyAction,
  cacheLabel,
  detailError,
  detailLoading,
  displayName,
  downloading,
  favorite,
  hdReady,
  imageSource,
  isVideo,
  metaRows,
  mobileMetaVisible,
  onClose,
  onCopyMd5,
  onDelete,
  onDownload,
  onOpenAlbums,
  onRefreshDescriptor,
  onRefreshInfo,
  onRefreshThumbs,
  onRotate,
  onShare,
  onToggleFavorite,
  onTogglePreviewMode,
  onToggleMobileMeta,
  previewActionDisabled,
  previewActionLabel,
  previewMode,
  rotateDisabled,
  selectedIndex,
  total,
  videoPreparing,
  videoUsesTranscode,
}: PreviewControlsProps) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const actionDisabled = Boolean(busyAction);

  return (
    <>
      <div className="file-preview__lightbox-topbar">
        <div className="file-preview__top-left">
          <button
            aria-label="关闭预览"
            className="file-preview__lightbox-close"
            onClick={onClose}
            title="关闭预览"
            type="button"
          >
            <X size={19} />
          </button>
          <span className="file-preview__counter">
            {selectedIndex + 1} / {total}
          </span>
        </div>

        <div className="file-preview__toolbar-shell">
          <button
            className="file-preview__original-action"
            disabled={previewActionDisabled}
            onClick={onTogglePreviewMode}
            type="button"
          >
            <ImageIcon size={15} />
            <span>{previewActionLabel}</span>
          </button>

          <div className="file-preview__icon-toolbar">
            <PreviewIconButton
              disabled={rotateDisabled}
              icon={<RotateCw size={18} />}
              label="旋转"
              onClick={onRotate}
            />
            <PreviewIconButton
              disabled={actionDisabled}
              icon={<Share2 size={18} />}
              label={busyAction === 'share' ? '生成分享中' : '分享'}
              onClick={onShare}
            />
            <PreviewIconButton
              disabled={actionDisabled}
              icon={<Images size={18} />}
              label={busyAction === 'album' ? '读取相册中' : '添加到相册'}
              onClick={onOpenAlbums}
            />
            <PreviewIconButton
              active={favorite}
              disabled={actionDisabled}
              icon={<Star fill={favorite ? 'currentColor' : 'none'} size={18} />}
              label={busyAction === 'favorite' ? '处理中' : favorite ? '取消收藏' : '收藏'}
              onClick={onToggleFavorite}
            />
            <PreviewIconButton
              className="is-danger"
              disabled={actionDisabled}
              icon={<Trash2 size={18} />}
              label={busyAction === 'delete' ? '删除中' : '放到回收站'}
              onClick={onDelete}
            />
            <PreviewIconButton
              active={settingsOpen}
              disabled={actionDisabled}
              icon={<SlidersHorizontal size={18} />}
              label="显示设置"
              onClick={() => {
                setMoreOpen(false);
                setSettingsOpen(true);
              }}
            />
            <PreviewIconButton
              active={mobileMetaVisible}
              icon={<Info size={18} />}
              label={mobileMetaVisible ? '隐藏信息' : '信息'}
              onClick={onToggleMobileMeta}
            />
            <PreviewIconButton
              active={moreOpen}
              icon={<MoreVertical size={18} />}
              label="更多"
              onClick={() => setMoreOpen((open) => !open)}
            />
          </div>

          {moreOpen ? (
            <div className="file-preview__more-panel">
              <button disabled={downloading} onClick={onDownload} type="button">
                <Download size={15} />
                <span>{downloading ? '准备中...' : '下载原文件'}</span>
              </button>
              <button onClick={onCopyMd5} type="button">
                <Copy size={15} />
                <span>复制 MD5</span>
              </button>
              <button disabled={actionDisabled} onClick={onRefreshDescriptor} type="button">
                <RefreshCw size={15} />
                <span>刷新人脸识别</span>
              </button>
              <button disabled={actionDisabled} onClick={onRefreshThumbs} type="button">
                <RefreshCw size={15} />
                <span>刷新缩略图</span>
              </button>
              <button disabled={actionDisabled} onClick={onRefreshInfo} type="button">
                <Info size={15} />
                <span>刷新 EXIF 信息</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="file-preview__meta is-lightbox">
        <div className="file-preview__summary">
          <span className="eyebrow">{isVideo ? 'Video' : 'Image'}</span>
          <h2 title={displayName}>{displayName}</h2>
        </div>

        {detailLoading ? <div className="file-preview__hint">正在读取文件详情...</div> : null}
        {detailError ? <div className="file-preview__hint is-error">{detailError}</div> : null}

        <dl>
          {metaRows.map(({ label, value }) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </aside>

      {settingsOpen ? (
        <PreviewSettingsPanel
          actionDisabled={previewActionDisabled}
          actionLabel={previewActionLabel}
          cacheLabel={cacheLabel}
          hdReady={hdReady}
          imageSource={imageSource}
          isVideo={isVideo}
          mode={previewMode}
          onClose={() => setSettingsOpen(false)}
          onToggleMode={onTogglePreviewMode}
          videoPreparing={videoPreparing}
          videoUsesTranscode={videoUsesTranscode}
        />
      ) : null}
    </>
  );
};

/**
 * Renders a compact icon-only preview toolbar button with an accessible label.
 */
const PreviewIconButton = ({
  active = false,
  className = '',
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  className?: string;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => {
  const buttonClassName = [
    'file-preview__icon-button',
    active ? 'is-active' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      aria-label={label}
      className={buttonClassName}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
};

/**
 * Shows the active preview quality and exposes the original/video toggle in the side panel.
 */
const PreviewSettingsPanel = ({
  actionDisabled,
  actionLabel,
  cacheLabel,
  hdReady,
  imageSource,
  isVideo,
  mode,
  onClose,
  onToggleMode,
  videoPreparing,
  videoUsesTranscode,
}: {
  actionDisabled: boolean;
  actionLabel: string;
  cacheLabel: string;
  hdReady: boolean;
  imageSource: PreviewImageSource;
  isVideo: boolean;
  mode: PreviewMode;
  onClose: () => void;
  onToggleMode: () => void;
  videoPreparing: boolean;
  videoUsesTranscode: boolean;
}) => {
  const hdMeta = hdReady ? '当前显示高清预览' : '正在加载高清预览';
  const originalMeta = imageSource === 'original' ? '当前显示原图' : actionLabel;
  const videoMeta = mode === 'original' ? '当前内置播放' : actionLabel;

  return (
    <div className="file-preview__settings-overlay" onMouseDown={onClose}>
      <section
        aria-label="显示设置"
        aria-modal="true"
        className="file-preview__settings-panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="file-preview__settings-head">
          <div>
            <strong>显示设置</strong>
            <span>{cacheLabel}</span>
          </div>
          <button aria-label="关闭显示设置" onClick={onClose} type="button">
            <X size={16} />
          </button>
        </div>
        <div className="file-preview__setting-list">
          {isVideo ? (
            <>
              <PreviewSettingRow active={mode === 'thumbnail'} label="视频 - 显示封面" meta="当前封面" />
              <PreviewSettingRow
                active={mode === 'original'}
                disabled={actionDisabled}
                label="视频 - 内置播放视频"
                meta={videoPreparing ? '准备中' : videoMeta}
                onClick={onToggleMode}
              />
              <PreviewSettingRow
                active={videoUsesTranscode}
                label="视频 - 优先使用转码版本"
                meta={videoUsesTranscode ? '当前使用' : '按需使用'}
              />
            </>
          ) : (
            <>
              <PreviewSettingRow active label="图片 - 优先加载高清图" meta={hdMeta} />
              <PreviewSettingRow
                active={imageSource === 'original'}
                disabled={actionDisabled}
                label="图片 - 优先加载原图"
                meta={originalMeta}
                onClick={onToggleMode}
              />
              <PreviewSettingRow active label="图片 - 优化长图显示" meta="完整显示" />
            </>
          )}
        </div>
      </section>
    </div>
  );
};

/**
 * Renders one compact status/toggle item inside the preview display settings card.
 */
const PreviewSettingRow = ({
  active,
  disabled = false,
  label,
  meta,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  meta: string;
  onClick?: () => void;
}) => {
  const className = [
    'file-preview__setting-row',
    active ? 'is-active' : '',
    onClick ? 'is-clickable' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      aria-pressed={onClick ? active : undefined}
      className={className}
      disabled={disabled || !onClick}
      onClick={onClick}
      type="button"
    >
      <span className="file-preview__setting-copy">
        <strong>{label}</strong>
        <em>{meta}</em>
      </span>
      <span className="file-preview__setting-control">
        <span>{active ? '已启用' : '未启用'}</span>
        <i aria-hidden="true" />
      </span>
    </button>
  );
};

const PreviewAlbumDialog = ({
  albumIds,
  albums,
  busy,
  error,
  loading,
  onClose,
  onToggleAlbum,
  open,
}: {
  albumIds: number[];
  albums: FileAlbumSummary[];
  busy: boolean;
  error: string;
  loading: boolean;
  onClose: () => void;
  onToggleAlbum: (album: FileAlbumSummary) => void;
  open: boolean;
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="overlay modal-overlay file-preview-album-overlay" onMouseDown={onClose}>
      <section className="dialog file-preview-album-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="file-preview-album-dialog__header">
          <div>
            <h2>添加到相册</h2>
          </div>
          <button aria-label="关闭相册选择" className="icon-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {loading ? <div className="file-preview__hint">正在读取相册...</div> : null}
        {error ? <div className="file-preview__hint is-error">{error}</div> : null}
        {!loading && albums.length === 0 ? <div className="file-preview__hint">暂无可添加的相册</div> : null}

        <div className="file-preview-album-list">
          {albums.map((album) => {
            const included = albumIds.includes(album.id);

            return (
              <button
                className={included ? 'file-preview-album-row is-active' : 'file-preview-album-row'}
                disabled={busy}
                key={album.id}
                onClick={() => onToggleAlbum(album)}
                type="button"
              >
                <span>
                  {included ? <Check size={16} /> : <Images size={16} />}
                </span>
                <strong>{album.name}</strong>
                <em>{album.count ?? 0} 个文件</em>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
};

/**
 * Keeps the thumbnail mounted behind the current slide so the original can fade in without a blank flash.
 */
const PreviewSlideContainer = ({
  activeFileKey,
  children,
  rotation,
  slide,
}: {
  activeFileKey?: string;
  children: ReactNode;
  rotation: number;
  slide: PreviewSlide;
}) => {
  const primarySrc = 'src' in slide ? slide.src : undefined;
  const thumbnailSrc = slide.thumbnailSrc && slide.thumbnailSrc !== primarySrc ? slide.thumbnailSrc : undefined;
  const shouldRotate = activeFileKey === createPreviewMediaKey(slide.file);
  const style = {
    ...(thumbnailSrc ? { backgroundImage: toCssImageUrl(thumbnailSrc) } : {}),
    '--preview-rotation': `${shouldRotate ? rotation : 0}deg`,
  } as CSSProperties;

  return (
    <div className={thumbnailSrc ? 'file-preview-slide-shell has-thumbnail' : 'file-preview-slide-shell'} style={style}>
      <div className="file-preview-slide-rotator">{children}</div>
    </div>
  );
};

/**
 * Preloads nearby thumbnails as Blob URLs so swipe navigation can reuse already decoded list thumbnails.
 */
const usePreviewThumbnailUrls = ({
  authCode,
  cacheEnabled,
  cacheFolder,
  files,
  nativeAppRuntime,
  selectedIndex,
  serverUrl,
}: {
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  files: FolderFileSummary[];
  nativeAppRuntime: boolean;
  selectedIndex: number;
  serverUrl: string;
}): Map<string, string> => {
  const [thumbnailUrls, setThumbnailUrls] = useState<Map<string, string>>(() => new Map());
  const objectUrlsRef = useRef<Map<string, string>>(new Map());
  const blobPreviewEnabled = nativeAppRuntime || cacheEnabled;
  const preloadFiles = useMemo(
    () => getPreviewThumbnailPreloadFiles(files, selectedIndex, blobPreviewEnabled),
    [blobPreviewEnabled, files, selectedIndex],
  );
  const preloadIdentity = useMemo(
    () => preloadFiles.map(createPreviewMediaKey).join('|'),
    [preloadFiles],
  );

  useEffect(() => {
    return () => {
      clearPreviewObjectUrls(objectUrlsRef.current);
    };
  }, []);

  useEffect(() => {
    if (!blobPreviewEnabled) {
      clearPreviewObjectUrls(objectUrlsRef.current);
      setThumbnailUrls(new Map());
      return undefined;
    }

    return subscribeLocalCacheChanges((detail) => {
      if (!shouldClearPreviewThumbnailUrls(detail, cacheFolder)) {
        return;
      }

      clearPreviewObjectUrls(objectUrlsRef.current, 'immediate');
      setThumbnailUrls(new Map());
    });
  }, [blobPreviewEnabled, cacheFolder, cacheFolder.folderKey, cacheFolder.scope]);

  useEffect(() => {
    if (!blobPreviewEnabled || !authCode || preloadFiles.length === 0) {
      clearPreviewObjectUrls(objectUrlsRef.current, 'immediate');
      setThumbnailUrls(new Map());
      return undefined;
    }

    let cancelled = false;
    const preloadKeys = new Set(preloadFiles.map(createPreviewMediaKey));

    removeStalePreviewObjectUrls(objectUrlsRef.current, preloadKeys);
    setThumbnailUrls(new Map(objectUrlsRef.current));

    preloadFiles.forEach((previewFile) => {
      const mediaKey = createPreviewMediaKey(previewFile);

      if (objectUrlsRef.current.has(mediaKey)) {
        return;
      }

      const sourceUrl = createThumbnailUrl({
        authCode,
        baseUrl: serverUrl,
        md5: previewFile.md5,
        type: isVideoFileType(previewFile.fileType) ? 'poster' : 'h220',
      });

      if (!sourceUrl) {
        return;
      }

      void resolvePreviewThumbnailBlob({
        cacheEnabled,
        cacheFolder,
        file: previewFile,
        sourceUrl,
      }).then((blob) => {
        if (!blob || cancelled || !preloadKeys.has(mediaKey)) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        const previousUrl = objectUrlsRef.current.get(mediaKey);

        if (previousUrl) {
          revokeObjectUrlLater(previousUrl);
        }

        objectUrlsRef.current.set(mediaKey, objectUrl);
        setThumbnailUrls(new Map(objectUrlsRef.current));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [authCode, blobPreviewEnabled, cacheEnabled, cacheFolder, preloadFiles, preloadIdentity, serverUrl]);

  return thumbnailUrls;
};

/**
 * Builds the lightbox slide list while preserving the caller's file order.
 */
const normalizePreviewFiles = (
  file: FolderFileSummary | undefined,
  files: FolderFileSummary[],
): FolderFileSummary[] => {
  if (!file) {
    return [];
  }

  if (files.some((item) => isSamePreviewFile(item, file))) {
    return files.map((item) => (isSamePreviewFile(item, file) ? { ...item, ...file } : item));
  }

  return [file];
};

/**
 * Keeps only the active slide and nearby slides warm for swipe previews.
 */
const getPreviewThumbnailPreloadFiles = (
  files: FolderFileSummary[],
  selectedIndex: number,
  enabled: boolean,
): FolderFileSummary[] => {
  if (!enabled || files.length === 0) {
    return [];
  }

  const startIndex = Math.max(0, selectedIndex - PREVIEW_THUMBNAIL_PRELOAD_RADIUS);
  const endIndex = Math.min(files.length, selectedIndex + PREVIEW_THUMBNAIL_PRELOAD_RADIUS + 1);

  return files.slice(startIndex, endIndex);
};

/**
 * Resolves one thumbnail through the same cache backend used by the rest of the app.
 */
const resolvePreviewThumbnailBlob = ({
  cacheEnabled,
  cacheFolder,
  file,
  sourceUrl,
}: {
  cacheEnabled: boolean;
  cacheFolder: LocalCacheFolderRef;
  file: FolderFileSummary;
  sourceUrl: string;
}): Promise<Blob | undefined> => {
  const variant = isVideoFileType(file.fileType) ? 'poster' : 'h220';

  if (!cacheEnabled) {
    return fetchMediaResourceBlob(sourceUrl);
  }

  return cacheMediaResourceFromUrl({
    fileId: file.id,
    folder: cacheFolder,
    kind: 'file-thumbnail',
    md5: file.md5,
    url: sourceUrl,
    variant,
  });
};

const removeStalePreviewObjectUrls = (
  objectUrls: Map<string, string>,
  activeKeys: Set<string>,
): void => {
  Array.from(objectUrls.entries()).forEach(([key, objectUrl]) => {
    if (activeKeys.has(key)) {
      return;
    }

    revokeObjectUrlLater(objectUrl);
    objectUrls.delete(key);
  });
};

const clearPreviewObjectUrls = (
  objectUrls: Map<string, string>,
  revokeMode: 'delayed' | 'immediate' = 'delayed',
): void => {
  objectUrls.forEach((objectUrl) => {
    if (revokeMode === 'immediate') {
      URL.revokeObjectURL(objectUrl);
      return;
    }

    revokeObjectUrlLater(objectUrl);
  });
  objectUrls.clear();
};

/**
 * Lets current image decoders finish before releasing a Blob URL.
 */
const revokeObjectUrlLater = (url: string): void => {
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
};

const shouldClearPreviewThumbnailUrls = (
  detail: LocalCacheChangeDetail | undefined,
  cacheFolder: LocalCacheFolderRef,
): boolean => {
  if (!detail) {
    return false;
  }

  if (detail.reason === 'clear-all') {
    return true;
  }

  if (detail.reason === 'clear-scope') {
    return !detail.scope || detail.scope === cacheFolder.scope;
  }

  if (detail.reason === 'delete-folder') {
    return Boolean(detail.folderScopeKeys?.includes(createPreviewFolderScopeKey(cacheFolder)));
  }

  return false;
};

const createPreviewFolderScopeKey = (cacheFolder: LocalCacheFolderRef): string => {
  return `${cacheFolder.scope}::folder::${cacheFolder.folderKey}`;
};

/**
 * Tracks preview object URLs by file content version, not only by file id.
 */
const createPreviewMediaKey = (file: FolderFileSummary): string => {
  if (file.id > 0) {
    return `id:${file.id}:${file.md5 || file.name}`;
  }

  return `md5:${file.md5 || file.name}`;
};

/**
 * Creates a YARL slide while keeping a thumbnail available under progressive preview upgrades.
 */
const createPreviewSlide = ({
  activeFile,
  activeImageUrl,
  activePosterUrl,
  activeVideoUrl,
  authCode,
  file,
  nativeAppRuntime,
  preloadedThumbnailUrl,
  serverUrl,
}: {
  activeFile?: FolderFileSummary;
  activeImageUrl?: string;
  activePosterUrl?: string;
  activeVideoUrl?: string;
  authCode?: string;
  file: FolderFileSummary;
  nativeAppRuntime: boolean;
  preloadedThumbnailUrl?: string;
  serverUrl: string;
}): PreviewSlide => {
  const isCurrent = Boolean(activeFile && isSamePreviewFile(activeFile, file));
  const isVideo = isVideoFileType(file.fileType);
  const thumbnailUrl =
    preloadedThumbnailUrl ||
    createPreviewThumbnailUrl({
      authCode,
      file,
      nativeAppRuntime,
      serverUrl,
    });

  if (isVideo) {
    const playableVideoUrl = isCurrent ? activeVideoUrl : undefined;
    const sources = playableVideoUrl
      ? [{ src: playableVideoUrl, type: getPreviewVideoMimeType(file) }]
      : [];
    const posterUrl = isCurrent && activePosterUrl ? activePosterUrl : thumbnailUrl;

    if (sources.length > 0) {
      return {
        autoPlay: false,
        controls: true,
        file,
        height: file.height,
        poster: posterUrl,
        preload: 'metadata',
        sources,
        thumbnailSrc: posterUrl,
        type: 'video',
        width: file.width,
      } as PreviewSlide;
    }

    return {
      alt: file.name,
      file,
      height: file.height,
      imageFit: 'contain',
      src: posterUrl || createFallbackPreviewDataUrl(isCurrent ? '正在加载视频预览' : '正在准备预览'),
      thumbnailSrc: posterUrl,
      type: 'image',
      width: file.width,
    } as PreviewSlide;
  }

  const posterUrl = isCurrent && activePosterUrl ? activePosterUrl : thumbnailUrl;
  const displayUrl = isCurrent && activeImageUrl ? activeImageUrl : posterUrl;

  return {
    alt: file.name,
    file,
    height: file.height,
    imageFit: 'contain',
    src: displayUrl || createFallbackPreviewDataUrl(isCurrent ? '正在加载高清预览' : '正在准备预览'),
    thumbnailSrc: posterUrl,
    type: 'image',
    width: file.width,
  } as PreviewSlide;
};

const createPreviewThumbnailUrl = ({
  authCode,
  file,
  nativeAppRuntime,
  serverUrl,
}: {
  authCode?: string;
  file: FolderFileSummary;
  nativeAppRuntime: boolean;
  serverUrl: string;
}): string | undefined => {
  if (nativeAppRuntime) {
    return undefined;
  }

  return toBrowserMediaUrl(
    createThumbnailUrl({
      authCode,
      baseUrl: serverUrl,
      md5: file.md5,
      type: isVideoFileType(file.fileType) ? 'poster' : 'h220',
    }),
  );
};

const createMetaRows = ({
  date,
  detail,
  fileType,
  md5,
  resolution,
  size,
}: {
  date?: string;
  detail?: FileDetail;
  fileType: string;
  md5: string;
  resolution: string;
  size: string;
}): PreviewMetaRow[] => {
  const rows: PreviewMetaRow[] = [
    { label: '类型', value: fileType || '未知' },
    { label: '大小', value: size },
    { label: '分辨率', value: resolution },
    { label: '日期', value: date || '未返回' },
    { label: 'MD5', value: md5 || '未返回' },
  ];

  if (detail?.deviceName) {
    rows.splice(4, 0, { label: '设备', value: detail.deviceName });
  }

  if (detail?.location) {
    rows.splice(4, 0, { label: '地点', value: detail.location });
  }

  return rows;
};

const toBrowserMediaUrl = (url?: string): string | undefined => {
  return createBrowserMediaUrl(url) ?? url;
};

/**
 * Decodes an image before swapping it into the active lightbox slide.
 */
const preloadImage = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
};

/**
 * Accepts both API extension values and MIME-like values so videos are not downgraded to image slides.
 */
const isVideoFileType = (fileType = ''): boolean => {
  const normalizedType = fileType.toLowerCase();

  if (VIDEO_TYPES.has(normalizePreviewFileType(fileType)) || VIDEO_TYPES.has(normalizedType.toUpperCase())) {
    return true;
  }

  return VIDEO_TYPE_KEYWORDS.some((keyword) => normalizedType.includes(keyword));
};

const normalizePreviewFileType = (fileType = ''): string => {
  return fileType.trim().toUpperCase();
};

/**
 * Uses direct playback only for formats the built-in preview player can usually decode.
 */
const isDirectVideoPreviewSupported = (file?: FolderFileSummary): boolean => {
  return Boolean(file && DIRECT_VIDEO_PREVIEW_TYPES.has(normalizePreviewFileType(file.fileType)));
};

/**
 * Chooses the in-lightbox video source, falling back to the backend transcode endpoint for uncommon formats.
 */
const getVideoPlaybackUrl = (
  file: FolderFileSummary,
  directUrl?: string,
  transcodeUrl?: string,
): string | undefined => {
  if (isDirectVideoPreviewSupported(file)) {
    return directUrl ?? transcodeUrl;
  }

  return transcodeUrl ?? directUrl;
};

/**
 * Keeps the preview action text aligned with the current progressive preview/original mode.
 */
const getPreviewActionLabel = (
  file: FolderFileSummary | undefined,
  mode: PreviewMode,
  preparing: boolean,
): string => {
  if (preparing) {
    return '准备中';
  }

  if (mode === 'original') {
    return '显示高清预览图';
  }

  return file && isVideoFileType(file.fileType) ? '内置播放视频' : '显示原图';
};

/**
 * Names the media source that is currently rendered in the lightbox.
 */
const getPreviewImageSourceLabel = (source: PreviewImageSource): string => {
  if (source === 'original') {
    return '原图';
  }

  if (source === 'hd') {
    return '高清缩略图';
  }

  return '列表缩略图';
};

/**
 * Describes the visible source and whether it comes from local cache.
 */
const getPreviewCacheLabel = ({
  cacheChecked,
  cacheEnabled,
  cacheHit,
  sourceName,
}: {
  cacheChecked: boolean;
  cacheEnabled: boolean;
  cacheHit: boolean;
  sourceName: string;
}): string => {
  if (!cacheEnabled) {
    return `${sourceName} / 网络`;
  }

  if (!cacheChecked) {
    return `${sourceName} / 检查缓存中`;
  }

  return cacheHit ? `${sourceName} / 本地缓存` : `${sourceName} / 网络，加载后写入缓存`;
};

/**
 * Serializes a media URL for CSS background-image without breaking quoted url() syntax.
 */
const toCssImageUrl = (url: string): string => {
  return `url("${url.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}")`;
};

const isNativeAppRuntime = (): boolean => {
  return Boolean(getDesktopBridge()?.localCache);
};

const getVideoMimeType = (fileType: string): string => {
  const normalizedType = fileType.toLowerCase();

  if (normalizedType.includes('quicktime') || normalizedType === 'mov') {
    return 'video/quicktime';
  }

  if (normalizedType.includes('webm')) {
    return 'video/webm';
  }

  if (normalizedType.includes('ogg') || normalizedType.includes('ogv')) {
    return 'video/ogg';
  }

  return 'video/mp4';
};

const getPreviewVideoMimeType = (file: FolderFileSummary): string => {
  return isDirectVideoPreviewSupported(file) ? getVideoMimeType(file.fileType) : 'video/mp4';
};

/**
 * Keeps the lightbox mounted even when the server cannot produce a media URL.
 */
const createFallbackPreviewDataUrl = (name: string): string => {
  const safeName = escapeSvgText(name || '正在准备预览');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="#020617"/><circle cx="480" cy="292" r="26" fill="none" stroke="#a78bfa" stroke-width="8" stroke-linecap="round" stroke-dasharray="78 60"/><text x="480" y="366" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="28" font-weight="700" text-anchor="middle">${safeName}</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const escapeSvgText = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Copies text with a textarea fallback for browsers without Clipboard API access.
 */
const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
};

/**
 * Compares files with the strongest stable identity available from the API.
 */
const isSamePreviewFile = (
  first: FolderFileSummary,
  second: FolderFileSummary,
): boolean => {
  if (first.id > 0 && second.id > 0) {
    return first.id === second.id;
  }

  return Boolean(first.md5 && first.md5 === second.md5);
};
