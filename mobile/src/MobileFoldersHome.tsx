import Ionicons from '@expo/vector-icons/Ionicons';
import { FlashList } from '@shopify/flash-list';
import type { FlashListProps, ListRenderItemInfo } from '@shopify/flash-list';
import { useVideoPlayer, VideoView } from 'expo-video';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import type { RouteProp, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  ImageStyle,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponderGestureState,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  AuthTokens,
  FileAlbumSummary,
  FileDetail,
  FileMoveOverwriteMode,
  FolderDirectory,
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from '@kwphoto/core';
import {
  autoSetFolderCover,
  addFilesToAlbum,
  checkFavoriteAlbum,
  createFileShareLink,
  createFilePreviewUrl,
  createThumbnailUrl,
  createVideoPreviewUrl,
  createFolder,
  deleteFiles,
  deleteFolder,
  fetchFileAlbumIds,
  fetchFileAlbums,
  fetchFileInfo,
  fetchFolderDirectory,
  fetchMediaAuthCode,
  fetchRootFolders,
  getApiErrorMessage,
  moveFilesToFolder,
  moveFolder,
  renameFolder,
  refreshFileDescriptor,
  refreshFileInfo,
  refreshFileThumbs,
  removeFilesFromAlbum,
  setFolderCover,
  sortDirectory,
  triggerVideoTranscode,
} from '@kwphoto/core';

import type {
  MobileFolderCardSize,
  MobileFolderSortDirection,
  MobileFolderSortField,
  MobileFolderViewMode,
} from './mobile-storage';
import {
  mergeMobilePreferences,
  readMobilePreferences,
} from './mobile-storage';
import {
  cacheMobileMediaResourceFromUrl,
  createMobileLocalCacheFolderRef,
  createMobileLocalCacheScope,
  readCachedMobileDirectory,
  readCachedMobileMediaUri,
  writeCachedMobileDirectory,
} from './mobile-local-cache';
import type { MobileLocalCacheFolderRef, MobileLocalCacheResourceKind } from './mobile-local-cache';
import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from './mobile-theme';
import { MobileLoadingState, MobilePullRefreshIndicator } from './MobileLoadingState';
import {
  CARD_SIZE_OPTIONS,
  DEFAULT_CARD_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
  DEFAULT_VIEW_MODE,
  DIRECTORY_FLASH_LIST_DRAW_DISTANCE,
  DIRECTORY_PULL_REFRESH_REVEAL_DISTANCE,
  DIRECTORY_PULL_REFRESH_TRIGGER_DISTANCE,
  FOLDER_GESTURE_RESPONSE_DISTANCE,
  FOLDER_GRID_COLUMN_COUNT,
  FOLDER_GRID_GAP,
  FORBIDDEN_FOLDER_NAME_PATTERN,
  LONG_PRESS_DELAY_MS,
  MAX_FOLDER_COVER_COUNT,
  MOVE_OVERWRITE_OPTIONS,
  PREVIEW_NEIGHBOR_PRELOAD_RADIUS,
  PREVIEW_NOTICE_DURATION_MS,
  PREVIEW_SWIPE_CLOSE_DISTANCE,
  PREVIEW_SWIPE_DIRECTION_RATIO,
  PREVIEW_SWIPE_STEP_DISTANCE,
  SORT_DIRECTION_ICON,
  SORT_DIRECTION_LABEL,
  SORT_DIRECTION_OPTIONS,
  SORT_FIELD_ICON,
  SORT_FIELD_LABEL,
  SORT_FIELD_OPTIONS,
  STATUS_COPY,
  VIEW_MODE_OPTIONS,
} from './folders/folderConstants';
import type { FolderFabIconName } from './folders/folderConstants';
import type {
  DirectoryListItem,
  DirectorySelectionKey,
  PathItem,
  PreviewImageGalleryItem,
  PreviewImageSource,
  PreviewMode,
  SelectionItem,
} from './folders/folderTypes';
import {
  buildMediaWaterfallColumns,
  createCurrentDirectoryPathItems,
  createDirectoryListItems,
  createDirectoryPathItems,
  createEmptyDirectory,
  createFileSelectionKey,
  createFileThumbnailKey,
  createFolderCardLayoutStyle,
  createFolderGridLayoutStyle,
  createFolderSelectionKey,
  createFolderStackRoutes,
  createMobileShareUrl,
  createPreviewMediaKey,
  formatSelectionSummary,
  getCoverCandidateFiles,
  getBreadcrumbItemId,
  getDirectorySelectionItems,
  getLoadedImageAspectRatio,
  getMediaAspectRatio,
  getMediaPlaceholderAspectRatio,
  getMediaWaterfallColumnCount,
  getPreviewActionLabel,
  getPreviewCacheLabel,
  getPreviewGestureAction,
  getPreviewImageSourceLabel,
  getPreviewWarmThumbnailItems,
  getVideoPlaybackUrl,
  isCoverCandidateFile,
  isDirectVideoPreviewSupported,
  isImageFile,
  isMediaFile,
  isSameStringRecord,
  isSelectedFile,
  isSelectedFolder,
  isVideoFile,
  mergePreviewFileIntoList,
  normalizePreviewFileType,
  shouldCapturePreviewGesture,
  warmPreviewThumbnailUri,
} from './folders/folderUtils';
import {
  PreviewDetailPanel,
  PreviewMorePanel,
  PreviewSettingsPanel,
  PreviewToolbarButton,
} from './folders/panels/PreviewPanels';
import { MobileBottomSheetModal, MobileCenterDialog, MobileFullscreenModal } from './components/MobileDialog';
import ImageView from './MobileImageView';
import { useCachedMobileMediaUri } from './useCachedMobileMediaUri';
import { useMobileApiOptions } from './useMobileApiOptions';

export interface MobileFoldersSession {
  serverUrl: string;
  tokens: AuthTokens;
  user: {
    id?: number | string;
    username: string;
  };
}

interface MobileFoldersHomeProps {
  onChangeTokens: (tokens: AuthTokens) => void;
  onLogout: () => void;
  rootRequestVersion?: number;
  session: MobileFoldersSession;
}

type MobileFolderStackParamList = {
  directory: {
    folderId?: number;
  };
};

type MobileFolderDirectoryRoute = RouteProp<MobileFolderStackParamList, 'directory'>;
type MobileFolderDirectoryNavigation = NativeStackNavigationProp<MobileFolderStackParamList, 'directory'>;

interface MobileFolderDirectoryScreenProps extends MobileFoldersHomeProps {
  navigation: MobileFolderDirectoryNavigation;
  route: MobileFolderDirectoryRoute;
}

type PreviewBusyAction = 'album' | 'delete' | 'favorite' | 'refresh' | 'share';

interface ProgressiveImagePreviewProps {
  hdReady: boolean;
  hdSource?: string;
  onHdLoad: () => void;
  onThumbnailLoad: () => void;
  themeColor: string;
  thumbnailSource?: string;
}

const FolderStack = createNativeStackNavigator<MobileFolderStackParamList>();
const FOLDER_NAVIGATION_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: MOBILE_SAGE_NEUTRALS.pageBg,
    border: 'transparent',
    card: MOBILE_SAGE_NEUTRALS.pageBg,
  },
};
const FOLDER_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animationMatchesGesture: true,
  animation: 'slide_from_right',
  contentStyle: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
  },
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
  fullScreenGestureShadowEnabled: false,
  gestureResponseDistance: { start: FOLDER_GESTURE_RESPONSE_DISTANCE },
  headerShown: false,
};

/**
 * Hosts the native folder stack while the outer bottom tabs keep local state switching.
 */
export const MobileFoldersHome = ({
  onChangeTokens,
  onLogout,
  rootRequestVersion = 0,
  session,
}: MobileFoldersHomeProps) => {
  const theme = useMobileTheme();
  const [initialFolderId, setInitialFolderId] = useState<number>();
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores the last visited folder as the initial native stack route.
     */
    const hydrateInitialFolder = async (): Promise<void> => {
      const preferences = await readMobilePreferences();

      if (!mounted) {
        return;
      }

      if (typeof preferences.currentFolderId === 'number') {
        setInitialFolderId(preferences.currentFolderId);
      }

      setPreferencesHydrated(true);
    };

    void hydrateInitialFolder();

    return () => {
      mounted = false;
    };
  }, []);

  if (!preferencesHydrated) {
    return (
      <MobileLoadingState
        description="恢复上次打开的目录和视图偏好"
        icon="folder-open-outline"
        title="正在恢复文件夹"
      />
    );
  }

  return (
    <NavigationContainer theme={FOLDER_NAVIGATION_THEME}>
      <FolderStack.Navigator screenOptions={FOLDER_STACK_SCREEN_OPTIONS}>
        <FolderStack.Screen
          name="directory"
          initialParams={{ folderId: initialFolderId }}
        >
          {({ navigation, route }) => (
            <MobileFolderDirectoryScreen
              navigation={navigation}
              onChangeTokens={onChangeTokens}
              onLogout={onLogout}
              rootRequestVersion={rootRequestVersion}
              route={route}
              session={session}
            />
          )}
        </FolderStack.Screen>
      </FolderStack.Navigator>
    </NavigationContainer>
  );
};

/**
 * Renders one folder directory as a native stack screen.
 */
const MobileFolderDirectoryScreen = ({
  navigation,
  onChangeTokens,
  onLogout,
  rootRequestVersion = 0,
  route,
  session,
}: MobileFolderDirectoryScreenProps) => {
  const theme = useMobileTheme();
  const safeAreaInsets = useSafeAreaInsets();
  const currentFolderId = route.params?.folderId;
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [directory, setDirectory] = useState<FolderDirectory>();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [folderFabOpen, setFolderFabOpen] = useState(false);
  const [error, setError] = useState('');
  const [folderCardSize, setFolderCardSize] = useState<MobileFolderCardSize>(DEFAULT_CARD_SIZE);
  const [loading, setLoading] = useState(true);
  const [mediaAuthLoading, setMediaAuthLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [folderDialogError, setFolderDialogError] = useState('');
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'rename'>();
  const [folderDialogName, setFolderDialogName] = useState('');
  const [folderDialogTarget, setFolderDialogTarget] = useState<FolderSummary>();
  const [directoryPulling, setDirectoryPulling] = useState(false);
  const [folderSubmitting, setFolderSubmitting] = useState(false);
  const [coverDialogAutoSubmitting, setCoverDialogAutoSubmitting] = useState(false);
  const [coverDialogDirectory, setCoverDialogDirectory] = useState<FolderDirectory>(() => createEmptyDirectory());
  const [coverDialogError, setCoverDialogError] = useState('');
  const [coverDialogLoading, setCoverDialogLoading] = useState(false);
  const [coverDialogSelectedHashes, setCoverDialogSelectedHashes] = useState<string[]>([]);
  const [coverDialogSubmitting, setCoverDialogSubmitting] = useState(false);
  const [coverDialogTarget, setCoverDialogTarget] = useState<FolderSummary>();
  const [moveDialogDirectory, setMoveDialogDirectory] = useState<FolderDirectory>(() => createEmptyDirectory());
  const [moveDialogError, setMoveDialogError] = useState('');
  const [moveDialogLoading, setMoveDialogLoading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogOverwriteMode, setMoveDialogOverwriteMode] = useState<FileMoveOverwriteMode>(2);
  const [moveDialogTarget, setMoveDialogTarget] = useState<FolderSummary>();
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<FileDetail>();
  const [previewDetailError, setPreviewDetailError] = useState('');
  const [previewDetailLoading, setPreviewDetailLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FolderFileSummary>();
  const [previewDisplayedImageSource, setPreviewDisplayedImageSource] = useState<PreviewImageSource>('thumbnail');
  const [previewDisplayedImageUri, setPreviewDisplayedImageUri] = useState<string>();
  const [previewHdLoadedUri, setPreviewHdLoadedUri] = useState<string>();
  const [previewImageViewerStartIndex, setPreviewImageViewerStartIndex] = useState(0);
  const [previewInfoVisible, setPreviewInfoVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('thumbnail');
  const [previewMoreOpen, setPreviewMoreOpen] = useState(false);
  const [previewOpenNonce, setPreviewOpenNonce] = useState(0);
  const [previewPendingImageSource, setPreviewPendingImageSource] = useState<PreviewImageSource>();
  const [previewNotice, setPreviewNotice] = useState('');
  const [previewSettingsOpen, setPreviewSettingsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<DirectorySelectionKey>>(() => new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showFolderCovers, setShowFolderCovers] = useState(true);
  const [sortDirection, setSortDirection] = useState<MobileFolderSortDirection>(DEFAULT_SORT_DIRECTION);
  const [sortField, setSortField] = useState<MobileFolderSortField>(DEFAULT_SORT_FIELD);
  const [submittingAction, setSubmittingAction] = useState<'delete' | 'move'>();
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [viewMode, setViewMode] = useState<MobileFolderViewMode>(DEFAULT_VIEW_MODE);
  const [previewAlbumIds, setPreviewAlbumIds] = useState<number[]>([]);
  const [previewAlbums, setPreviewAlbums] = useState<FileAlbumSummary[]>([]);
  const [previewAlbumsError, setPreviewAlbumsError] = useState('');
  const [previewAlbumsLoading, setPreviewAlbumsLoading] = useState(false);
  const [previewAlbumsOpen, setPreviewAlbumsOpen] = useState(false);
  const [previewBusyAction, setPreviewBusyAction] = useState<PreviewBusyAction>();
  const [previewFavoriteAlbumId, setPreviewFavoriteAlbumId] = useState<number>();
  const [previewFavoriteFileIds, setPreviewFavoriteFileIds] = useState<number[]>([]);
  const [previewWarmThumbnailUris, setPreviewWarmThumbnailUris] = useState<Record<string, string>>({});
  const [folderGridWidth, setFolderGridWidth] = useState(0);
  const coverDialogRequestIdRef = useRef(0);
  const directoryPullDistanceRef = useRef(0);
  const directoryRefreshLockedRef = useRef(false);
  const handledRootRequestRef = useRef(rootRequestVersion);
  const mediaAuthRequestRef = useRef<Promise<string | undefined> | undefined>(undefined);
  const previewAutoOriginalSessionRef = useRef<string | undefined>(undefined);
  const previewHdLoadRequestRef = useRef(0);
  const previewImageLoadRequestRef = useRef(0);
  const previewModeRef = useRef<PreviewMode>('thumbnail');
  const previewNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const previewVideoPrepareRequestRef = useRef(0);
  const apiOptions = useMobileApiOptions({
    onChangeTokens,
    serverUrl: session.serverUrl,
    tokens: session.tokens,
  });
  const { tokensRef } = apiOptions;
  const cacheScope = useMemo(
    () =>
      createMobileLocalCacheScope({
        serverUrl: session.serverUrl,
        userId: session.user.id,
        username: session.user.username,
      }),
    [session.serverUrl, session.user.id, session.user.username],
  );
  const cacheFolder = useMemo(
    () => createMobileLocalCacheFolderRef({ directory, folderId: currentFolderId, scope: cacheScope }),
    [cacheScope, currentFolderId, directory],
  );
  const coverDialogCacheFolder = useMemo(
    () => createMobileLocalCacheFolderRef({ directory: coverDialogDirectory, scope: cacheScope }),
    [cacheScope, coverDialogDirectory],
  );
  const folderCardLayoutStyle = useMemo(
    () =>
      createFolderCardLayoutStyle({
        cardSize: folderCardSize,
        containerWidth: folderGridWidth,
        viewMode,
      }),
    [folderCardSize, folderGridWidth, viewMode],
  );
  const folderGridLayoutStyle = useMemo(
    () =>
      createFolderGridLayoutStyle({
        cardSize: folderCardSize,
        containerWidth: folderGridWidth,
        viewMode,
      }),
    [folderCardSize, folderGridWidth, viewMode],
  );
  const folderFabOffsetStyle = useMemo(
    () => ({
      bottom: Math.max(76, safeAreaInsets.bottom + 52),
    }),
    [safeAreaInsets.bottom],
  );
  const folderGridModeStyle = viewMode === 'list' ? styles.folderListGrid : styles.folderGridTrack;
  const folderGridColumnCount = viewMode === 'list' ? 1 : FOLDER_GRID_COLUMN_COUNT[folderCardSize];
  const mediaColumnCount = getMediaWaterfallColumnCount(folderCardSize);

  /**
   * Lets FlashList masonry use real media columns while keeping headers and file rows full-width.
   */
  const overrideDirectoryItemLayout = useCallback<NonNullable<FlashListProps<DirectoryListItem>['overrideItemLayout']>>(
    (layout, item, _index, maxColumns) => {
      layout.span = item.type === 'media-file' ? 1 : maxColumns;
    },
    [],
  );

  /**
   * Gives FlashList stable recycle pools for heavy media cells and full-width controls.
   */
  const getDirectoryListItemType = useCallback((item: DirectoryListItem): string => {
    return item.type;
  }, []);

  /**
   * Stores the real folder grid viewport width so stack transitions cannot skew column anchors.
   */
  const handleFolderGridLayout = useCallback((event: LayoutChangeEvent): void => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);

    setFolderGridWidth((currentWidth) => (currentWidth === nextWidth ? currentWidth : nextWidth));
  }, []);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores view preferences before the first directory load.
     */
    const hydratePreferences = async (): Promise<void> => {
      const preferences = await readMobilePreferences();

      if (!mounted) {
        return;
      }

      setFolderCardSize(preferences.folderCardSize ?? DEFAULT_CARD_SIZE);
      setCacheEnabled(preferences.localCacheEnabled ?? true);
      setShowFolderCovers(preferences.showFolderCovers ?? true);
      setSortDirection(preferences.folderSortDirection ?? DEFAULT_SORT_DIRECTION);
      setSortField(preferences.folderSortField ?? DEFAULT_SORT_FIELD);
      setViewMode(preferences.folderViewMode ?? DEFAULT_VIEW_MODE);
      setPreferencesHydrated(true);
    };

    void hydratePreferences();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Ensures image endpoints have a media auth_code for thumbnails and previews.
   */
  const ensureMediaAuthCode = useCallback(async (): Promise<string | undefined> => {
    if (tokensRef.current.authCode) {
      return tokensRef.current.authCode;
    }

    if (mediaAuthRequestRef.current) {
      return mediaAuthRequestRef.current;
    }

    setMediaAuthLoading(true);
    mediaAuthRequestRef.current = fetchMediaAuthCode(session.serverUrl, tokensRef.current.refreshToken)
      .then((authCode) => {
        const nextTokens = { ...tokensRef.current, authCode };

        tokensRef.current = nextTokens;
        onChangeTokens(nextTokens);
        return authCode;
      })
      .catch((authCodeError: unknown) => {
        setError(getApiErrorMessage(authCodeError));
        return undefined;
      })
      .finally(() => {
        mediaAuthRequestRef.current = undefined;
        setMediaAuthLoading(false);
      });

    return mediaAuthRequestRef.current;
  }, [onChangeTokens, session.serverUrl, tokensRef]);

  /**
   * Loads either root folders or the selected folder directory, with cached content as first paint.
   */
  const loadDirectory = useCallback(
    async (folderId = currentFolderId, mode: 'loading' | 'refreshing' = 'loading') => {
      if (mode === 'refreshing') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      setMessage('');
      const cachedDirectory = cacheEnabled && mode === 'loading'
        ? await readCachedMobileDirectory({ folderId, scope: cacheScope })
        : undefined;

      if (cachedDirectory) {
        setDirectory(cachedDirectory);
      }

      try {
        const nextDirectory =
          folderId === undefined
            ? await fetchRootFolders(apiOptions)
            : await fetchFolderDirectory(apiOptions, folderId);

        setDirectory(nextDirectory);
        if (cacheEnabled) {
          void writeCachedMobileDirectory({
            directory: nextDirectory,
            folder: createMobileLocalCacheFolderRef({
              directory: nextDirectory,
              folderId,
              scope: cacheScope,
            }),
          });
        }
      } catch (loadError) {
        setError(
          cachedDirectory
            ? `已显示本地缓存，刷新失败：${getApiErrorMessage(loadError)}`
            : getApiErrorMessage(loadError),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [apiOptions, cacheEnabled, cacheScope, currentFolderId],
  );

  /**
   * Triggers a directory reload from the native pull gesture while the visible loader stays custom.
   */
  const handleDirectoryRefresh = useCallback((): void => {
    void loadDirectory(currentFolderId, 'refreshing');
  }, [currentFolderId, loadDirectory]);

  /**
   * Tracks the overscroll distance so the themed floating loader can appear before refresh starts.
   */
  const handleDirectoryScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const pullDistance = Math.max(0, -event.nativeEvent.contentOffset.y);
      const nextPulling = pullDistance > DIRECTORY_PULL_REFRESH_REVEAL_DISTANCE && !refreshing;

      directoryPullDistanceRef.current = pullDistance;
      setDirectoryPulling((current) => (current === nextPulling ? current : nextPulling));
    },
    [refreshing],
  );

  /**
   * Runs a custom refresh trigger so the native spinner never duplicates the themed loader.
   */
  const handleDirectoryScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const pullDistance = Math.max(
      directoryPullDistanceRef.current,
      Math.max(0, -event.nativeEvent.contentOffset.y),
    );

    setDirectoryPulling(false);

    if (pullDistance >= DIRECTORY_PULL_REFRESH_TRIGGER_DISTANCE && !refreshing && !directoryRefreshLockedRef.current) {
      directoryRefreshLockedRef.current = true;
      handleDirectoryRefresh();
    }
  }, [handleDirectoryRefresh, refreshing]);

  useEffect(() => {
    if (!refreshing) {
      directoryRefreshLockedRef.current = false;
    }
  }, [refreshing]);

  useEffect(() => {
    if (handledRootRequestRef.current === rootRequestVersion) {
      return;
    }

    handledRootRequestRef.current = rootRequestVersion;
    setConfigDialogOpen(false);
    setFolderFabOpen(false);
    setSelectedKeys(new Set());
    setSelectionMode(false);

    if (currentFolderId === undefined) {
      void loadDirectory(undefined, 'refreshing');
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'directory', params: { folderId: undefined } }],
      });
    }

    void mergeMobilePreferences({ currentFolderId: undefined });
  }, [currentFolderId, loadDirectory, navigation, rootRequestVersion]);

  const sortedDirectory = useMemo(
    () => (directory ? sortDirectory(directory, { direction: sortDirection, field: sortField }) : undefined),
    [directory, sortDirection, sortField],
  );
  const currentPathItems = useMemo(
    () => (sortedDirectory ? createCurrentDirectoryPathItems(sortedDirectory) : []),
    [sortedDirectory],
  );
  const selectionItems = useMemo(
    () => (sortedDirectory ? getDirectorySelectionItems(sortedDirectory) : []),
    [sortedDirectory],
  );
  const selectedItems = useMemo(
    () => selectionItems.filter((item) => selectedKeys.has(item.key)),
    [selectedKeys, selectionItems],
  );
  const selectedFiles = useMemo(
    () => selectedItems.map((item) => item.file).filter(isSelectedFile),
    [selectedItems],
  );
  const selectedFolders = useMemo(
    () => selectedItems.map((item) => item.folder).filter(isSelectedFolder),
    [selectedItems],
  );
  const directoryPreviewFiles = useMemo(
    () => sortedDirectory?.files.flatMap((group) => group.list) ?? [],
    [sortedDirectory],
  );
  const previewFiles = useMemo(
    () => mergePreviewFileIntoList(directoryPreviewFiles, previewFile),
    [directoryPreviewFiles, previewFile],
  );
  const previewImageGalleryItems = useMemo<PreviewImageGalleryItem[]>(
    () => previewFiles
      .filter(isImageFile)
      .flatMap((file) => {
        const thumbnailUri = createThumbnailUrl({
          authCode: session.tokens.authCode,
          baseUrl: session.serverUrl,
          md5: file.md5,
          type: 'h220',
        });
        const hdUri = createFilePreviewUrl({
          authCode: session.tokens.authCode,
          baseUrl: session.serverUrl,
          id: file.id,
          md5: file.md5,
          type: 'hd',
        });
        const uri = thumbnailUri || hdUri;

        if (!uri) {
          return [];
        }

        return [{
          file,
          thumbnailUri,
          uri,
        }];
      }),
    [previewFiles, session.serverUrl, session.tokens.authCode],
  );
  const isInitialLoading = loading && !directory;
  const directoryListItems = useMemo(
    () =>
      createDirectoryListItems({
        cardSize: folderCardSize,
        directory: sortedDirectory,
        folderColumnCount: folderGridColumnCount,
        initialLoading: isInitialLoading,
        viewMode,
      }),
    [folderCardSize, folderGridColumnCount, isInitialLoading, sortedDirectory, viewMode],
  );

  const allVisibleSelected = selectionItems.length > 0 && selectedItems.length === selectionItems.length;
  const previewIsVideo = Boolean(previewFile && isVideoFile(previewFile));
  const previewIsImage = Boolean(previewFile && isImageFile(previewFile));
  const previewFileKey = previewFile ? createFileSelectionKey(previewFile) : undefined;
  const previewListThumbnailUrl = createThumbnailUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    md5: previewFile?.md5,
    type: previewIsVideo ? 'poster' : 'h220',
  });
  const previewHdImageUrl = previewFile && !previewIsVideo
    ? createFilePreviewUrl({
        authCode: session.tokens.authCode,
        baseUrl: session.serverUrl,
        id: previewFile.id,
        md5: previewFile.md5,
        type: 'hd',
      })
    : undefined;
  const previewOriginalUrl = createFilePreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: 'ori',
  });
  const previewVideoDirectUrl = createVideoPreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: 'direct',
  });
  const previewVideoTranscodeUrl = createVideoPreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: 'transcode',
  });
  const previewVideoPlaybackUrl = previewFile && previewIsVideo
    ? getVideoPlaybackUrl(previewFile, previewVideoDirectUrl, previewVideoTranscodeUrl)
    : undefined;
  const previewOriginalMediaUrl = previewIsVideo ? previewVideoPlaybackUrl : previewOriginalUrl;
  const previewListThumbnailCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: 'file-thumbnail',
    md5: previewFile?.md5,
    sourceUrl: previewFile ? previewListThumbnailUrl : undefined,
    cacheOnMiss: true,
    variant: previewIsVideo ? 'poster' : 'h220',
  });
  const previewHdImageCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile && !previewIsVideo),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: 'file-hd-thumbnail',
    md5: previewFile?.md5,
    sourceUrl: previewFile && !previewIsVideo ? previewHdImageUrl : undefined,
    cacheOnMiss: true,
    variant: 'hd',
  });
  const previewOriginalImageCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile && !previewIsVideo),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: 'image-preview',
    md5: previewFile?.md5,
    sourceUrl: previewFile && !previewIsVideo ? previewOriginalUrl : undefined,
    variant: 'ori',
  });
  const previewVideoCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile && previewIsVideo && previewMode === 'original'),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: 'video-preview',
    md5: previewFile?.md5,
    sourceUrl: previewFile && previewIsVideo && previewMode === 'original' ? previewVideoPlaybackUrl : undefined,
    variant: isDirectVideoPreviewSupported(previewFile) ? 'direct' : 'transcode',
  });

  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  useEffect(() => {
    previewImageLoadRequestRef.current += 1;
    previewHdLoadRequestRef.current += 1;
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUri(undefined);
    setPreviewHdLoadedUri(undefined);
    setPreviewMoreOpen(false);
    setPreviewPendingImageSource(undefined);
  }, [previewFile?.id, previewFile?.md5]);

  useEffect(() => {
    if (!previewIsImage || !previewListThumbnailCache.displayUri) {
      return;
    }

    setPreviewDisplayedImageUri((currentUri) => (
      currentUri && previewDisplayedImageSource !== 'thumbnail'
        ? currentUri
        : previewListThumbnailCache.displayUri
    ));
  }, [previewDisplayedImageSource, previewIsImage, previewListThumbnailCache.displayUri]);

  useEffect(() => {
    const hdUri = previewHdImageCache.displayUri;
    const requestId = previewHdLoadRequestRef.current + 1;
    let cancelled = false;

    previewHdLoadRequestRef.current = requestId;
    setPreviewHdLoadedUri(undefined);

    if (!previewIsImage || !hdUri) {
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

      setPreviewHdLoadedUri(hdUri);

      if (previewModeRef.current === 'thumbnail') {
        setPreviewDisplayedImageSource('hd');
        setPreviewDisplayedImageUri(hdUri);
        setPreviewPendingImageSource((current) => (current === 'hd' ? undefined : current));
      }
    };

    if (previewHdImageCache.cacheHit) {
      commitHdPreview();
      return undefined;
    }

    void Image.prefetch(hdUri)
      .then((loaded) => {
        if (loaded) {
          previewHdImageCache.rememberLoadedResource();
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
    previewFile?.id,
    previewFile?.md5,
    previewHdImageCache.cacheHit,
    previewHdImageCache.displayUri,
    previewHdImageCache.rememberLoadedResource,
    previewIsImage,
  ]);

  useEffect(() => {
    const autoOriginalSession = previewFileKey ? `${previewFileKey}:${previewOpenNonce}` : undefined;

    if (
      !previewIsImage ||
      !autoOriginalSession ||
      previewAutoOriginalSessionRef.current === autoOriginalSession ||
      !previewOriginalImageCache.cacheHit ||
      !previewOriginalImageCache.displayUri
    ) {
      return;
    }

    previewAutoOriginalSessionRef.current = autoOriginalSession;
    previewImageLoadRequestRef.current += 1;
    setPreviewMode('original');
    setPreviewDisplayedImageSource('original');
    setPreviewDisplayedImageUri(previewOriginalImageCache.displayUri);
    setPreviewPendingImageSource(undefined);
  }, [
    previewFileKey,
    previewIsImage,
    previewOpenNonce,
    previewOriginalImageCache.cacheHit,
    previewOriginalImageCache.displayUri,
  ]);

  const previewHdReady = Boolean(
    previewHdImageCache.displayUri && previewHdLoadedUri === previewHdImageCache.displayUri,
  );
  const previewImageShowsOriginal = previewIsImage && previewDisplayedImageSource === 'original';
  const previewDisplayedMode: PreviewMode = previewImageShowsOriginal || (previewIsVideo && previewMode === 'original')
    ? 'original'
    : 'thumbnail';
  const previewActionDisabled = Boolean(previewPendingImageSource) ||
    (previewDisplayedMode === 'thumbnail' && (!previewOriginalMediaUrl || videoPreparing));
  const previewActionLabel = getPreviewActionLabel(previewFile, previewDisplayedMode, videoPreparing);
  const previewIndex = previewFile ? previewFiles.findIndex((file) => createFileSelectionKey(file) === createFileSelectionKey(previewFile)) : -1;
  const previewImageGalleryIndex = previewFile && previewIsImage
    ? previewImageGalleryItems.findIndex((item) => createFileSelectionKey(item.file) === createFileSelectionKey(previewFile))
    : -1;
  const previewDefaultImageCache = previewHdReady ? previewHdImageCache : previewListThumbnailCache;
  const previewDisplayedImageCache = previewDisplayedImageSource === 'original'
    ? previewOriginalImageCache
    : previewDisplayedImageSource === 'hd'
      ? previewHdImageCache
      : previewListThumbnailCache;
  const previewDisplayCache = previewIsImage
    ? previewDisplayedImageCache
    : previewMode === 'original'
      ? previewVideoCache
      : previewListThumbnailCache;
  const previewIsFavorite = Boolean(
    previewFile &&
      (previewFavoriteFileIds.includes(previewFile.id) ||
        (previewFavoriteAlbumId && previewAlbumIds.includes(previewFavoriteAlbumId))),
  );
  const previewImageActiveUri = previewDisplayedImageUri
    ?? previewDefaultImageCache.displayUri
    ?? previewListThumbnailCache.displayUri;
  const previewImageViewerImages = useMemo(
    () => previewImageGalleryItems.map((item) => {
      const mediaKey = createPreviewMediaKey(item.file);

      return {
        uri: previewFile && createFileSelectionKey(item.file) === createFileSelectionKey(previewFile)
          ? previewImageActiveUri ?? previewWarmThumbnailUris[mediaKey] ?? item.uri
          : previewWarmThumbnailUris[mediaKey] ?? item.uri,
      };
    }),
    [previewFile, previewImageActiveUri, previewImageGalleryItems, previewWarmThumbnailUris],
  );
  const previewImageViewerInitialIndex = Math.min(
    Math.max(previewImageViewerStartIndex, 0),
    Math.max(previewImageViewerImages.length - 1, 0),
  );
  const previewUsesImageViewer = Boolean(previewFile && previewIsImage && previewImageGalleryIndex >= 0);
  const previewWarmThumbnailSources = useMemo(
    () => {
      if (!previewUsesImageViewer || previewImageGalleryIndex < 0) {
        return [];
      }

      return getPreviewWarmThumbnailItems(
        previewImageGalleryItems,
        previewImageGalleryIndex,
        PREVIEW_NEIGHBOR_PRELOAD_RADIUS,
      )
        .map((item) => previewWarmThumbnailUris[createPreviewMediaKey(item.file)] ?? item.thumbnailUri ?? item.uri)
        .filter((uri): uri is string => Boolean(uri));
    },
    [previewImageGalleryIndex, previewImageGalleryItems, previewUsesImageViewer, previewWarmThumbnailUris],
  );
  const previewCacheSourceName = previewIsImage
    ? getPreviewImageSourceLabel(previewDisplayedImageSource)
    : previewMode === 'original'
      ? '原视频'
      : '视频封面';
  const previewCacheLabel = getPreviewCacheLabel({
    cacheEnabled,
    cacheHit: previewDisplayCache.cacheHit,
    cacheChecked: previewDisplayCache.cacheChecked,
    sourceName: previewCacheSourceName,
  });
  const previewImageSourceBadgeLabel = previewPendingImageSource
    ? `${getPreviewImageSourceLabel(previewDisplayedImageSource)} · ${getPreviewImageSourceLabel(previewPendingImageSource)}加载中`
    : getPreviewImageSourceLabel(previewDisplayedImageSource);
  const previewSafeAreaStyle = useMemo(
    () => ({
      paddingTop: Math.max(12, safeAreaInsets.top),
    }),
    [safeAreaInsets.top],
  );

  useEffect(() => {
    if (!previewUsesImageViewer || previewImageGalleryIndex < 0) {
      setPreviewWarmThumbnailUris({});
      return undefined;
    }

    let cancelled = false;
    const warmItems = getPreviewWarmThumbnailItems(
      previewImageGalleryItems,
      previewImageGalleryIndex,
      PREVIEW_NEIGHBOR_PRELOAD_RADIUS,
    );
    const warmKeys = new Set(warmItems.map((item) => createPreviewMediaKey(item.file)));

    setPreviewWarmThumbnailUris((current) => {
      const next: Record<string, string> = {};

      warmKeys.forEach((key) => {
        if (current[key]) {
          next[key] = current[key];
        }
      });

      return isSameStringRecord(current, next) ? current : next;
    });

    /**
     * Reads cached list thumbnails first, then downloads missing neighbors in the background.
     */
    const warmNeighborThumbnails = async (): Promise<void> => {
      const entries = await Promise.all(
        warmItems.map(async (item) => {
          const uri = await warmPreviewThumbnailUri({
            cacheEnabled,
            cacheFolder,
            item,
          });

          return uri ? [createPreviewMediaKey(item.file), uri] as const : undefined;
        }),
      );

      if (cancelled) {
        return;
      }

      setPreviewWarmThumbnailUris((current) => {
        const next = { ...current };

        entries.forEach((entry) => {
          if (entry) {
            next[entry[0]] = entry[1];
          }
        });

        return isSameStringRecord(current, next) ? current : next;
      });
    };

    void warmNeighborThumbnails();

    return () => {
      cancelled = true;
    };
  }, [cacheEnabled, cacheFolder, previewImageGalleryIndex, previewImageGalleryItems, previewUsesImageViewer]);

  useEffect(() => {
    if (preferencesHydrated) {
      void loadDirectory(currentFolderId);
      void mergeMobilePreferences({ currentFolderId });
      setSelectedKeys(new Set());
      setSelectionMode(false);
      setFolderFabOpen(false);
    }
  }, [currentFolderId, loadDirectory, preferencesHydrated]);

  useEffect(() => {
    return navigation.addListener('focus', () => {
      void mergeMobilePreferences({ currentFolderId });
    });
  }, [currentFolderId, navigation]);

  useEffect(() => {
    if (preferencesHydrated) {
      void mergeMobilePreferences({
        folderCardSize,
        folderSortDirection: sortDirection,
        folderSortField: sortField,
        folderViewMode: viewMode,
        showFolderCovers,
      });
    }
  }, [folderCardSize, preferencesHydrated, showFolderCovers, sortDirection, sortField, viewMode]);

  useEffect(() => {
    if (!selectionMode) {
      return;
    }

    if (selectionItems.length === 0 || selectedItems.length === 0) {
      clearSelection();
    }
  }, [selectedItems.length, selectionItems.length, selectionMode]);

  useEffect(() => {
    void ensureMediaAuthCode();
  }, [ensureMediaAuthCode]);

  useEffect(() => {
    return () => {
      if (previewNoticeTimerRef.current) {
        clearTimeout(previewNoticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!previewFile) {
      setPreviewDetail(undefined);
      setPreviewDetailError('');
      setPreviewDetailLoading(false);
      return;
    }

    let cancelled = false;

    setPreviewDetail(undefined);
    setPreviewDetailError('');
    setPreviewDetailLoading(true);

    /**
     * Loads the same file metadata panel used by the original mobile Web preview.
     */
    const loadPreviewDetail = async (): Promise<void> => {
      try {
        const detail = await fetchFileInfo({
          ...apiOptions,
          file: {
            id: previewFile.id,
            md5: previewFile.md5,
            name: previewFile.name,
          },
        });

        if (!cancelled) {
          setPreviewDetail(detail);
        }
      } catch (detailError) {
        if (!cancelled) {
          setPreviewDetailError(getApiErrorMessage(detailError));
        }
      } finally {
        if (!cancelled) {
          setPreviewDetailLoading(false);
        }
      }
    };

    void loadPreviewDetail();

    return () => {
      cancelled = true;
    };
  }, [apiOptions, previewFile]);

  useEffect(() => {
    if (!previewFile) {
      setPreviewAlbumIds([]);
      setPreviewFavoriteAlbumId(undefined);
      setPreviewFavoriteFileIds([]);
      return undefined;
    }

    let cancelled = false;

    /**
     * Loads official album and favorite state used by the preview toolbar.
     */
    const loadPreviewMembership = async (): Promise<void> => {
      try {
        const [albumIds, favoriteAlbum] = await Promise.all([
          fetchFileAlbumIds(apiOptions, previewFile.id),
          checkFavoriteAlbum(apiOptions),
        ]);

        if (cancelled) {
          return;
        }

        setPreviewAlbumIds(albumIds);
        setPreviewFavoriteAlbumId(favoriteAlbum.id || undefined);
        setPreviewFavoriteFileIds(favoriteAlbum.files);
      } catch (membershipError) {
        if (!cancelled) {
          setPreviewAlbumsError(getApiErrorMessage(membershipError));
        }
      }
    };

    void loadPreviewMembership();

    return () => {
      cancelled = true;
    };
  }, [apiOptions, previewFile]);

  /**
   * Opens one folder when the backend returns a stable folder id.
   */
  const handleOpenFolder = (folder: FolderSummary): void => {
    if (selectionMode) {
      toggleSelection(createFolderSelectionKey(folder));
      return;
    }

    if (!folder.id) {
      setError('当前文件夹缺少 folderId，暂时无法下钻。');
      return;
    }

    navigation.push('directory', {
      folderId: folder.id,
    });
  };

  /**
   * Opens the root folder from the inline breadcrumb beside the folder heading.
   */
  const handleOpenRootPath = (): void => {
    setFolderFabOpen(false);
    setSelectedKeys(new Set());
    setSelectionMode(false);

    if (currentFolderId === undefined) {
      void loadDirectory(undefined, 'refreshing');
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'directory', params: { folderId: undefined } }],
      });
    }

    void mergeMobilePreferences({ currentFolderId: undefined });
  };

  /**
   * Jumps to a breadcrumb folder while preserving the ancestor stack where possible.
   */
  const handleOpenPathFolder = (folderId: number): void => {
    if (!sortedDirectory) {
      return;
    }

    setFolderFabOpen(false);
    setSelectedKeys(new Set());
    setSelectionMode(false);

    if (folderId === currentFolderId) {
      return;
    }

    const breadcrumbIndex = sortedDirectory.breadcrumbs.findIndex((item) => getBreadcrumbItemId(item) === folderId);

    if (breadcrumbIndex >= 0) {
      const routes = createFolderStackRoutes(sortedDirectory.breadcrumbs.slice(0, breadcrumbIndex + 1));

      navigation.reset({
        index: routes.length - 1,
        routes,
      });
    } else {
      navigation.push('directory', { folderId });
    }

    void mergeMobilePreferences({ currentFolderId: folderId });
  };

  /**
   * Prepares a video stream for the active fullscreen preview without letting stale requests win.
   */
  const prepareVideoPreview = (file: FolderFileSummary): void => {
    const requestId = previewVideoPrepareRequestRef.current + 1;

    previewVideoPrepareRequestRef.current = requestId;

    if (!isVideoFile(file) || isDirectVideoPreviewSupported(file)) {
      setVideoPreparing(false);
      return;
    }

    setVideoPreparing(true);
    void triggerVideoTranscode({ ...apiOptions, fileId: file.id })
      .catch((transcodeError) => {
        if (previewVideoPrepareRequestRef.current === requestId) {
          showPreviewNotice(`已尝试准备转码预览：${getApiErrorMessage(transcodeError)}`);
        }
      })
      .finally(() => {
        if (previewVideoPrepareRequestRef.current === requestId) {
          setVideoPreparing(false);
        }
      });
  };

  /**
   * Opens a file preview and starts media authorization if needed.
   */
  const handlePreviewFile = (file: FolderFileSummary): void => {
    if (selectionMode) {
      toggleSelection(createFileSelectionKey(file));
      return;
    }

    const isPreviewVideo = isVideoFile(file);
    const imageViewerStartIndex = isPreviewVideo
      ? 0
      : previewImageGalleryItems.findIndex((item) => createFileSelectionKey(item.file) === createFileSelectionKey(file));

    setPreviewFile(file);
    setPreviewOpenNonce((current) => current + 1);
    setPreviewImageViewerStartIndex(Math.max(imageViewerStartIndex, 0));
    setPreviewInfoVisible(false);
    setPreviewMode(isPreviewVideo ? 'original' : 'thumbnail');
    setPreviewMoreOpen(false);
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUri(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewDetailError('');
    setPreviewNotice('');
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    void ensureMediaAuthCode();
    prepareVideoPreview(file);
  };

  /**
   * Shows a short in-preview notice without interrupting the fullscreen viewer.
   */
  const showPreviewNotice = (text: string): void => {
    setPreviewNotice(text);

    if (previewNoticeTimerRef.current) {
      clearTimeout(previewNoticeTimerRef.current);
    }

    previewNoticeTimerRef.current = setTimeout(() => {
      setPreviewNotice('');
    }, PREVIEW_NOTICE_DURATION_MS);
  };

  /**
   * Closes the fullscreen preview and clears transient toolbar state.
   */
  const closePreview = (): void => {
    previewVideoPrepareRequestRef.current += 1;
    setPreviewFile(undefined);
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUri(undefined);
    setPreviewInfoVisible(false);
    setPreviewMode('thumbnail');
    setPreviewMoreOpen(false);
    setPreviewPendingImageSource(undefined);
    setPreviewDetailError('');
    setPreviewNotice('');
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    setPreviewImageViewerStartIndex(0);
  };

  /**
   * Creates an official file share link and opens the native share sheet.
   */
  const handleSharePreviewFile = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('share');

    try {
      const response = await createFileShareLink(apiOptions, {
        cover: previewFile.md5,
        desc: previewFile.name,
        fileIds: [previewFile.id],
        linkEndTime: null,
        linkPwd: '',
        showDownload: true,
        showExif: true,
      });
      const shareUrl = createMobileShareUrl(session.serverUrl, response.key);

      await Share.share({
        message: shareUrl,
        title: previewFile.name,
        url: shareUrl,
      });
      showPreviewNotice('分享链接已生成');
    } catch (shareError) {
      showPreviewNotice(`分享失败：${getApiErrorMessage(shareError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Opens the official add-to-album flow for the current preview file.
   */
  const handleOpenPreviewAlbums = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewAlbumsOpen(true);
    setPreviewAlbumsError('');
    setPreviewAlbumsLoading(true);
    setPreviewBusyAction('album');

    try {
      const [albums, albumIds] = await Promise.all([
        fetchFileAlbums(apiOptions),
        fetchFileAlbumIds(apiOptions, previewFile.id),
      ]);

      setPreviewAlbums(albums);
      setPreviewAlbumIds(albumIds);
    } catch (albumError) {
      setPreviewAlbumsError(getApiErrorMessage(albumError));
    } finally {
      setPreviewAlbumsLoading(false);
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Adds or removes the current preview file from one album.
   */
  const handleTogglePreviewAlbum = async (album: FileAlbumSummary): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    const included = previewAlbumIds.includes(album.id);

    setPreviewBusyAction('album');
    setPreviewAlbumsError('');

    try {
      if (included) {
        await removeFilesFromAlbum(apiOptions, album.id, [previewFile.id]);
        setPreviewAlbumIds((ids) => ids.filter((id) => id !== album.id));
        showPreviewNotice(`已从「${album.name}」移除`);
      } else {
        await addFilesToAlbum(apiOptions, album.id, [previewFile.id]);
        setPreviewAlbumIds((ids) => Array.from(new Set([...ids, album.id])));
        showPreviewNotice(`已添加到「${album.name}」`);
      }
    } catch (albumError) {
      setPreviewAlbumsError(getApiErrorMessage(albumError));
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Toggles the current file in the official favorites album.
   */
  const handleTogglePreviewFavorite = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('favorite');

    try {
      const favoriteAlbum = previewFavoriteAlbumId
        ? { id: previewFavoriteAlbumId }
        : await checkFavoriteAlbum(apiOptions);
      const favoriteAlbumId = favoriteAlbum.id;

      if (!favoriteAlbumId) {
        throw new Error('收藏夹不可用');
      }

      if (previewIsFavorite) {
        await removeFilesFromAlbum(apiOptions, favoriteAlbumId, [previewFile.id]);
        setPreviewFavoriteFileIds((ids) => ids.filter((id) => id !== previewFile.id));
        setPreviewAlbumIds((ids) => ids.filter((id) => id !== favoriteAlbumId));
        showPreviewNotice('已取消收藏');
      } else {
        await addFilesToAlbum(apiOptions, favoriteAlbumId, [previewFile.id]);
        setPreviewFavoriteAlbumId(favoriteAlbumId);
        setPreviewFavoriteFileIds((ids) => Array.from(new Set([...ids, previewFile.id])));
        setPreviewAlbumIds((ids) => Array.from(new Set([...ids, favoriteAlbumId])));
        showPreviewNotice('已收藏');
      }
    } catch (favoriteError) {
      showPreviewNotice(`收藏失败：${getApiErrorMessage(favoriteError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Confirms moving the current preview file to the recycle bin.
   */
  const confirmDeletePreviewFile = (): void => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    Alert.alert('放到回收站', `将「${previewFile.name}」放到回收站。是否继续？`, [
      { text: '取消', style: 'cancel' },
      { text: '放到回收站', style: 'destructive', onPress: () => void handleDeletePreviewFile() },
    ]);
  };

  /**
   * Moves the current preview file to the recycle bin and refreshes the directory.
   */
  const handleDeletePreviewFile = async (): Promise<void> => {
    if (!previewFile) {
      return;
    }

    setPreviewBusyAction('delete');

    try {
      await deleteFiles(apiOptions, [previewFile.id]);
      closePreview();
      setMessage('已放到回收站');
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (deleteError) {
      showPreviewNotice(`删除失败：${getApiErrorMessage(deleteError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Refreshes the current file thumbnails using the official preview tools API.
   */
  const handleRefreshPreviewThumbs = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      await refreshFileThumbs({ ...apiOptions, fileId: previewFile.id });
      showPreviewNotice('已刷新缩略图，服务端缓存可能需要几分钟生效');
    } catch (refreshError) {
      showPreviewNotice(`刷新失败：${getApiErrorMessage(refreshError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Refreshes face recognition descriptors from the official file detail utility.
   */
  const handleRefreshPreviewDescriptor = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      const result = await refreshFileDescriptor({ ...apiOptions, fileId: previewFile.id });

      showPreviewNotice(result.n && result.n > 0 ? '已刷新人脸识别' : '没有需要刷新的人脸数据');
    } catch (descriptorError) {
      showPreviewNotice(`刷新失败：${getApiErrorMessage(descriptorError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Refreshes EXIF metadata and reuses the existing info drawer state.
   */
  const handleRefreshPreviewInfo = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction('refresh');

    try {
      const detail = await refreshFileInfo({
        ...apiOptions,
        file: {
          id: previewFile.id,
          md5: previewFile.md5,
          name: previewFile.name,
        },
      });

      setPreviewDetail(detail);
      setPreviewInfoVisible(true);
      showPreviewNotice('已刷新 EXIF 信息');
    } catch (infoError) {
      showPreviewNotice(`刷新失败：${getApiErrorMessage(infoError)}`);
    } finally {
      setPreviewBusyAction(undefined);
    }
  };

  /**
   * Toggles the compact official-style more menu inside the preview overlay.
   */
  const handleOpenPreviewMore = (): void => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewSettingsOpen(false);
    setPreviewMoreOpen((open) => !open);
  };

  /**
   * Toggles one file or folder inside the current selection set.
   */
  const toggleSelection = (key: DirectorySelectionKey): void => {
    setSelectionMode(true);
    setSelectedKeys((current) => {
      const nextKeys = new Set(current);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return nextKeys;
    });
  };

  /**
   * Selects or clears every visible item in the current directory.
   */
  const handleToggleSelectAll = (): void => {
    setSelectedKeys(allVisibleSelected ? new Set() : new Set(selectionItems.map((item) => item.key)));
  };

  /**
   * Leaves selection mode and clears selected keys.
   */
  const clearSelection = (): void => {
    setSelectionMode(false);
    setSelectedKeys(new Set());
  };

  /**
   * Opens the move target picker from root, matching the Web mobile batch move flow.
   */
  const openMoveDialog = (): void => {
    if (selectedItems.length === 0 || submittingAction) {
      return;
    }

    setMoveDialogError('');
    setMoveDialogOpen(true);
    setMoveDialogOverwriteMode(2);
    setMoveDialogTarget(undefined);
    void loadMoveDialogDirectory();
  };

  /**
   * Loads one level of folders for the batch move target picker.
   */
  const loadMoveDialogDirectory = async (folderId?: number): Promise<void> => {
    setMoveDialogError('');
    setMoveDialogLoading(true);

    try {
      const nextDirectory =
        folderId === undefined
          ? await fetchRootFolders(apiOptions)
          : await fetchFolderDirectory(apiOptions, folderId);

      setMoveDialogDirectory(nextDirectory);
    } catch (moveLoadError) {
      setMoveDialogError(getApiErrorMessage(moveLoadError));
    } finally {
      setMoveDialogLoading(false);
    }
  };

  /**
   * Moves selected files and folders to the selected destination folder.
   */
  const handleSubmitMoveDialog = async (): Promise<void> => {
    if (!moveDialogTarget) {
      setMoveDialogError('请选择目标文件夹。');
      return;
    }

    if (selectedFolders.some((folder) => folder.id === moveDialogTarget.id)) {
      setMoveDialogError('不能把文件夹移动到自己。');
      return;
    }

    setMoveDialogError('');
    setSubmittingAction('move');

    try {
      const fileIds = selectedFiles.map((file) => file.id).filter((id) => id > 0);

      if (fileIds.length > 0) {
        await moveFilesToFolder(apiOptions, {
          fileIds,
          overwrite: moveDialogOverwriteMode,
          targetFolderId: moveDialogTarget.id,
        });
      }

      for (const folder of selectedFolders) {
        await moveFolder(apiOptions, {
          folderId: folder.id,
          targetFolderId: moveDialogTarget.id,
        });
      }

      setMessage(`已移动 ${formatSelectionSummary(selectedFolders.length, selectedFiles.length)}`);
      setMoveDialogOpen(false);
      clearSelection();
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (moveError) {
      setMoveDialogError(getApiErrorMessage(moveError));
    } finally {
      setSubmittingAction(undefined);
    }
  };

  /**
   * Confirms destructive deletion using the native mobile alert.
   */
  const confirmDeleteSelection = (): void => {
    if (selectedItems.length === 0 || submittingAction) {
      return;
    }

    Alert.alert(
      '删除所选内容',
      `将删除 ${selectedFolders.length} 个文件夹、${selectedFiles.length} 个文件。是否继续？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => void handleDeleteSelection() },
      ],
    );
  };

  /**
   * Deletes selected files and folders, then reloads the current directory.
   */
  const handleDeleteSelection = async (): Promise<void> => {
    setSubmittingAction('delete');
    setError('');
    setMessage('');

    try {
      if (selectedFiles.length > 0) {
        await deleteFiles(apiOptions, selectedFiles.map((file) => file.id));
      }

      for (const folder of selectedFolders) {
        await deleteFolder(apiOptions, folder.id);
      }

      setMessage(`已删除 ${selectedFolders.length} 个文件夹、${selectedFiles.length} 个文件`);
      clearSelection();
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError));
    } finally {
      setSubmittingAction(undefined);
    }
  };

  /**
   * Changes preview file by one step while keeping the native full-screen modal open.
   */
  const handleStepPreview = (step: -1 | 1): void => {
    if (previewIndex < 0 || previewFiles.length === 0) {
      return;
    }

    const nextIndex = Math.min(Math.max(previewIndex + step, 0), previewFiles.length - 1);
    const nextFile = previewFiles[nextIndex];

    if (!nextFile || nextIndex === previewIndex) {
      return;
    }

    const nextIsVideo = isVideoFile(nextFile);
    const nextImageViewerIndex = nextIsVideo
      ? 0
      : previewImageGalleryItems.findIndex((item) => createFileSelectionKey(item.file) === createFileSelectionKey(nextFile));

    setPreviewMode(nextIsVideo ? 'original' : 'thumbnail');
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUri(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewOpenNonce((current) => current + 1);
    setPreviewImageViewerStartIndex(Math.max(nextImageViewerIndex, 0));
    setPreviewDetailError('');
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    setPreviewFile(nextFile);
    void ensureMediaAuthCode();
    prepareVideoPreview(nextFile);
  };

  /**
   * Keeps toolbar actions and metadata in sync with the image currently shown by the carousel.
   */
  const handleImagePreviewIndexChange = (nextIndex: number): void => {
    const nextFile = previewImageGalleryItems[nextIndex]?.file;

    if (!nextFile) {
      return;
    }

    if (previewFile && createFileSelectionKey(nextFile) === createFileSelectionKey(previewFile)) {
      return;
    }

    setPreviewMode('thumbnail');
    setPreviewDisplayedImageSource('thumbnail');
    setPreviewDisplayedImageUri(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewOpenNonce((current) => current + 1);
    // react-native-image-viewing keys its modal by imageIndex, so keep the opening index stable while swiping.
    setPreviewDetailError('');
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    setPreviewFile(nextFile);
  };

  /**
   * Switches the preview modal between progressive HD preview and original media.
   */
  const handleTogglePreviewMode = async (): Promise<void> => {
    const currentPreviewIsOriginal = previewIsVideo ? previewMode === 'original' : previewImageShowsOriginal;

    if (currentPreviewIsOriginal) {
      const fallbackUri = previewHdReady
        ? previewHdImageCache.displayUri ?? previewListThumbnailCache.displayUri
        : previewListThumbnailCache.displayUri;

      setPreviewMode('thumbnail');
      setPreviewDisplayedImageSource(previewHdReady && fallbackUri ? 'hd' : 'thumbnail');
      setPreviewDisplayedImageUri(fallbackUri);
      setPreviewPendingImageSource(undefined);
      showPreviewNotice('已切回高清预览图');
      return;
    }

    if (!previewOriginalMediaUrl || !previewFile) {
      showPreviewNotice(previewIsVideo ? '当前视频没有可用内置播放地址' : '当前文件缺少原图地址');
      return;
    }

    if (previewIsVideo && !isDirectVideoPreviewSupported(previewFile)) {
      const requestId = previewVideoPrepareRequestRef.current + 1;

      previewVideoPrepareRequestRef.current = requestId;
      setVideoPreparing(true);

      try {
        await triggerVideoTranscode({ ...apiOptions, fileId: previewFile.id });
      } catch (transcodeError) {
        if (previewVideoPrepareRequestRef.current === requestId) {
          showPreviewNotice(`已尝试准备转码预览：${getApiErrorMessage(transcodeError)}`);
        }
      } finally {
        if (previewVideoPrepareRequestRef.current === requestId) {
          setVideoPreparing(false);
        }
      }

      if (previewVideoPrepareRequestRef.current !== requestId) {
        return;
      }
    }

    if (!previewIsVideo) {
      const requestId = previewImageLoadRequestRef.current + 1;
      let nextOriginalUri = previewOriginalImageCache.displayUri ?? previewOriginalMediaUrl;

      previewImageLoadRequestRef.current = requestId;
      setPreviewPendingImageSource('original');

      try {
        if (cacheEnabled) {
          nextOriginalUri = await cacheMobileMediaResourceFromUrl({
            fileId: previewFile.id,
            folder: cacheFolder,
            kind: 'image-preview',
            md5: previewFile.md5,
            url: previewOriginalMediaUrl,
            variant: 'ori',
          }) ?? nextOriginalUri;
        }

        if (!previewOriginalImageCache.cacheHit) {
          const originalLoaded = await Image.prefetch(nextOriginalUri);

          if (!originalLoaded) {
            throw new Error('原图预加载失败');
          }
        }

        if (previewImageLoadRequestRef.current !== requestId) {
          return;
        }

        setPreviewMode('original');
        setPreviewDisplayedImageSource('original');
        setPreviewDisplayedImageUri(nextOriginalUri);
        setPreviewPendingImageSource(undefined);
        showPreviewNotice('正在使用原图预览');
      } catch (originalError) {
        if (previewImageLoadRequestRef.current === requestId) {
          setPreviewPendingImageSource(undefined);
          showPreviewNotice(`原图加载失败：${getApiErrorMessage(originalError)}`);
        }
      }
      return;
    }

    if (cacheEnabled) {
      void cacheMobileMediaResourceFromUrl({
        fileId: previewFile.id,
        folder: cacheFolder,
        kind: 'video-preview',
        md5: previewFile.md5,
        url: previewOriginalMediaUrl,
        variant: isDirectVideoPreviewSupported(previewFile) ? 'direct' : 'transcode',
      });
    }

    setPreviewMode('original');
    showPreviewNotice('正在使用原视频预览');
  };

  const previewPanResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gestureState) => shouldCapturePreviewGesture(gestureState),
      onMoveShouldSetPanResponder: (_event, gestureState) => shouldCapturePreviewGesture(gestureState),
      onPanResponderRelease: (_event, gestureState) => {
        const action = getPreviewGestureAction(gestureState);

        if (action === 'close') {
          closePreview();
          return;
        }

        if (action === 'previous' && previewIndex > 0) {
          handleStepPreview(-1);
        }

        if (action === 'next' && previewIndex >= 0 && previewIndex < previewFiles.length - 1) {
          handleStepPreview(1);
        }
      },
    }),
    [closePreview, handleStepPreview, previewFiles.length, previewIndex],
  );

  /**
   * Opens the mobile folder-name dialog for create or rename flows.
   */
  const openFolderDialog = (mode: 'create' | 'rename', folder?: FolderSummary): void => {
    setFolderDialogMode(mode);
    setFolderDialogTarget(folder);
    setFolderDialogName(folder?.name ?? '');
    setFolderDialogError('');
  };

  /**
   * Validates and submits create/rename folder operations.
   */
  const handleSubmitFolderDialog = async (): Promise<void> => {
    const folderName = folderDialogName.trim();

    if (!folderName) {
      setFolderDialogError('请输入文件夹名称。');
      return;
    }

    if (FORBIDDEN_FOLDER_NAME_PATTERN.test(folderName)) {
      setFolderDialogError('名称不能包含 / \\ : * ? " < > |。');
      return;
    }

    if (folderDialogMode === 'rename' && !folderDialogTarget) {
      setFolderDialogError('当前缺少要重命名的文件夹。');
      return;
    }

    setFolderSubmitting(true);
    setFolderDialogError('');

    try {
      if (folderDialogMode === 'rename' && folderDialogTarget) {
        await renameFolder(apiOptions, {
          folderId: folderDialogTarget.id,
          name: folderName,
        });
        setMessage(`已重命名为 ${folderName}`);
      } else {
        const response = await createFolder(apiOptions, {
          name: folderName,
          parentId: currentFolderId,
        });

        if (response.msg) {
          setFolderDialogError(response.msg);
          return;
        }

        setMessage(`已创建文件夹 ${folderName}`);
      }

      setFolderDialogMode(undefined);
      setFolderDialogTarget(undefined);
      setFolderDialogName('');
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (submitError) {
      setFolderDialogError(getApiErrorMessage(submitError));
    } finally {
      setFolderSubmitting(false);
    }
  };

  /**
   * Opens the cover picker and loads image candidates from the target folder.
   */
  const openCoverDialog = (folder: FolderSummary): void => {
    if (folder.id <= 0) {
      return;
    }

    setCoverDialogError('');
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogSelectedHashes(folder.coverHashes.slice(0, MAX_FOLDER_COVER_COUNT));
    setCoverDialogTarget(folder);
    void loadCoverDialogDirectory(folder.id);
  };

  /**
   * Loads one folder level inside the cover picker.
   */
  const loadCoverDialogDirectory = async (folderId: number): Promise<void> => {
    const requestId = coverDialogRequestIdRef.current + 1;

    coverDialogRequestIdRef.current = requestId;
    setCoverDialogError('');
    setCoverDialogLoading(true);

    try {
      const nextDirectory = await fetchFolderDirectory(apiOptions, folderId);

      if (coverDialogRequestIdRef.current !== requestId) {
        return;
      }

      setCoverDialogDirectory(nextDirectory);
    } catch (coverLoadError) {
      if (coverDialogRequestIdRef.current !== requestId) {
        return;
      }

      setCoverDialogError(getApiErrorMessage(coverLoadError));
    } finally {
      if (coverDialogRequestIdRef.current === requestId) {
        setCoverDialogLoading(false);
      }
    }
  };

  /**
   * Selects or removes one image hash from the folder cover payload.
   */
  const handleToggleCoverFile = (file: FolderFileSummary): void => {
    if (!file.md5) {
      return;
    }

    if (!coverDialogSelectedHashes.includes(file.md5) && coverDialogSelectedHashes.length >= MAX_FOLDER_COVER_COUNT) {
      setCoverDialogError(`最多选择 ${MAX_FOLDER_COVER_COUNT} 张图片。`);
      return;
    }

    setCoverDialogError('');
    setCoverDialogSelectedHashes((current) => {
      if (current.includes(file.md5)) {
        return current.filter((hash) => hash !== file.md5);
      }

      return [...current, file.md5];
    });
  };

  /**
   * Persists selected cover hashes through the real folder-cover API.
   */
  const handleSaveCoverDialog = async (): Promise<void> => {
    if (!coverDialogTarget) {
      return;
    }

    if (coverDialogSelectedHashes.length === 0) {
      setCoverDialogError('请选择至少 1 张图片作为封面。');
      return;
    }

    setCoverDialogError('');
    setCoverDialogSubmitting(true);

    try {
      const response = await setFolderCover(apiOptions, {
        coverHashes: coverDialogSelectedHashes,
        folderId: coverDialogTarget.id,
      });

      if (response.msg) {
        setCoverDialogError(response.msg);
        return;
      }

      setMessage('文件夹封面已更新');
      resetCoverDialog();
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (coverSaveError) {
      setCoverDialogError(getApiErrorMessage(coverSaveError));
    } finally {
      setCoverDialogSubmitting(false);
    }
  };

  /**
   * Lets the server automatically pick covers for the selected folder tree.
   */
  const handleAutoSetCoverDialog = async (): Promise<void> => {
    if (!coverDialogTarget) {
      return;
    }

    setCoverDialogError('');
    setCoverDialogAutoSubmitting(true);

    try {
      await autoSetFolderCover(apiOptions, coverDialogTarget.id);
      setMessage('文件夹封面已自动设置');
      resetCoverDialog();
      await loadDirectory(currentFolderId, 'refreshing');
    } catch (coverAutoError) {
      setCoverDialogError(getApiErrorMessage(coverAutoError));
    } finally {
      setCoverDialogAutoSubmitting(false);
    }
  };

  /**
   * Closes the cover picker and discards any pending candidate request.
   */
  const closeCoverDialog = (): void => {
    if (coverDialogAutoSubmitting || coverDialogSubmitting) {
      return;
    }

    coverDialogRequestIdRef.current += 1;
    resetCoverDialog();
  };

  const resetCoverDialog = (): void => {
    setCoverDialogError('');
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogLoading(false);
    setCoverDialogSelectedHashes([]);
    setCoverDialogTarget(undefined);
  };

  const renderDirectoryListItemContent = (item: DirectoryListItem): ReactElement | null => {
    switch (item.type) {
      case 'initial-loading':
        return (
          <MobileLoadingState
            description="同步目录、封面和本地缓存状态"
            icon="folder-outline"
            title="正在加载文件夹"
          />
        );
      case 'folder-heading':
        if (!sortedDirectory) {
          return null;
        }

        return (
          <View style={[styles.section, styles.folderHeadingSection]}>
            <SectionHeading
              count={sortedDirectory.folders.length}
              title="文件夹"
              trailing={
                <PathPillRow
                  compact
                  disabled={false}
                  fallbackLabel={sortedDirectory.path || '根目录'}
                  items={currentPathItems}
                  onOpenFolderId={handleOpenPathFolder}
                  onOpenRoot={handleOpenRootPath}
                />
              }
            />
          </View>
        );
      case 'folder-empty':
        return <EmptyLine text="当前目录没有子文件夹" />;
      case 'folder-row':
        return (
          <View onLayout={handleFolderGridLayout} style={styles.folderGridMeasure}>
            {folderGridWidth > 0 ? (
              <View
                key={`${viewMode}-${folderCardSize}-${item.key}`}
                style={[styles.folderGrid, folderGridLayoutStyle]}
              >
                <View style={[styles.folderGridRow, folderGridModeStyle]}>
                  {item.folders.map((folder) => (
                    <FolderCard
                      authCode={session.tokens.authCode}
                      baseUrl={session.serverUrl}
                      cacheEnabled={cacheEnabled}
                      cacheFolder={cacheFolder}
                      cardLayoutStyle={folderCardLayoutStyle}
                      cardSize={folderCardSize}
                      folder={folder}
                      key={folder.id || folder.path}
                      onLongSelect={() => toggleSelection(createFolderSelectionKey(folder))}
                      onOpen={handleOpenFolder}
                      onRename={() => openFolderDialog('rename', folder)}
                      onSetCover={() => openCoverDialog(folder)}
                      onToggleSelection={() => toggleSelection(createFolderSelectionKey(folder))}
                      selected={selectedKeys.has(createFolderSelectionKey(folder))}
                      selectionMode={selectionMode}
                      showCover={showFolderCovers}
                      thumbnailsEnabled
                      viewMode={viewMode}
                    />
                  ))}
                  {Array.from({ length: item.placeholderCount }).map((_, placeholderIndex) => (
                    <View
                      key={`${viewMode}-${folderCardSize}-${item.key}-placeholder-${placeholderIndex}`}
                      pointerEvents="none"
                      style={[styles.folderCardPlaceholder, folderCardLayoutStyle]}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        );
      case 'file-heading':
        return (
          <View style={styles.section}>
            <SectionHeading count={item.count} title="文件" />
          </View>
        );
      case 'file-empty':
        return <EmptyLine text="当前目录没有直接文件" />;
      case 'file-group-heading':
        return (
          <View style={styles.sectionHeading}>
            <Text style={styles.fileGroupTitle}>{item.group.day}</Text>
            <Text style={styles.sectionCount}>
              {item.group.addr ? `${item.group.addr} · ` : ''}{item.group.list.length} 个文件
            </Text>
          </View>
        );
      case 'media-file':
        return (
          <View style={styles.mediaMasonryItem}>
            <FileTile
              authCode={session.tokens.authCode}
              baseUrl={session.serverUrl}
              cacheEnabled={cacheEnabled}
              cacheFolder={cacheFolder}
              cardSize={folderCardSize}
              file={item.file}
              onLongSelect={(nextFile) => toggleSelection(createFileSelectionKey(nextFile))}
              onPreviewFile={handlePreviewFile}
              onToggleSelection={(nextFile) => toggleSelection(createFileSelectionKey(nextFile))}
              selected={selectedKeys.has(createFileSelectionKey(item.file))}
              selectionMode={selectionMode}
              thumbnailsEnabled
              viewMode={viewMode}
              waterfall
            />
          </View>
        );
      case 'normal-file-row':
        return (
          <View style={viewMode === 'list' ? styles.fileList : styles.fileGrid}>
            {item.files.map((file) => (
              <FileTile
                authCode={session.tokens.authCode}
                baseUrl={session.serverUrl}
                cacheEnabled={cacheEnabled}
                cacheFolder={cacheFolder}
                cardSize={folderCardSize}
                file={file}
                key={file.id || file.md5 || file.name}
                onLongSelect={(nextFile) => toggleSelection(createFileSelectionKey(nextFile))}
                onPreviewFile={handlePreviewFile}
                onToggleSelection={(nextFile) => toggleSelection(createFileSelectionKey(nextFile))}
                selected={selectedKeys.has(createFileSelectionKey(file))}
                selectionMode={selectionMode}
                thumbnailsEnabled
                viewMode={viewMode}
              />
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  const renderDirectoryListItem = ({ item }: ListRenderItemInfo<DirectoryListItem>) => {
    return renderDirectoryListItemContent(item);
  };

  const renderPreviewChrome = () => (
    <>
      <View style={styles.previewHeader}>
        <Pressable onPress={closePreview} style={styles.previewBackButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.strong} name="close" size={21} />
        </Pressable>
        <Pressable
          accessibilityLabel={previewActionLabel}
          disabled={previewActionDisabled}
          onPress={() => void handleTogglePreviewMode()}
          style={[styles.previewOriginalAction, previewActionDisabled ? styles.previewToolButtonDisabled : null]}
        >
          <Ionicons color={MOBILE_SAGE_SLATE.title} name={previewImageShowsOriginal ? 'image' : 'image-outline'} size={16} />
          <Text numberOfLines={1} style={styles.previewOriginalActionText}>{previewActionLabel}</Text>
        </Pressable>
        <ScrollView
          contentContainerStyle={styles.previewToolbar}
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={styles.previewToolbarScroll}
        >
          <PreviewToolbarButton
            busy={previewBusyAction === 'share'}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="share-social-outline"
            label="分享"
            onPress={() => void handleSharePreviewFile()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === 'album'}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="albums-outline"
            label="添加到相册"
            onPress={() => void handleOpenPreviewAlbums()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === 'favorite'}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon={previewIsFavorite ? 'star' : 'star-outline'}
            label={previewIsFavorite ? '取消收藏' : '收藏'}
            onPress={() => void handleTogglePreviewFavorite()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === 'delete'}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="trash-outline"
            label="放到回收站"
            onPress={confirmDeletePreviewFile}
          />
          <PreviewToolbarButton
            disabled={!previewFile}
            icon="options-outline"
            label="显示设置"
            active={previewSettingsOpen}
            onPress={() => {
              setPreviewMoreOpen(false);
              setPreviewSettingsOpen((open) => !open);
            }}
          />
          <PreviewToolbarButton
            active={previewInfoVisible}
            disabled={!previewFile}
            icon="information-circle-outline"
            label="信息"
            onPress={() => {
              setPreviewMoreOpen(false);
              setPreviewInfoVisible((visible) => !visible);
            }}
          />
          <PreviewToolbarButton
            active={previewMoreOpen}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="ellipsis-vertical"
            label="更多"
            onPress={handleOpenPreviewMore}
          />
        </ScrollView>
      </View>
      {previewNotice ? (
        <View style={styles.previewNotice}>
          <Text style={styles.previewNoticeText}>{previewNotice}</Text>
        </View>
      ) : null}
      {previewSettingsOpen ? (
        <PreviewSettingsPanel
          actionDisabled={previewActionDisabled}
          actionLabel={previewActionLabel}
          cacheLabel={previewCacheLabel}
          hdReady={previewHdReady}
          imageSource={previewDisplayedImageSource}
          isVideo={previewIsVideo}
          mode={previewMode}
          onClose={() => setPreviewSettingsOpen(false)}
          onToggleMode={() => void handleTogglePreviewMode()}
          videoUsesTranscode={Boolean(previewFile && previewIsVideo && !isDirectVideoPreviewSupported(previewFile))}
          videoPreparing={videoPreparing}
        />
      ) : null}
      {previewMoreOpen ? (
        <PreviewMorePanel
          busy={Boolean(previewBusyAction)}
          onRefreshDescriptor={() => {
            setPreviewMoreOpen(false);
            void handleRefreshPreviewDescriptor();
          }}
          onRefreshInfo={() => {
            setPreviewMoreOpen(false);
            void handleRefreshPreviewInfo();
          }}
          onRefreshThumbs={() => {
            setPreviewMoreOpen(false);
            void handleRefreshPreviewThumbs();
          }}
        />
      ) : null}
    </>
  );

  const renderPreviewInfoLayer = () => {
    if (!previewInfoVisible) {
      return null;
    }

    return (
      <View pointerEvents="box-none" style={styles.previewInfoFloatingLayer}>
        <PreviewDetailPanel
          detail={previewDetail}
          error={previewDetailError}
          file={previewFile}
          loading={previewDetailLoading}
        />
      </View>
    );
  };

  const renderImagePreviewFooter = (imageIndex: number) => (
    <View
      pointerEvents="box-none"
      style={[styles.previewImageFooter, { paddingBottom: Math.max(24, safeAreaInsets.bottom + 14) }]}
    >
      <View style={styles.previewSourceBadge}>
        {previewPendingImageSource ? (
          <ActivityIndicator color="#e2e8f0" size="small" />
        ) : (
          <Ionicons color="#e2e8f0" name="layers-outline" size={13} />
        )}
        <Text style={styles.previewSourceBadgeText}>{previewImageSourceBadgeLabel}</Text>
      </View>
      {previewInfoVisible ? (
        <PreviewDetailPanel
          detail={previewDetail}
          error={previewDetailError}
          file={previewFile}
          loading={previewDetailLoading}
        />
      ) : (
        <View style={styles.previewImageHint}>
          <Text style={styles.previewImageHintTitle}>
            {imageIndex + 1} / {previewImageViewerImages.length}
          </Text>
          <Text style={styles.previewImageHintMeta}>左右滑动切换，下滑退出</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? (
        <Text style={[styles.message, { backgroundColor: '#fff', borderColor: theme.selection, color: theme.hex }]}>
          {message}
        </Text>
      ) : null}
      {mediaAuthLoading ? <Text style={styles.hint}>正在准备缩略图权限...</Text> : null}
      {selectionMode && selectedItems.length > 0 ? (
        <SelectionBar
          allSelected={allVisibleSelected}
          fileCount={selectedFiles.length}
          folderCount={selectedFolders.length}
          onClear={clearSelection}
          onDelete={confirmDeleteSelection}
          onMove={openMoveDialog}
          onToggleSelectAll={handleToggleSelectAll}
          selectableCount={selectionItems.length}
          selectedCount={selectedItems.length}
          submittingAction={submittingAction}
        />
      ) : null}

      <FlashList
        alwaysBounceVertical
        bounces
        contentContainerStyle={styles.content}
        data={directoryListItems}
        drawDistance={DIRECTORY_FLASH_LIST_DRAW_DISTANCE}
        getItemType={getDirectoryListItemType}
        keyExtractor={(item) => item.key}
        masonry={mediaColumnCount > 1}
        numColumns={mediaColumnCount}
        onScroll={handleDirectoryScroll}
        onScrollEndDrag={handleDirectoryScrollEndDrag}
        optimizeItemArrangement={false}
        overrideItemLayout={overrideDirectoryItemLayout}
        renderItem={renderDirectoryListItem}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />
      <View pointerEvents="none" style={styles.directoryRefreshOverlay}>
        <MobilePullRefreshIndicator active={directoryPulling || refreshing} theme={theme} />
      </View>

      <FolderFloatingMenu
        canCreateFolder={currentFolderId !== undefined}
        onOpenConfig={() => {
          setFolderFabOpen(false);
          setConfigDialogOpen(true);
        }}
        onOpenCreateFolder={() => {
          setFolderFabOpen(false);
          openFolderDialog('create');
        }}
        onToggle={() => setFolderFabOpen((current) => !current)}
        onToggleCovers={() => {
          setFolderFabOpen(false);
          setShowFolderCovers((current) => !current);
        }}
        open={folderFabOpen}
        showCovers={showFolderCovers}
        style={folderFabOffsetStyle}
      />

      <FolderConfigSheet
        cardSize={folderCardSize}
        canCreateFolder={currentFolderId !== undefined}
        onChangeCardSize={setFolderCardSize}
        onChangeSortDirection={setSortDirection}
        onChangeSortField={setSortField}
        onChangeViewMode={setViewMode}
        onClose={() => setConfigDialogOpen(false)}
        onOpenCreateFolder={() => {
          setConfigDialogOpen(false);
          openFolderDialog('create');
        }}
        onToggleCovers={() => setShowFolderCovers((current) => !current)}
        open={configDialogOpen}
        showCovers={showFolderCovers}
        sortDirection={sortDirection}
        sortField={sortField}
        viewMode={viewMode}
      />

      {previewUsesImageViewer ? <PreviewThumbnailWarmup sources={previewWarmThumbnailSources} /> : null}

      {previewUsesImageViewer ? (
        <ImageView
          animationType="fade"
          backgroundColor="#020617"
          doubleTapToZoomEnabled
          FooterComponent={({ imageIndex }) => renderImagePreviewFooter(imageIndex)}
          HeaderComponent={() => (
            <View pointerEvents="box-none" style={[styles.previewChromeLayer, previewSafeAreaStyle]}>
              {renderPreviewChrome()}
            </View>
          )}
          imageIndex={previewImageViewerInitialIndex}
          images={previewImageViewerImages}
          keyExtractor={(_image, imageIndex) => {
            const file = previewImageGalleryItems[imageIndex]?.file;

            return `${file?.id ?? imageIndex}-${file?.md5 ?? imageIndex}`;
          }}
          onImageIndexChange={handleImagePreviewIndexChange}
          onRequestClose={closePreview}
          presentationStyle="overFullScreen"
          swipeToCloseEnabled
          visible={previewUsesImageViewer}
        />
      ) : null}

      <MobileFullscreenModal
        onClose={closePreview}
        visible={Boolean(previewFile && !previewUsesImageViewer)}
      >
        <View {...previewPanResponder.panHandlers} style={[styles.previewOverlay, previewSafeAreaStyle]}>
          {renderPreviewChrome()}
          {previewFile && previewIsVideo ? (
            previewMode === 'original' ? (
              <InlineVideoPreview
                onFirstFrame={previewVideoCache.rememberLoadedResource}
                posterUri={previewListThumbnailCache.displayUri}
                sourceUri={previewVideoCache.displayUri}
              />
            ) : previewListThumbnailCache.displayUri ? (
              <Image
                onLoad={previewListThumbnailCache.rememberLoadedResource}
                resizeMode="contain"
                source={{ uri: previewListThumbnailCache.displayUri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.previewFallback}>
                <ActivityIndicator color={theme.hex} />
                <Text style={styles.previewFallbackText}>正在读取视频封面</Text>
              </View>
            )
          ) : previewFile && (previewListThumbnailUrl || previewHdImageUrl) ? (
            previewMode === 'original' ? (
              previewOriginalImageCache.displayUri ? (
                <Image
                  onLoad={previewOriginalImageCache.rememberLoadedResource}
                  resizeMode="contain"
                  source={{ uri: previewOriginalImageCache.displayUri }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.previewFallback}>
                  <ActivityIndicator color={theme.hex} />
                  <Text style={styles.previewFallbackText}>正在读取原图</Text>
                </View>
              )
            ) : (
              <ProgressiveImagePreview
                hdReady={previewHdReady}
                hdSource={previewHdImageCache.displayUri}
                onHdLoad={() => {
                  previewHdImageCache.rememberLoadedResource();
                  setPreviewHdLoadedUri(previewHdImageCache.displayUri);
                }}
                onThumbnailLoad={previewListThumbnailCache.rememberLoadedResource}
                themeColor={theme.hex}
                thumbnailSource={previewListThumbnailCache.displayUri}
              />
            )
          ) : (
            <View style={styles.previewFallback}>
              <Text style={styles.previewFallbackTitle}>暂不支持预览</Text>
              <Text style={styles.previewFallbackText}>
                当前文件没有可用的内置预览地址。
              </Text>
            </View>
          )}
          {renderPreviewInfoLayer()}
          <View style={styles.previewStepper}>
            <Pressable
              disabled={previewIndex <= 0}
              onPress={() => handleStepPreview(-1)}
              style={[styles.previewStepButton, previewIndex <= 0 ? styles.disabledButton : null]}
            >
              <Text style={styles.previewStepText}>‹</Text>
            </Pressable>
            <Text style={styles.previewStepMeta}>
              {previewIndex >= 0 ? `${previewIndex + 1} / ${previewFiles.length}` : '0 / 0'}
            </Text>
            <Pressable
              disabled={previewIndex < 0 || previewIndex >= previewFiles.length - 1}
              onPress={() => handleStepPreview(1)}
              style={[
                styles.previewStepButton,
                previewIndex < 0 || previewIndex >= previewFiles.length - 1 ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.previewStepText}>›</Text>
            </Pressable>
          </View>
        </View>
      </MobileFullscreenModal>

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

      <FolderNameDialog
        error={folderDialogError}
        mode={folderDialogMode}
        name={folderDialogName}
        onCancel={() => {
          if (!folderSubmitting) {
            setFolderDialogMode(undefined);
            setFolderDialogError('');
            setFolderDialogTarget(undefined);
          }
        }}
        onChangeName={setFolderDialogName}
        onSubmit={handleSubmitFolderDialog}
        submitting={folderSubmitting}
      />

      <FolderCoverDialog
        autoSubmitting={coverDialogAutoSubmitting}
        authCode={session.tokens.authCode}
        cacheEnabled={cacheEnabled}
        cacheFolder={coverDialogCacheFolder}
        currentPath={coverDialogDirectory.path || coverDialogTarget?.path || coverDialogTarget?.name || '当前文件夹'}
        directory={coverDialogDirectory}
        error={coverDialogError}
        folder={coverDialogTarget}
        loading={coverDialogLoading}
        onAutoSet={handleAutoSetCoverDialog}
        onClose={closeCoverDialog}
        onOpenFolder={(folder) => void loadCoverDialogDirectory(folder.id)}
        onOpenFolderId={(folderId) => void loadCoverDialogDirectory(folderId)}
        onSubmit={handleSaveCoverDialog}
        onToggleFile={handleToggleCoverFile}
        selectedHashes={coverDialogSelectedHashes}
        serverUrl={session.serverUrl}
        submitting={coverDialogSubmitting}
      />

      <BatchMoveDialog
        currentDirectory={moveDialogDirectory}
        error={moveDialogError}
        loading={moveDialogLoading}
        onChangeOverwriteMode={setMoveDialogOverwriteMode}
        onClose={() => {
          if (submittingAction !== 'move') {
            setMoveDialogOpen(false);
          }
        }}
        onOpenFolder={(folder) => void loadMoveDialogDirectory(folder.id)}
        onOpenFolderId={(folderId) => void loadMoveDialogDirectory(folderId)}
        onOpenRoot={() => void loadMoveDialogDirectory()}
        onSelectTarget={setMoveDialogTarget}
        onSubmit={handleSubmitMoveDialog}
        open={moveDialogOpen}
        overwriteMode={moveDialogOverwriteMode}
        selectedSummary={formatSelectionSummary(selectedFolders.length, selectedFiles.length)}
        submitting={submittingAction === 'move'}
        target={moveDialogTarget}
      />
    </View>
  );
};

interface FolderFloatingMenuProps {
  canCreateFolder: boolean;
  onOpenConfig: () => void;
  onOpenCreateFolder: () => void;
  onToggle: () => void;
  onToggleCovers: () => void;
  open: boolean;
  showCovers: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders the folder shortcut menu with the same sage FAB shape used on Web.
 */
const FolderFloatingMenu = ({
  canCreateFolder,
  onOpenConfig,
  onOpenCreateFolder,
  onToggle,
  onToggleCovers,
  open,
  showCovers,
  style,
}: FolderFloatingMenuProps) => {
  const theme = useMobileTheme();
  const hiddenCoverIcon: FolderFabIconName = showCovers ? 'image-outline' : 'eye-off-outline';

  return (
    <View pointerEvents="box-none" style={[styles.folderFab, style]}>
      {open ? (
        <View style={styles.folderFabMenu}>
          <Pressable
            accessibilityLabel="文件夹配置"
            onPress={onOpenConfig}
            style={styles.folderFabMenuButton}
          >
            <Ionicons color={theme.hex} name="settings-outline" size={18} />
          </Pressable>
          <Pressable
            accessibilityLabel="新建文件夹"
            disabled={!canCreateFolder}
            onPress={onOpenCreateFolder}
            style={[styles.folderFabMenuButton, !canCreateFolder ? styles.disabledButton : null]}
          >
            <Ionicons
              color={canCreateFolder ? theme.hex : MOBILE_SAGE_SLATE.subtle}
              name="folder-open-outline"
              size={18}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={showCovers ? '隐藏封面图' : '显示封面图'}
            onPress={onToggleCovers}
            style={styles.folderFabMenuButton}
          >
            <Ionicons color={theme.hex} name={hiddenCoverIcon} size={18} />
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="快捷菜单"
        onPress={onToggle}
        style={styles.folderFabMain}
      >
        <Text style={[styles.folderFabMainText, { color: theme.hex }]}>❄</Text>
      </Pressable>
    </View>
  );
};

const FolderConfigSheet = ({
  cardSize,
  canCreateFolder,
  onChangeCardSize,
  onChangeSortDirection,
  onChangeSortField,
  onChangeViewMode,
  onClose,
  onOpenCreateFolder,
  onToggleCovers,
  open,
  showCovers,
  sortDirection,
  sortField,
  viewMode,
}: {
  cardSize: MobileFolderCardSize;
  canCreateFolder: boolean;
  onChangeCardSize: (size: MobileFolderCardSize) => void;
  onChangeSortDirection: (direction: MobileFolderSortDirection) => void;
  onChangeSortField: (field: MobileFolderSortField) => void;
  onChangeViewMode: (mode: MobileFolderViewMode) => void;
  onClose: () => void;
  onOpenCreateFolder: () => void;
  onToggleCovers: () => void;
  open: boolean;
  showCovers: boolean;
  sortDirection: MobileFolderSortDirection;
  sortField: MobileFolderSortField;
  viewMode: MobileFolderViewMode;
}) => {
  const theme = useMobileTheme();
  const activePanelStyle = { backgroundColor: theme.selection, borderColor: theme.light };

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.configOverlay}
      contentStyle={styles.configSheet}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.configSheetHandle} />
          <View style={styles.configHeader}>
            <View style={[styles.configHeaderIcon, { backgroundColor: theme.selection }]}>
              <Ionicons color={theme.hex} name="options-outline" size={18} />
            </View>
            <View style={styles.configHeaderCopy}>
              <Text style={styles.configTitle}>文件夹配置</Text>
              <Text style={styles.configSummaryText}>
                {viewMode === 'list' ? '列表' : '宫格'} · {SORT_FIELD_LABEL[sortField]} · {SORT_DIRECTION_LABEL[sortDirection]}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.configCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <View style={styles.configQuickGrid}>
            <Pressable
              disabled={!canCreateFolder}
              onPress={onOpenCreateFolder}
              style={[styles.configQuickButton, !canCreateFolder ? styles.disabledButton : null]}
            >
              <View style={[styles.configQuickIcon, { backgroundColor: theme.selection }]}>
                <Ionicons color={theme.hex} name="add-circle-outline" size={18} />
              </View>
              <View style={styles.configQuickCopy}>
                <Text style={styles.configQuickTitle}>新建文件夹</Text>
                <Text style={styles.configQuickMeta}>当前目录</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={onToggleCovers}
              style={[styles.configQuickButton, showCovers ? activePanelStyle : null]}
            >
              <View style={[styles.configQuickIcon, showCovers ? { backgroundColor: theme.hex } : null]}>
                <Ionicons
                  color={showCovers ? '#fff' : theme.hex}
                  name={showCovers ? 'image-outline' : 'eye-off-outline'}
                  size={18}
                />
              </View>
              <View style={styles.configQuickCopy}>
                <Text style={[styles.configQuickTitle, showCovers ? { color: theme.hex } : null]}>封面图</Text>
                <Text style={[styles.configQuickMeta, showCovers ? { color: theme.hex } : null]}>
                  {showCovers ? '显示中' : '已隐藏'}
                </Text>
              </View>
            </Pressable>
          </View>

          <View style={styles.configControlPanel}>
            <ConfigSectionTitle icon="apps-outline" meta={viewMode === 'grid' ? '封面优先' : '信息优先'} title="展示方式" />
            <ConfigIconGrid
              activeValue={viewMode}
              items={VIEW_MODE_OPTIONS}
              onChange={onChangeViewMode}
            />
            <ConfigSectionTitle icon="scan-outline" meta={CARD_SIZE_OPTIONS.find((item) => item.value === cardSize)?.meta ?? ''} title="卡片大小" />
            <ConfigIconGrid
              activeValue={cardSize}
              items={CARD_SIZE_OPTIONS}
              onChange={onChangeCardSize}
            />
          </View>

          <View style={styles.configControlPanel}>
            <ConfigSectionTitle icon="funnel-outline" meta={SORT_DIRECTION_LABEL[sortDirection]} title="排序字段" />
            <View style={styles.configSortGrid}>
              {SORT_FIELD_OPTIONS.map((field) => (
                <Pressable
                  key={field}
                  onPress={() => onChangeSortField(field)}
                  style={[styles.configOptionPill, sortField === field ? activePanelStyle : null]}
                >
                  <Ionicons
                    color={sortField === field ? theme.hex : MOBILE_SAGE_SLATE.muted}
                    name={SORT_FIELD_ICON[field]}
                    size={14}
                  />
                  <Text style={[styles.configOptionText, sortField === field ? { color: theme.hex } : null]}>
                    {SORT_FIELD_LABEL[field]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ConfigSectionTitle icon="swap-vertical-outline" meta="方向" title="排序方向" />
            <View style={styles.configSortGrid}>
              {SORT_DIRECTION_OPTIONS.map((direction) => (
                <Pressable
                  key={direction}
                  onPress={() => onChangeSortDirection(direction)}
                  style={[styles.configOptionPill, sortDirection === direction ? activePanelStyle : null]}
                >
                  <Ionicons
                    color={sortDirection === direction ? theme.hex : MOBILE_SAGE_SLATE.muted}
                    name={SORT_DIRECTION_ICON[direction]}
                    size={14}
                  />
                  <Text style={[styles.configOptionText, sortDirection === direction ? { color: theme.hex } : null]}>
                    {SORT_DIRECTION_LABEL[direction]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
    </MobileBottomSheetModal>
  );
};

const ConfigSectionTitle = ({
  icon,
  meta,
  title,
}: {
  icon: FolderFabIconName;
  meta: string;
  title: string;
}) => {
  const theme = useMobileTheme();

  return (
    <View style={styles.configPanelTitleRow}>
      <View style={styles.configPanelTitleMain}>
        <Ionicons color={theme.hex} name={icon} size={15} />
        <Text style={styles.configLabel}>{title}</Text>
      </View>
      <Text style={styles.configTinyMeta}>{meta}</Text>
    </View>
  );
};

const ConfigIconGrid = <TValue extends string>({
  activeValue,
  items,
  onChange,
}: {
  activeValue: TValue;
  items: Array<{ icon: FolderFabIconName; label: string; meta: string; value: TValue }>;
  onChange: (value: TValue) => void;
}) => {
  const theme = useMobileTheme();

  return (
    <View style={styles.configIconGrid}>
      {items.map((item) => {
        const active = activeValue === item.value;

        return (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={[
              styles.configIconOption,
              active ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
            ]}
          >
            <Ionicons color={active ? theme.hex : MOBILE_SAGE_SLATE.muted} name={item.icon} size={17} />
            <View style={styles.configIconOptionCopy}>
              <Text style={[styles.configIconOptionTitle, active ? { color: theme.hex } : null]}>
                {item.label}
              </Text>
              <Text style={[styles.configIconOptionMeta, active ? { color: theme.hex } : null]}>
                {item.meta}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const SegmentedControl = <TValue extends string>({
  activeValue,
  items,
  onChange,
}: {
  activeValue: TValue;
  items: Array<{ label: string; value: TValue }>;
  onChange: (value: TValue) => void;
}) => {
  const theme = useMobileTheme();

  return (
    <View style={styles.segmented}>
      {items.map((item) => (
        <Pressable
          key={item.value}
          onPress={() => onChange(item.value)}
          style={[
            styles.segmentedItem,
            activeValue === item.value ? styles.segmentedItemActive : null,
            activeValue === item.value ? { backgroundColor: theme.selection } : null,
          ]}
        >
          <Text
            style={[
              styles.segmentedText,
              activeValue === item.value ? styles.segmentedTextActive : null,
              activeValue === item.value ? { color: theme.hex } : null,
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
};

const SectionHeading = ({ count, title, trailing }: { count: number; title: string; trailing?: ReactNode }) => {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionHeadingRight}>
        {trailing}
        <Text style={styles.sectionCount}>{count} 个</Text>
      </View>
    </View>
  );
};

const SelectionBar = ({
  allSelected,
  fileCount,
  folderCount,
  onClear,
  onDelete,
  onMove,
  onToggleSelectAll,
  selectableCount,
  selectedCount,
  submittingAction,
}: {
  allSelected: boolean;
  fileCount: number;
  folderCount: number;
  onClear: () => void;
  onDelete: () => void;
  onMove: () => void;
  onToggleSelectAll: () => void;
  selectableCount: number;
  selectedCount: number;
  submittingAction?: 'delete' | 'move';
}) => {
  const theme = useMobileTheme();

  return (
    <View style={[styles.selectionBar, { borderColor: theme.light }]}>
      <View style={styles.selectionSummary}>
        <Text style={styles.selectionTitle}>已选择 {selectedCount} 项</Text>
        <Text numberOfLines={1} style={styles.selectionMeta}>
          {folderCount} 个文件夹，{fileCount} 个文件 · 当前可选 {selectableCount} 项
        </Text>
      </View>
      <View style={styles.selectionActions}>
        <Pressable onPress={onToggleSelectAll} style={styles.selectionActionButton}>
          <Text style={styles.selectionActionText}>{allSelected ? '取消全选' : '全选'}</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(submittingAction)}
          onPress={onMove}
          style={[styles.selectionActionButton, submittingAction ? styles.disabledButton : null]}
        >
          <Text style={styles.selectionActionText}>{submittingAction === 'move' ? '移动中' : '移动'}</Text>
        </Pressable>
        <Pressable
          disabled={Boolean(submittingAction)}
          onPress={onDelete}
          style={[styles.selectionDangerButton, submittingAction ? styles.disabledButton : null]}
        >
          <Text style={styles.selectionDangerText}>{submittingAction === 'delete' ? '删除中' : '删除'}</Text>
        </Pressable>
        <Pressable onPress={onClear} style={styles.selectionIconButton}>
          <Text style={styles.selectionActionText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
};

/**
 * Renders an image through the mobile file cache before falling back to network.
 */
const CachedMobileImage = ({
  cacheOnMiss = false,
  cacheEnabled,
  cacheFolder,
  fileId,
  kind,
  md5,
  resizeMode = 'cover',
  sourceUrl,
  style,
  variant,
}: {
  cacheOnMiss?: boolean;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  fileId?: number;
  kind: Exclude<MobileLocalCacheResourceKind, 'directory'>;
  md5?: string;
  resizeMode?: 'center' | 'contain' | 'cover' | 'repeat' | 'stretch';
  sourceUrl?: string;
  style: StyleProp<ImageStyle>;
  variant?: string;
}) => {
  const cachedImage = useCachedMobileMediaUri({
    cacheOnMiss,
    enabled: cacheEnabled,
    fileId,
    folder: cacheFolder,
    kind,
    md5,
    sourceUrl,
    variant,
  });

  if (!cachedImage.displayUri) {
    return null;
  }

  return (
    <Image
      onLoad={cachedImage.rememberLoadedResource}
      resizeMode={resizeMode}
      source={{ uri: cachedImage.displayUri }}
      style={style}
    />
  );
};

/**
 * Mounts hidden neighbor thumbnails to force React Native to decode them before carousel swipes.
 */
const PreviewThumbnailWarmup = ({ sources }: { sources: string[] }) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.previewWarmupLayer}>
      {sources.map((uri, index) => (
        <Image key={`${uri}-${index}`} resizeMode="cover" source={{ uri }} style={styles.previewWarmupImage} />
      ))}
    </View>
  );
};

/**
 * Plays preview videos inside the modal so media never jumps to the system viewer.
 */
const InlineVideoPreview = ({
  onFirstFrame,
  posterUri,
  sourceUri,
}: {
  onFirstFrame: () => void;
  posterUri?: string;
  sourceUri?: string;
}) => {
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);
  const player = useVideoPlayer(null, (createdPlayer) => {
    createdPlayer.allowsExternalPlayback = false;
    createdPlayer.loop = false;
  });

  useEffect(() => {
    let cancelled = false;

    setFirstFrameRendered(false);

    const safelyPausePlayer = (): void => {
      try {
        player.pause();
      } catch {
        // The native video object can be released before React runs modal cleanup.
      }
    };

    if (!sourceUri) {
      safelyPausePlayer();
      return () => {
        cancelled = true;
        safelyPausePlayer();
      };
    }

    void player.replaceAsync(sourceUri)
      .then(() => {
        if (!cancelled) {
          try {
            player.play();
          } catch {
            // Playback may fail if the preview was closed while the source was loading.
          }
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      safelyPausePlayer();
    };
  }, [player, sourceUri]);

  if (!sourceUri) {
    return (
      <View style={styles.previewFallback}>
        <ActivityIndicator color="#f8fafc" />
        <Text style={styles.previewFallbackText}>正在准备内置视频预览</Text>
      </View>
    );
  }

  return (
    <View style={styles.previewVideoShell}>
      <VideoView
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls
        onFirstFrameRender={() => {
          setFirstFrameRendered(true);
          onFirstFrame();
        }}
        player={player}
        style={styles.previewVideo}
      />
      {posterUri && !firstFrameRendered ? (
        <View pointerEvents="none" style={styles.previewVideoPoster}>
          <Image resizeMode="contain" source={{ uri: posterUri }} style={styles.previewVideoPosterImage} />
        </View>
      ) : null}
    </View>
  );
};

/**
 * Keeps the first fullscreen paint consistent with the list thumbnail, then swaps in HD preview after load.
 */
const ProgressiveImagePreview = ({
  hdReady,
  hdSource,
  onHdLoad,
  onThumbnailLoad,
  themeColor,
  thumbnailSource,
}: ProgressiveImagePreviewProps) => {
  if (!thumbnailSource && !hdSource) {
    return (
      <View style={styles.previewFallback}>
        <ActivityIndicator color={themeColor} />
        <Text style={styles.previewFallbackText}>正在读取列表缩略图</Text>
      </View>
    );
  }

  return (
    <View style={styles.previewProgressiveImage}>
      {thumbnailSource ? (
        <Image
          onLoad={onThumbnailLoad}
          resizeMode="contain"
          source={{ uri: thumbnailSource }}
          style={styles.previewImageLayer}
        />
      ) : (
        <View style={[styles.previewImageLayer, styles.previewImageLayerFallback]}>
          <ActivityIndicator color={themeColor} />
          <Text style={styles.previewFallbackText}>正在读取列表缩略图</Text>
        </View>
      )}
      {hdSource ? (
        <Image
          onLoad={onHdLoad}
          resizeMode="contain"
          source={{ uri: hdSource }}
          style={[
            styles.previewImageLayer,
            hdReady ? styles.previewImageLayerVisible : styles.previewImageLayerHidden,
          ]}
        />
      ) : null}
      {!hdReady ? (
        <View pointerEvents="none" style={styles.previewUpgradeBadge}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.previewUpgradeBadgeText}>
            {hdSource ? '高清预览加载中' : '正在获取高清预览'}
          </Text>
        </View>
      ) : null}
    </View>
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
  return (
    <MobileCenterDialog
      backdropStyle={styles.dialogOverlay}
      contentStyle={styles.previewAlbumDialog}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.previewAlbumHeader}>
            <View>
              <Text style={styles.dialogTitle}>添加到相册</Text>
              <Text style={styles.dialogDescription}>与官方预览中的相册选择逻辑一致。</Text>
            </View>
            <Pressable onPress={onClose} style={styles.previewAlbumClose}>
              <Ionicons color={MOBILE_SAGE_SLATE.body} name="close" size={20} />
            </Pressable>
          </View>
          {loading ? (
            <View style={styles.dialogLoadingLine}>
              <ActivityIndicator color={MOBILE_SAGE_SLATE.body} />
              <Text style={styles.dialogLoadingText}>正在读取相册</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.dialogError}>{error}</Text> : null}
          {!loading && albums.length === 0 ? (
            <Text style={styles.dialogEmptyText}>暂无可添加的相册</Text>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false} style={styles.previewAlbumList}>
            {albums.map((album) => {
              const included = albumIds.includes(album.id);

              return (
                <Pressable
                  disabled={busy}
                  key={album.id}
                  onPress={() => onToggleAlbum(album)}
                  style={[styles.previewAlbumRow, included ? styles.previewAlbumRowActive : null]}
                >
                  <View style={[styles.previewAlbumRowIcon, included ? styles.previewAlbumRowIconActive : null]}>
                    <Ionicons
                      color={included ? '#fff' : MOBILE_SAGE_SLATE.muted}
                      name={included ? 'checkmark' : 'albums-outline'}
                      size={18}
                    />
                  </View>
                  <View style={styles.previewAlbumRowCopy}>
                    <Text style={styles.previewAlbumRowTitle}>{album.name}</Text>
                    <Text style={styles.previewAlbumRowMeta}>{album.count ?? 0} 个文件</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
    </MobileCenterDialog>
  );
};

const FolderCard = ({
  authCode,
  baseUrl,
  cacheEnabled,
  cacheFolder,
  cardLayoutStyle,
  cardSize,
  folder,
  onLongSelect,
  onOpen,
  onRename,
  onSetCover,
  onToggleSelection,
  selected,
  selectionMode,
  showCover,
  thumbnailsEnabled,
  viewMode,
}: {
  authCode?: string;
  baseUrl: string;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  cardLayoutStyle?: ViewStyle;
  cardSize: MobileFolderCardSize;
  folder: FolderSummary;
  onLongSelect: () => void;
  onOpen: (folder: FolderSummary) => void;
  onRename: () => void;
  onSetCover: () => void;
  onToggleSelection: () => void;
  selected: boolean;
  selectionMode: boolean;
  showCover: boolean;
  thumbnailsEnabled: boolean;
  viewMode: MobileFolderViewMode;
}) => {
  const theme = useMobileTheme();
  const [actionsOpen, setActionsOpen] = useState(false);
  const folderCoverCacheFolder = useMemo(
    () =>
      createMobileLocalCacheFolderRef({
        folderId: folder.id,
        folderName: folder.name,
        folderPath: folder.path,
        scope: cacheFolder.scope,
      }),
    [cacheFolder.scope, folder.id, folder.name, folder.path],
  );
  const coverItems = showCover
    ? folder.coverHashes
        .map((md5) => ({
          md5,
          url: createThumbnailUrl({ authCode, baseUrl, md5 }),
        }))
        .filter((item): item is { md5: string; url: string } => Boolean(item.url))
    : [];
  const contentCount = folder.childCount + folder.fileCount + folder.trashCount;
  const isListMode = viewMode === 'list';
  const shouldMergeFolderMeta = isListMode || cardSize === 'large';
  const showFolderPath = isListMode || cardSize !== 'small';
  const showFolderMeta = cardSize !== 'small' || isListMode;
  const showCoverIcon = !thumbnailsEnabled || coverItems.length === 0;
  const folderPathLines = cardSize === 'large' ? 2 : 1;
  const folderCoverIconSize = isListMode
    ? cardSize === 'large'
      ? 19
      : cardSize === 'small'
        ? 13
        : 16
    : cardSize === 'large'
      ? 26
      : cardSize === 'small'
        ? 18
        : 22;
  const visibleCoverItems = coverItems.slice(0, MAX_FOLDER_COVER_COUNT);
  const coverBackgroundColor = theme.selection;

  return (
    <Pressable
      delayLongPress={LONG_PRESS_DELAY_MS}
      onLongPress={onLongSelect}
      onPress={() => onOpen(folder)}
      style={({ pressed }) => [
        styles.folderCard,
        styles[`${cardSize}FolderCard`],
        isListMode ? styles.listFolderCard : null,
        isListMode && cardSize === 'small' ? styles.smallListFolderCardFrame : null,
        isListMode && cardSize === 'medium' ? styles.mediumListFolderCardFrame : null,
        isListMode && cardSize === 'large' ? styles.largeListFolderCardFrame : null,
        cardLayoutStyle,
        selected ? [styles.selectedCard, { borderColor: theme.hex }] : null,
        pressed ? styles.pressedCard : null,
      ]}
    >
      {selectionMode || selected ? (
        <Pressable
          onPress={onToggleSelection}
          style={[
            styles.selectionToggle,
            selected ? styles.selectionToggleSelected : null,
            selected ? { backgroundColor: theme.hex, borderColor: theme.hex } : null,
          ]}
        >
          <Text style={styles.selectionToggleText}>{selected ? '✓' : ''}</Text>
        </Pressable>
      ) : null}
      <View style={[
        styles.folderCover,
        styles[`${cardSize}FolderCover`],
        isListMode ? styles.listFolderCover : null,
        isListMode ? styles[`${cardSize}ListFolderCover`] : null,
        { backgroundColor: coverBackgroundColor },
      ]}>
        {showCoverIcon ? (
          <View style={[
            styles.folderCoverIcon,
            cardSize === 'small' ? styles.smallFolderCoverIcon : null,
            cardSize === 'large' ? styles.largeFolderCoverIcon : null,
            isListMode ? styles.listFolderCoverIcon : null,
            isListMode && cardSize === 'small' ? styles.smallListFolderCoverIcon : null,
            isListMode && cardSize === 'large' ? styles.largeListFolderCoverIcon : null,
          ]}>
            <Ionicons color="#fff" name="folder-outline" size={folderCoverIconSize} />
          </View>
        ) : null}
        <Text style={[styles.folderCount, cardSize === 'small' ? styles.smallFolderCount : null]}>{contentCount}</Text>
        {visibleCoverItems.length > 0 ? (
          <View style={styles.folderCoverImages}>
            {visibleCoverItems.map((item, index) => (
              <CachedMobileImage
                cacheOnMiss
                cacheEnabled={cacheEnabled && thumbnailsEnabled}
                cacheFolder={folderCoverCacheFolder}
                kind="folder-cover"
                key={item.md5}
                md5={item.md5}
                resizeMode="cover"
                sourceUrl={thumbnailsEnabled ? item.url : undefined}
                style={[
                  styles.folderCoverImage,
                  getMobileCoverImageLayoutStyle(index, visibleCoverItems.length),
                ]}
                variant="h220"
              />
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.folderCardBody}>
        <Text
          numberOfLines={1}
          style={[
            styles.folderCardTitle,
            cardSize === 'small' ? styles.smallFolderCardTitle : null,
            cardSize === 'large' ? styles.largeFolderCardTitle : null,
          ]}
        >
          {folder.name}
        </Text>
        {showFolderPath ? (
          <Text
            numberOfLines={folderPathLines}
            style={[
              styles.folderCardPath,
              cardSize === 'large' ? styles.largeFolderCardPath : null,
            ]}
          >
            {folder.path}
          </Text>
        ) : null}
        <View style={styles.folderStatusLine}>
          <View style={styles.folderStatusMain}>
            <Text
              style={[
                styles.tag,
                folder.trashCount > 0 || folder.status === 'scanning'
                  ? [styles.themeTag, { backgroundColor: theme.selection, color: theme.hex }]
                  : null,
              ]}
            >
              {folder.trashCount > 0 ? `${folder.trashCount} 回收` : STATUS_COPY[folder.status]}
            </Text>
            {shouldMergeFolderMeta ? (
              <View style={[styles.folderMeta, styles.folderMetaInline]}>
                <Text style={styles.folderMetaText}>{folder.childCount} 个子文件夹</Text>
                <Text style={styles.folderMetaText}>{folder.fileCount} 个文件</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              setActionsOpen((current) => !current);
            }}
            style={[
              styles.folderActionsToggle,
              actionsOpen ? styles.folderActionsToggleActive : null,
              actionsOpen ? { backgroundColor: theme.selection } : null,
            ]}
          >
            <Text style={[styles.folderActionsToggleText, actionsOpen ? { color: theme.hex } : null]}>⋯</Text>
          </Pressable>
        </View>
        <MobileCenterDialog
          backdropStyle={styles.folderActionSheetOverlay}
          contentStyle={styles.folderActionSheet}
          onClose={() => setActionsOpen(false)}
          visible={actionsOpen}
        >
          <View style={styles.folderActionSheetHeader}>
            <Text numberOfLines={1} style={styles.folderActionSheetTitle}>{folder.name}</Text>
            <Pressable onPress={() => setActionsOpen(false)} style={styles.folderActionSheetClose}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close" size={18} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              setActionsOpen(false);
              onRename();
            }}
            style={({ pressed }) => [
              styles.folderActionSheetButton,
              pressed ? { backgroundColor: theme.selection, borderColor: theme.hex } : null,
            ]}
          >
            <View style={[styles.folderActionSheetIcon, { backgroundColor: theme.selection }]}>
              <Ionicons color={theme.hex} name="pencil-outline" size={17} />
            </View>
            <Text style={styles.folderActionSheetButtonText}>重命名</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setActionsOpen(false);
              onSetCover();
            }}
            style={({ pressed }) => [
              styles.folderActionSheetButton,
              pressed ? { backgroundColor: theme.selection, borderColor: theme.hex } : null,
            ]}
          >
            <View style={[styles.folderActionSheetIcon, { backgroundColor: theme.selection }]}>
              <Ionicons color={theme.hex} name="image-outline" size={17} />
            </View>
            <Text style={styles.folderActionSheetButtonText}>设封面</Text>
          </Pressable>
        </MobileCenterDialog>
        {showFolderMeta && !shouldMergeFolderMeta ? (
          <View style={styles.folderMeta}>
            <Text style={styles.folderMetaText}>{folder.childCount} 个子文件夹</Text>
            <Text style={styles.folderMetaText}>{folder.fileCount} 个文件</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

/**
 * Maps 1-4 cover images to the same collage rules used by Web and desktop.
 * @param imageIndex Current cover image index.
 * @param imageCount Visible cover image count.
 */
const getMobileCoverImageLayoutStyle = (imageIndex: number, imageCount: number): ImageStyle => {
  if (imageCount <= 1) {
    return styles.folderCoverImageFull;
  }

  if (imageCount === 2) {
    return styles.folderCoverImageDouble;
  }

  if (imageCount === 3 && imageIndex === 0) {
    return styles.folderCoverImageTriplePrimary;
  }

  return styles.folderCoverImage;
};

const FileGroupPreview = ({
  authCode,
  baseUrl,
  cacheEnabled,
  cacheFolder,
  cardSize,
  group,
  loadedThumbnailKeys,
  onLongSelect,
  onPreviewFile,
  onToggleSelection,
  selectedKeys,
  selectionMode,
  viewMode,
}: {
  authCode?: string;
  baseUrl: string;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  cardSize: MobileFolderCardSize;
  group: FolderFileGroup;
  loadedThumbnailKeys: ReadonlySet<string>;
  onLongSelect: (file: FolderFileSummary) => void;
  onPreviewFile: (file: FolderFileSummary) => void;
  onToggleSelection: (file: FolderFileSummary) => void;
  selectedKeys: ReadonlySet<DirectorySelectionKey>;
  selectionMode: boolean;
  viewMode: MobileFolderViewMode;
}) => {
  const mediaFiles = group.list.filter(isMediaFile);
  const normalFiles = group.list.filter((file) => !isMediaFile(file));
  const mediaColumns = buildMediaWaterfallColumns(mediaFiles, getMediaWaterfallColumnCount(cardSize));

  return (
    <View style={styles.fileGroup}>
      <View style={styles.sectionHeading}>
        <Text style={styles.fileGroupTitle}>{group.day}</Text>
        <Text style={styles.sectionCount}>
          {group.addr ? `${group.addr} · ` : ''}{group.list.length} 个文件
        </Text>
      </View>
      {mediaFiles.length > 0 ? (
        <View style={styles.mediaWaterfall}>
          {mediaColumns.map((column, index) => (
            <View key={`${group.day}-media-column-${index}`} style={styles.mediaWaterfallColumn}>
              {column.map((file) => (
                <FileTile
                  authCode={authCode}
                  baseUrl={baseUrl}
                  cacheEnabled={cacheEnabled}
                  cacheFolder={cacheFolder}
                  cardSize={cardSize}
                  file={file}
                  key={file.id || file.md5 || file.name}
                  onLongSelect={onLongSelect}
                  onPreviewFile={onPreviewFile}
                  onToggleSelection={onToggleSelection}
                  selected={selectedKeys.has(createFileSelectionKey(file))}
                  selectionMode={selectionMode}
                  thumbnailsEnabled={loadedThumbnailKeys.has(createFileThumbnailKey(file))}
                  viewMode={viewMode}
                  waterfall
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
      {normalFiles.length > 0 ? (
        <View style={viewMode === 'list' ? styles.fileList : styles.fileGrid}>
          {normalFiles.map((file) => (
            <FileTile
              authCode={authCode}
              baseUrl={baseUrl}
              cacheEnabled={cacheEnabled}
              cacheFolder={cacheFolder}
              cardSize={cardSize}
              file={file}
              key={file.id || file.md5 || file.name}
              onLongSelect={onLongSelect}
              onPreviewFile={onPreviewFile}
              onToggleSelection={onToggleSelection}
              selected={selectedKeys.has(createFileSelectionKey(file))}
              selectionMode={selectionMode}
              thumbnailsEnabled={loadedThumbnailKeys.has(createFileThumbnailKey(file))}
              viewMode={viewMode}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const FileTile = ({
  authCode,
  baseUrl,
  cacheEnabled,
  cacheFolder,
  cardSize,
  file,
  onLongSelect,
  onPreviewFile,
  onToggleSelection,
  selected,
  selectionMode,
  thumbnailsEnabled,
  viewMode,
  waterfall = false,
}: {
  authCode?: string;
  baseUrl: string;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  cardSize: MobileFolderCardSize;
  file: FolderFileSummary;
  onLongSelect: (file: FolderFileSummary) => void;
  onPreviewFile: (file: FolderFileSummary) => void;
  onToggleSelection: (file: FolderFileSummary) => void;
  selected: boolean;
  selectionMode: boolean;
  thumbnailsEnabled: boolean;
  viewMode: MobileFolderViewMode;
  waterfall?: boolean;
}) => {
  const theme = useMobileTheme();
  const thumbnailUrl = createThumbnailUrl({
    authCode,
    baseUrl,
    md5: file.md5,
    type: isVideoFile(file) ? 'poster' : 'h220',
  });
  const thumbnailCache = useCachedMobileMediaUri({
    cacheOnMiss: true,
    enabled: cacheEnabled && thumbnailsEnabled,
    fileId: file.id,
    folder: cacheFolder,
    kind: 'file-thumbnail',
    md5: file.md5,
    sourceUrl: thumbnailsEnabled ? thumbnailUrl : undefined,
    variant: isVideoFile(file) ? 'poster' : 'h220',
  });
  const [loadedThumbnailAspectRatio, setLoadedThumbnailAspectRatio] = useState<number | undefined>();
  const isListMode = !waterfall && viewMode === 'list';
  const isMediaFileItem = isMediaFile(file);
  const mediaAspectRatio = getMediaAspectRatio(file) ?? loadedThumbnailAspectRatio ?? getMediaPlaceholderAspectRatio(file);
  const showFileInfo = !isMediaFileItem;
  const handleThumbnailLoad = useCallback<NonNullable<ComponentProps<typeof Image>['onLoad']>>(
    (event) => {
      thumbnailCache.rememberLoadedResource();

      const nextAspectRatio = getLoadedImageAspectRatio(
        event.nativeEvent.source.width,
        event.nativeEvent.source.height,
      );

      if (nextAspectRatio) {
        setLoadedThumbnailAspectRatio(nextAspectRatio);
      }
    },
    [thumbnailCache.rememberLoadedResource],
  );

  useEffect(() => {
    setLoadedThumbnailAspectRatio(undefined);
  }, [file.id, file.md5, thumbnailCache.displayUri]);

  return (
    <Pressable
      delayLongPress={LONG_PRESS_DELAY_MS}
      onLongPress={() => onLongSelect(file)}
      onPress={() => onPreviewFile(file)}
      style={({ pressed }) => [
        styles.fileCard,
        waterfall ? styles.waterfallFileCard : styles[`${cardSize}FileCard`],
        isMediaFileItem ? styles.mediaFileCard : null,
        isListMode ? styles.fileCardList : null,
        isListMode && cardSize === 'small' ? styles.smallListFileCardFrame : null,
        isListMode && cardSize === 'medium' ? styles.mediumListFileCardFrame : null,
        isListMode && cardSize === 'large' ? styles.largeListFileCardFrame : null,
        selected && !waterfall ? [styles.selectedCard, { borderColor: theme.hex }] : null,
        pressed ? styles.pressedCard : null,
      ]}
    >
      {selectionMode || selected ? (
        <Pressable
          onPress={() => onToggleSelection(file)}
          style={[
            styles.selectionToggle,
            selected ? styles.selectionToggleSelected : null,
            selected ? { backgroundColor: theme.hex, borderColor: theme.hex } : null,
          ]}
        >
          <Text style={styles.selectionToggleText}>{selected ? '✓' : ''}</Text>
        </Pressable>
      ) : null}
      <View style={[
        styles.fileThumb,
        isMediaFileItem ? styles.mediaFileThumb : null,
        isListMode ? styles.fileThumbList : null,
        isListMode ? styles[`${cardSize}ListFileThumb`] : null,
        isMediaFileItem && mediaAspectRatio ? { aspectRatio: mediaAspectRatio } : null,
      ]}>
        {thumbnailCache.displayUri ? (
          <Image
            onLoad={handleThumbnailLoad}
            resizeMode="cover"
            source={{ uri: thumbnailCache.displayUri }}
            style={styles.fileThumbImage}
          />
        ) : (
          <View style={[styles.fileThumbFallback, { backgroundColor: theme.selection }]}>
            <Text style={[styles.fileThumbFallbackText, { color: theme.hex }]}>{file.fileType.slice(0, 4)}</Text>
          </View>
        )}
        {isVideoFile(file) ? <Text style={styles.videoBadge}>▶</Text> : null}
      </View>
      {showFileInfo ? (
        <View style={styles.fileCardBody}>
          <Text
            numberOfLines={cardSize === 'large' ? 2 : 1}
            style={[
              styles.fileCardTitle,
              cardSize === 'large' ? styles.largeFileCardTitle : null,
            ]}
          >
            {file.name}
          </Text>
          <Text numberOfLines={cardSize === 'large' ? 2 : 1} style={styles.fileCardMeta}>
            {file.fileType}
            {file.sizeLabel ? ` · ${file.sizeLabel}` : ''}
            {file.width && file.height ? ` · ${file.width}x${file.height}` : ''}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const FolderNameDialog = ({
  error,
  mode,
  name,
  onCancel,
  onChangeName,
  onSubmit,
  submitting,
}: {
  error: string;
  mode?: 'create' | 'rename';
  name: string;
  onCancel: () => void;
  onChangeName: (name: string) => void;
  onSubmit: () => Promise<void>;
  submitting: boolean;
}) => {
  const theme = useMobileTheme();

  return (
    <MobileCenterDialog
      avoidKeyboard
      backdropStyle={styles.dialogOverlay}
      contentStyle={styles.dialog}
      onClose={onCancel}
      visible={Boolean(mode)}
    >
      <Text style={styles.dialogTitle}>{mode === 'rename' ? '重命名文件夹' : '新建文件夹'}</Text>
      <Text style={styles.dialogDescription}>
        {mode === 'rename' ? '输入新的文件夹名称。' : '在当前目录下创建一个新文件夹。'}
      </Text>
      <TextInput
        autoCapitalize="none"
        editable={!submitting}
        onChangeText={onChangeName}
        placeholder="文件夹名称"
        placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
        style={styles.dialogInput}
        value={name}
      />
      {error ? <Text style={styles.dialogError}>{error}</Text> : null}
      <View style={styles.dialogActions}>
        <Pressable disabled={submitting} onPress={onCancel} style={styles.dialogSecondaryButton}>
          <Text style={styles.dialogSecondaryText}>取消</Text>
        </Pressable>
        <Pressable
          disabled={submitting}
          onPress={() => void onSubmit()}
          style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }, submitting ? styles.disabledButton : null]}
        >
          <Text style={styles.dialogPrimaryText}>{submitting ? '处理中' : '确定'}</Text>
        </Pressable>
      </View>
    </MobileCenterDialog>
  );
};

const FolderCoverDialog = ({
  autoSubmitting,
  authCode,
  cacheEnabled,
  cacheFolder,
  currentPath,
  directory,
  error,
  folder,
  loading,
  onAutoSet,
  onClose,
  onOpenFolder,
  onOpenFolderId,
  onSubmit,
  onToggleFile,
  selectedHashes,
  serverUrl,
  submitting,
}: {
  autoSubmitting: boolean;
  authCode?: string;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  currentPath: string;
  directory: FolderDirectory;
  error: string;
  folder?: FolderSummary;
  loading: boolean;
  onAutoSet: () => Promise<void>;
  onClose: () => void;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderId: (folderId: number) => void;
  onSubmit: () => Promise<void>;
  onToggleFile: (file: FolderFileSummary) => void;
  selectedHashes: string[];
  serverUrl: string;
  submitting: boolean;
}) => {
  const theme = useMobileTheme();

  if (!folder) {
    return null;
  }

  const coverFiles = getCoverCandidateFiles(directory);
  const selectedHashSet = new Set(selectedHashes);
  const disabled = loading || autoSubmitting || submitting;

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.dialogBottomOverlay}
      contentStyle={styles.dialogLarge}
      onClose={onClose}
      visible={Boolean(folder)}
    >
          <Text style={styles.dialogTitle}>设置文件夹封面</Text>
          <Text style={styles.dialogDescription}>
            {folder.name} · 从文件夹内选择最多 {MAX_FOLDER_COVER_COUNT} 张图片作为封面拼贴。
          </Text>
          <PathPillRow
            disabled={disabled}
            fallbackLabel={currentPath}
            items={createDirectoryPathItems(directory)}
            onOpenFolderId={onOpenFolderId}
          />
          <View style={styles.dialogToolbarRow}>
            <Pressable
              disabled={disabled}
              onPress={() => void onAutoSet()}
              style={[styles.dialogSecondaryButton, disabled ? styles.disabledButton : null]}
            >
              <Text style={styles.dialogSecondaryText}>{autoSubmitting ? '自动设置中' : '自动设置'}</Text>
            </Pressable>
            <Text style={styles.dialogMetaText}>已选择 {selectedHashes.length}/{MAX_FOLDER_COVER_COUNT}</Text>
          </View>

          {loading ? (
            <View style={styles.dialogLoadingLine}>
              <ActivityIndicator color={theme.hex} />
              <Text style={styles.dialogLoadingText}>正在加载文件夹图片</Text>
            </View>
          ) : null}

          {!loading && coverFiles.length + directory.folders.length === 0 ? (
            <Text style={styles.dialogEmptyText}>当前文件夹没有可设置为封面的图片。</Text>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.coverPickerGrid}
            showsVerticalScrollIndicator={false}
            style={styles.dialogScroll}
          >
            {directory.folders.map((childFolder) => (
              <Pressable
                disabled={disabled}
                key={childFolder.id || childFolder.path}
                onPress={() => onOpenFolder(childFolder)}
                style={[styles.coverPickerCard, styles.coverPickerFolderCard, disabled ? styles.disabledButton : null]}
              >
                <View style={[styles.coverPickerFolderIcon, { backgroundColor: theme.selection }]}>
                  <Text style={[styles.coverPickerFolderIconText, { color: theme.hex }]}>▤</Text>
                </View>
                <Text numberOfLines={1} style={styles.coverPickerName}>{childFolder.name}</Text>
              </Pressable>
            ))}
            {coverFiles.map((file) => {
              const selected = selectedHashSet.has(file.md5);
              const thumbnailUrl = createThumbnailUrl({
                authCode,
                baseUrl: serverUrl,
                md5: file.md5,
                type: 'h220',
              });

              return (
                <Pressable
                  disabled={disabled}
                  key={`${file.id}-${file.md5}`}
                  onPress={() => onToggleFile(file)}
                  style={[
                    styles.coverPickerCard,
                    selected ? [styles.coverPickerCardSelected, { borderColor: theme.hex }] : null,
                    disabled ? styles.disabledButton : null,
                  ]}
                >
                  <View style={styles.coverPickerThumb}>
                    {thumbnailUrl ? (
                      <CachedMobileImage
                        cacheOnMiss
                        cacheEnabled={cacheEnabled}
                        cacheFolder={cacheFolder}
                        fileId={file.id}
                        kind="file-thumbnail"
                        md5={file.md5}
                        resizeMode="cover"
                        sourceUrl={thumbnailUrl}
                        style={styles.coverPickerImage}
                        variant="h220"
                      />
                    ) : (
                      <Text style={[styles.coverPickerFolderIconText, { color: theme.hex }]}>IMG</Text>
                    )}
                    {selected ? <Text style={[styles.coverPickerCheck, { backgroundColor: theme.hex }]}>✓</Text> : null}
                  </View>
                  <Text numberOfLines={1} style={styles.coverPickerName}>{file.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? <Text style={styles.dialogError}>{error}</Text> : null}

          <View style={styles.dialogActions}>
            <Pressable disabled={disabled} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable
              disabled={disabled || selectedHashes.length === 0}
              onPress={() => void onSubmit()}
              style={[
                styles.dialogPrimaryButton,
                { backgroundColor: theme.hex },
                disabled || selectedHashes.length === 0 ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.dialogPrimaryText}>{submitting ? '保存中' : '保存封面'}</Text>
            </Pressable>
          </View>
    </MobileBottomSheetModal>
  );
};

const BatchMoveDialog = ({
  currentDirectory,
  error,
  loading,
  onChangeOverwriteMode,
  onClose,
  onOpenFolder,
  onOpenFolderId,
  onOpenRoot,
  onSelectTarget,
  onSubmit,
  open,
  overwriteMode,
  selectedSummary,
  submitting,
  target,
}: {
  currentDirectory: FolderDirectory;
  error: string;
  loading: boolean;
  onChangeOverwriteMode: (mode: FileMoveOverwriteMode) => void;
  onClose: () => void;
  onOpenFolder: (folder: FolderSummary) => void;
  onOpenFolderId: (folderId: number) => void;
  onOpenRoot: () => void;
  onSelectTarget: (folder: FolderSummary) => void;
  onSubmit: () => Promise<void>;
  open: boolean;
  overwriteMode: FileMoveOverwriteMode;
  selectedSummary: string;
  submitting: boolean;
  target?: FolderSummary;
}) => {
  const theme = useMobileTheme();
  const disabled = loading || submitting;

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.dialogBottomOverlay}
      contentStyle={styles.dialogLarge}
      onClose={onClose}
      visible={open}
    >
          <Text style={styles.dialogTitle}>移动所选内容</Text>
          <Text style={styles.dialogDescription}>{selectedSummary} · 选择目标文件夹后执行移动。</Text>
          <View style={styles.dialogToolbarRow}>
            <Pressable disabled={disabled} onPress={onOpenRoot} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>根目录</Text>
            </Pressable>
            <PathPillRow
              disabled={disabled}
              fallbackLabel={currentDirectory.path || '根目录'}
              items={createDirectoryPathItems(currentDirectory)}
              onOpenFolderId={onOpenFolderId}
            />
          </View>

          <View style={styles.moveTargetPanel}>
            <Text style={styles.moveTargetLabel}>目标文件夹</Text>
            <Text numberOfLines={1} style={styles.moveTargetValue}>{target?.path || target?.name || '未选择'}</Text>
          </View>

          <View style={styles.overwriteGroup}>
            {MOVE_OVERWRITE_OPTIONS.map((option) => (
              <Pressable
                disabled={submitting}
                key={option.value}
                onPress={() => onChangeOverwriteMode(option.value)}
                style={[
                  styles.overwriteButton,
                  overwriteMode === option.value ? styles.overwriteButtonActive : null,
                  overwriteMode === option.value ? { backgroundColor: theme.hex, borderColor: theme.hex } : null,
                ]}
              >
                <Text style={[styles.overwriteButtonText, overwriteMode === option.value ? styles.overwriteButtonTextActive : null]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <View style={styles.dialogLoadingLine}>
              <ActivityIndicator color={theme.hex} />
              <Text style={styles.dialogLoadingText}>正在加载目标文件夹</Text>
            </View>
          ) : null}

          {!loading && currentDirectory.folders.length === 0 ? (
            <Text style={styles.dialogEmptyText}>当前层级没有子文件夹。</Text>
          ) : null}

          <ScrollView
            contentContainerStyle={styles.moveFolderList}
            showsVerticalScrollIndicator={false}
            style={styles.dialogScroll}
          >
            {currentDirectory.folders.map((folder) => (
              <View key={folder.id || folder.path} style={styles.moveFolderRow}>
                <Pressable disabled={disabled} onPress={() => onOpenFolder(folder)} style={styles.moveFolderMain}>
                  <Text style={[styles.moveFolderIcon, { color: theme.hex }]}>▤</Text>
                  <View style={styles.moveFolderCopy}>
                    <Text numberOfLines={1} style={styles.moveFolderName}>{folder.name}</Text>
                    <Text numberOfLines={1} style={styles.moveFolderMeta}>{folder.path || `${folder.childCount} 个子文件夹`}</Text>
                  </View>
                </Pressable>
                <Pressable
                  disabled={disabled}
                  onPress={() => onSelectTarget(folder)}
                  style={[styles.moveTargetButton, { backgroundColor: theme.selection }]}
                >
                  <Text style={[styles.moveTargetButtonText, { color: theme.hex }]}>设为目标</Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>

          {error ? <Text style={styles.dialogError}>{error}</Text> : null}

          <View style={styles.dialogActions}>
            <Pressable disabled={submitting} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable
              disabled={disabled || !target}
              onPress={() => void onSubmit()}
              style={[
                styles.dialogPrimaryButton,
                { backgroundColor: theme.hex },
                disabled || !target ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.dialogPrimaryText}>{submitting ? '移动中' : '确认移动'}</Text>
            </Pressable>
          </View>
    </MobileBottomSheetModal>
  );
};

const PathPillRow = ({
  compact = false,
  disabled,
  fallbackLabel,
  items,
  onOpenFolderId,
  onOpenRoot,
}: {
  compact?: boolean;
  disabled: boolean;
  fallbackLabel: string;
  items: PathItem[];
  onOpenFolderId: (folderId: number) => void;
  onOpenRoot?: () => void;
}) => {
  const theme = useMobileTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const displayItems = items.length > 0 ? items : [{ name: fallbackLabel }];
  const scrollToCurrentPath = useCallback((): void => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, []);

  return (
    <ScrollView
      horizontal
      onContentSizeChange={scrollToCurrentPath}
      onLayout={scrollToCurrentPath}
      ref={scrollRef}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={[styles.pathPillScroll, compact ? styles.pathPillScrollCompact : null]}
    >
      <View style={[styles.pathPillRow, compact ? styles.pathPillRowCompact : null]}>
        {displayItems.map((item, index) => {
          const folderId = item.id;
          const clickable = item.isRoot ? Boolean(onOpenRoot) : folderId !== undefined && folderId > 0;

          return (
            <Pressable
              disabled={disabled || !clickable}
              key={`${item.name}-${index}`}
              onPress={() => {
                if (item.isRoot) {
                  onOpenRoot?.();
                  return;
                }

                if (folderId !== undefined && folderId > 0) {
                  onOpenFolderId(folderId);
                }
              }}
              style={[
                styles.pathPill,
                compact ? styles.pathPillCompact : null,
                clickable ? styles.pathPillClickable : null,
                clickable ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.pathPillText,
                  compact ? styles.pathPillTextCompact : null,
                  clickable ? { color: theme.hex } : null,
                ]}
              >
                {index > 0 ? '/ ' : ''}{item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

const EmptyLine = ({ text }: { text: string }) => {
  return <Text style={styles.emptyText}>{text}</Text>;
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'stretch',
    gap: 10,
    paddingBottom: 84,
    paddingHorizontal: 14,
    paddingTop: 14,
    width: '100%',
  },
  configHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  configHeaderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  configHeaderIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  configCloseButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  configLabel: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  configIconGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  configIconOption: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 10,
  },
  configIconOptionCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  configIconOptionMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 9,
    fontWeight: '800',
  },
  configIconOptionTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 12,
    fontWeight: '900',
  },
  configControlPanel: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 10,
  },
  configOptionPill: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexBasis: '30%',
    flexGrow: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: 31,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  configOptionText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  configOverlay: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.sheetOverlay,
    flex: 1,
    justifyContent: 'flex-end',
  },
  configPanelTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  configPanelTitleMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  configQuickButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 50,
    padding: 10,
  },
  configQuickCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  configQuickGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  configQuickIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    borderRadius: 13,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  configQuickMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  configQuickTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 13,
    fontWeight: '900',
  },
  configSheet: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: 'rgba(255, 255, 255, 0.76)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    gap: 9,
    padding: 14,
    paddingBottom: 18,
  },
  configSheetHandle: {
    alignSelf: 'center',
    backgroundColor: MOBILE_SAGE_SLATE.ghost,
    borderRadius: 999,
    height: 4,
    width: 42,
  },
  configSummaryText: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '900',
  },
  configSortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  configTinyMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '900',
  },
  configTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 16,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.44,
  },
  directoryRefreshOverlay: {
    elevation: 12,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 8,
    zIndex: 12,
  },
  emptyText: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 10,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
    padding: 12,
  },
  dialog: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    width: '100%',
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
  },
  dialogDescription: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  dialogError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '800',
  },
  dialogInput: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 13,
  },
  dialogOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  dialogBottomOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    justifyContent: 'flex-end',
    paddingHorizontal: 18,
  },
  dialogPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 14,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dialogPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  dialogSecondaryButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  dialogSecondaryText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  dialogTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 18,
    fontWeight: '900',
  },
  dialogEmptyText: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 13,
    fontWeight: '800',
    padding: 14,
    textAlign: 'center',
  },
  dialogLarge: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    maxHeight: '86%',
    padding: 16,
    width: '100%',
  },
  dialogLoadingLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dialogLoadingText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  dialogMetaText: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'right',
  },
  dialogScroll: {
    maxHeight: 330,
  },
  dialogToolbarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fileCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexBasis: '31%',
    flexGrow: 1,
    gap: 7,
    maxWidth: '32%',
    padding: 7,
    position: 'relative',
  },
  fileCardBody: {
    gap: 2,
    minWidth: 0,
  },
  fileCardList: {
    alignItems: 'center',
    flexBasis: '100%',
    flexDirection: 'row',
    maxWidth: '100%',
  },
  waterfallFileCard: {
    flexBasis: 'auto',
    flexGrow: 0,
    maxWidth: '100%',
    width: '100%',
  },
  mediaFileCard: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderWidth: 0,
    gap: 0,
    padding: 0,
  },
  mediaMasonryItem: {
    paddingBottom: 6,
    paddingHorizontal: 3,
  },
  largeFileCard: {
    borderRadius: 16,
    flexBasis: '100%',
    gap: 9,
    maxWidth: '100%',
    padding: 9,
  },
  largeFileCardTitle: {
    fontSize: 13,
    lineHeight: 17,
  },
  largeListFileCardFrame: {
    gap: 12,
    minHeight: 92,
    padding: 10,
  },
  mediumFileCard: {
    borderRadius: 14,
    flexBasis: '48%',
    gap: 8,
    maxWidth: '49%',
    padding: 8,
  },
  mediumListFileCardFrame: {
    gap: 10,
    minHeight: 76,
    padding: 8,
  },
  smallFileCard: {
    borderRadius: 13,
    flexBasis: '31%',
    gap: 6,
    maxWidth: '32%',
    padding: 6,
  },
  smallListFileCardFrame: {
    gap: 8,
    minHeight: 60,
    padding: 7,
  },
  fileCardMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '700',
  },
  fileCardTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 12,
    fontWeight: '900',
  },
  fileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  fileGroup: {
    gap: 8,
  },
  fileGroupTitle: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  fileList: {
    gap: 8,
  },
  mediaWaterfall: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  mediaWaterfallColumn: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  fileThumb: {
    aspectRatio: 1,
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  mediaFileThumb: {
    width: '100%',
  },
  fileThumbFallback: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
    flex: 1,
    justifyContent: 'center',
  },
  fileThumbFallbackText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  fileThumbImage: {
    height: '100%',
    width: '100%',
  },
  fileThumbList: {
    flex: 0,
    height: 58,
    width: 74,
  },
  folderFab: {
    alignItems: 'center',
    bottom: 16,
    gap: 8,
    position: 'absolute',
    right: 14,
    zIndex: 12,
  },
  folderFabMain: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  folderFabMainText: {
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 34,
  },
  folderFabMenu: {
    alignItems: 'center',
    gap: 8,
  },
  folderFabMenuButton: {
    ...MOBILE_SAGE_SHADOWS.floating,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  largeListFileThumb: {
    height: 74,
    width: 94,
  },
  mediumListFileThumb: {
    height: 58,
    width: 74,
  },
  smallListFileThumb: {
    height: 46,
    width: 58,
  },
  coverPickerCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexBasis: '31%',
    gap: 7,
    maxWidth: '32%',
    padding: 7,
    position: 'relative',
  },
  coverPickerCardSelected: {
    borderColor: '#0f766e',
    borderWidth: 2,
  },
  coverPickerCheck: {
    backgroundColor: '#0f766e',
    borderRadius: 999,
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  coverPickerFolderCard: {
    justifyContent: 'space-between',
  },
  coverPickerFolderIcon: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 12,
    justifyContent: 'center',
    width: '100%',
  },
  coverPickerFolderIconText: {
    color: '#0f766e',
    fontSize: 17,
    fontWeight: '900',
  },
  coverPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
  },
  coverPickerImage: {
    height: '100%',
    width: '100%',
  },
  coverPickerName: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  coverPickerThumb: {
    aspectRatio: 1,
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 12,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  folderCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    gap: 7,
    padding: 7,
    position: 'relative',
  },
  folderCardPlaceholder: {
    opacity: 0,
  },
  folderActionMenuButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderColor: 'transparent',
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 8,
    width: '100%',
  },
  folderActionMenuText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  folderActionSheet: {
    ...MOBILE_SAGE_SHADOWS.floating,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(226, 232, 240, 0.96)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    marginHorizontal: 20,
    padding: 10,
    width: '86%',
  },
  folderActionSheetButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  folderActionSheetButtonText: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 14,
    fontWeight: '900',
  },
  folderActionSheetClose: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  folderActionSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingLeft: 4,
  },
  folderActionSheetIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  folderActionSheetOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    flex: 1,
    justifyContent: 'center',
  },
  folderActionSheetTitle: {
    color: MOBILE_SAGE_SLATE.title,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
  },
  folderActionsMenu: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 6,
    position: 'absolute',
    right: 0,
    shadowColor: '#0f172a',
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    top: 30,
    width: 132,
    zIndex: 8,
  },
  folderActionsToggle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    marginLeft: 'auto',
    width: 24,
  },
  folderActionsToggleActive: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
  },
  folderActionsToggleText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
  },
  folderCardBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    position: 'relative',
  },
  folderCardPath: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '700',
  },
  folderCardTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 12,
    fontWeight: '900',
  },
  largeFolderCardPath: {
    fontSize: 11,
    lineHeight: 16,
  },
  largeFolderCardTitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  smallFolderCardTitle: {
    fontSize: 11,
  },
  folderCount: {
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
    borderRadius: 999,
    bottom: 6,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: 'absolute',
    right: 6,
    zIndex: 2,
  },
  folderCover: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 104,
    overflow: 'hidden',
    position: 'relative',
  },
  folderCoverIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
    borderRadius: 16,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48,
    zIndex: 2,
  },
  largeFolderCoverIcon: {
    borderRadius: 18,
    height: 58,
    width: 58,
  },
  largeListFolderCoverIcon: {
    borderRadius: 13,
    height: 40,
    width: 40,
  },
  listFolderCoverIcon: {
    borderRadius: 11,
    height: 34,
    width: 34,
  },
  smallFolderCoverIcon: {
    borderRadius: 14,
    height: 40,
    width: 40,
  },
  smallListFolderCoverIcon: {
    borderRadius: 10,
    height: 28,
    width: 28,
  },
  folderCoverImage: {
    height: '50%',
    width: '50%',
  },
  folderCoverImageDouble: {
    height: '100%',
    width: '50%',
  },
  folderCoverImageFull: {
    height: '100%',
    width: '100%',
  },
  folderCoverImageTriplePrimary: {
    height: '50%',
    width: '100%',
  },
  folderCoverImages: {
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  folderGrid: {
    gap: FOLDER_GRID_GAP,
  },
  folderGridMeasure: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8,
    width: '100%',
  },
  folderHeadingSection: {
    marginBottom: 4,
  },
  folderGridRow: {
    columnGap: FOLDER_GRID_GAP,
    flexDirection: 'row',
    width: '100%',
  },
  folderListGrid: {
    justifyContent: 'flex-start',
  },
  folderGridTrack: {
    justifyContent: 'flex-start',
  },
  folderMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    width: '100%',
  },
  folderMetaInline: {
    flex: 1,
    minWidth: 0,
    width: undefined,
  },
  folderMetaText: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  folderStatusLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  folderStatusMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    minWidth: 0,
  },
  hint: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pathPill: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 150,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  pathPillCompact: {
    maxWidth: 92,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pathPillClickable: {
    backgroundColor: '#ecfdf5',
    borderColor: '#99f6e4',
  },
  pathPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pathPillRowCompact: {
    gap: 3,
  },
  pathPillScroll: {
    flex: 1,
  },
  pathPillScrollCompact: {
    maxHeight: 24,
  },
  pathPillText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  pathPillTextCompact: {
    fontSize: 10,
    lineHeight: 13,
  },
  largeFolderCard: {
    borderRadius: 17,
    flexBasis: '100%',
    gap: 9,
    maxWidth: '100%',
    padding: 9,
  },
  largeFolderCover: {
    borderRadius: 15,
    minHeight: 164,
  },
  listFolderCard: {
    alignItems: 'flex-start',
    flexBasis: '100%',
    flexDirection: 'row',
    gap: 8,
    maxWidth: '100%',
  },
  listFolderCover: {
    flex: 0,
    height: 64,
    minHeight: 64,
    width: 82,
  },
  largeListFolderCardFrame: {
    gap: 12,
    minHeight: 112,
    padding: 12,
  },
  largeListFolderCover: {
    borderRadius: 15,
    height: 92,
    minHeight: 92,
    width: 118,
  },
  mediumListFolderCardFrame: {
    gap: 10,
    minHeight: 88,
    padding: 10,
  },
  mediumListFolderCover: {
    borderRadius: 13,
    height: 70,
    minHeight: 70,
    width: 90,
  },
  smallListFolderCardFrame: {
    gap: 8,
    minHeight: 70,
    padding: 8,
  },
  smallListFolderCover: {
    borderRadius: 12,
    height: 54,
    minHeight: 54,
    width: 66,
  },
  mediumFolderCard: {
    borderRadius: 15,
    flexBasis: '48%',
    gap: 8,
    maxWidth: '49%',
    padding: 8,
  },
  mediumFolderCover: {
    borderRadius: 13,
    minHeight: 108,
  },
  message: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderRadius: 14,
    borderWidth: 1,
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
    padding: 12,
  },
  moveFolderCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  moveFolderIcon: {
    color: '#0f766e',
    fontSize: 19,
    fontWeight: '900',
  },
  moveFolderList: {
    gap: 8,
    paddingBottom: 4,
  },
  moveFolderMain: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 9,
    minWidth: 0,
  },
  moveFolderMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  moveFolderName: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 13,
    fontWeight: '900',
  },
  moveFolderRow: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 10,
  },
  moveTargetButton: {
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  moveTargetButtonText: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '900',
  },
  moveTargetLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  moveTargetPanel: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    gap: 2,
    padding: 10,
  },
  moveTargetValue: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 13,
    fontWeight: '900',
  },
  overwriteButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  overwriteButtonActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  overwriteButtonText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 11,
    fontWeight: '900',
  },
  overwriteButtonTextActive: {
    color: '#fff',
  },
  overwriteGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  pressedCard: {
    transform: [{ translateY: 1 }],
  },
  previewAlbumClose: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  previewAlbumDialog: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    maxHeight: '78%',
    padding: 14,
    width: '100%',
  },
  previewAlbumHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  previewAlbumList: {
    maxHeight: 360,
  },
  previewAlbumRow: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
    padding: 10,
  },
  previewAlbumRowActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#99f6e4',
  },
  previewAlbumRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewAlbumRowIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  previewAlbumRowIconActive: {
    backgroundColor: '#16b741',
  },
  previewAlbumRowMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  previewAlbumRowTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 13,
    fontWeight: '900',
  },
  previewBackButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: 'rgba(226, 232, 240, 0.86)',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
    ...MOBILE_SAGE_SHADOWS.panel,
  },
  previewCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.28)',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  previewChromeLayer: {
    width: '100%',
  },
  previewFallback: {
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'center',
    padding: 28,
  },
  previewFallbackText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  previewFallbackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  previewHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 8,
    zIndex: 8,
  },
  previewHeaderCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewImageFooter: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    width: '100%',
  },
  previewImageHint: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  previewImageHintMeta: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '800',
  },
  previewImageHintTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  previewSourceBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewSourceBadgeText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '900',
  },
  previewImageLayer: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  previewImageLayerFallback: {
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    padding: 28,
  },
  previewImageLayerHidden: {
    opacity: 0,
  },
  previewImageLayerVisible: {
    opacity: 1,
  },
  previewProgressiveImage: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  previewUpgradeBadge: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: 22,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
  },
  previewUpgradeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
  },
  previewWarmupImage: {
    height: 1,
    width: 1,
  },
  previewWarmupLayer: {
    height: 1,
    left: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    width: 1,
  },
  previewVideo: {
    flex: 1,
    width: '100%',
  },
  previewVideoPoster: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020617',
  },
  previewVideoPosterImage: {
    height: '100%',
    width: '100%',
  },
  previewVideoShell: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  previewInfoFloatingLayer: {
    bottom: 90,
    left: 0,
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0,
    zIndex: 5,
  },
  previewMeta: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  previewNotice: {
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    position: 'absolute',
    top: 64,
    zIndex: 6,
  },
  previewNoticeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  previewOpenButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 999,
    minHeight: 38,
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 18,
  },
  previewOpenButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  previewOverlay: {
    backgroundColor: '#020617',
    flex: 1,
  },
  previewOriginalAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderColor: 'rgba(226, 232, 240, 0.86)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    height: 36,
    justifyContent: 'center',
    maxWidth: 122,
    minWidth: 0,
    paddingHorizontal: 10,
    ...MOBILE_SAGE_SHADOWS.panel,
  },
  previewOriginalActionText: {
    color: MOBILE_SAGE_SLATE.title,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  previewStepButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  previewStepMeta: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  previewStepText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 30,
  },
  previewStepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    padding: 18,
  },
  previewToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'flex-end',
    paddingRight: 2,
  },
  previewToolbarScroll: {
    flex: 1,
  },
  previewToolButtonDisabled: {
    opacity: 0.42,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  screen: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
    gap: 8,
  },
  section: {
    gap: 8,
    width: '100%',
  },
  sectionCount: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionHeadingRight: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  sectionTitle: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  segmented: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    padding: 2,
  },
  segmentedItem: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    minHeight: 26,
    minWidth: 32,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  segmentedItemActive: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.controlActive,
  },
  segmentedText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '900',
  },
  segmentedTextActive: {
    color: MOBILE_SAGE_SLATE.strong,
  },
  selectedCard: {
    borderColor: '#0f766e',
    borderWidth: 2,
  },
  selectionActionButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderRadius: 999,
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  selectionActionText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 5,
  },
  selectionBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#99f6e4',
    borderRadius: 13,
    borderWidth: 1,
    gap: 8,
    padding: 8,
  },
  selectionDangerButton: {
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 999,
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  selectionDangerText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '900',
  },
  selectionIconButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  selectionMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  selectionSummary: {
    gap: 1,
  },
  selectionTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 12,
    fontWeight: '900',
  },
  selectionToggle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderColor: '#cbd5e1',
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    left: 7,
    position: 'absolute',
    top: 7,
    width: 24,
    zIndex: 6,
  },
  selectionToggleSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  selectionToggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
  },
  smallFolderCard: {
    borderRadius: 13,
    flexBasis: '31%',
    gap: 6,
    maxWidth: '32%',
    padding: 6,
  },
  smallFolderCover: {
    borderRadius: 11,
    minHeight: 72,
  },
  smallFolderCount: {
    bottom: 5,
    fontSize: 9,
    paddingHorizontal: 5,
    right: 5,
  },
  tag: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  themeTag: {
    backgroundColor: '#ecfdf5',
    color: '#0f766e',
  },
  videoBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
    borderRadius: 999,
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    position: 'absolute',
    right: 6,
    top: 6,
  },
});
