import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList } from "@shopify/flash-list";
import type { FlashListProps, ListRenderItemInfo } from "@shopify/flash-list";
import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import type { RouteProp, Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type {
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import type {
  LayoutChangeEvent,
  PanResponderGestureState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  AuthTokens,
  FileAlbumSummary,
  FileDetail,
  FileMoveOverwriteMode,
  FolderDirectory,
  FolderFileSummary,
  FolderSummary,
  VideoTranscodeResult,
} from "@kwphoto/core";
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
} from "@kwphoto/core";

import type {
  MobileFolderCardSize,
  MobileExternalVideoPlayer,
  MobileFolderSortDirection,
  MobileFolderSortField,
  MobileFolderViewMode,
  MobilePreferences,
} from "./mobile-storage";
import {
  mergeMobilePreferences,
  normalizeMobileServerAddressList,
  readMobilePreferences,
} from "./mobile-storage";
import {
  cacheMobileMediaResourceFromUrl,
  createMobileLocalCacheFolderRef,
  createMobileLocalCacheFallbackScopes,
  createMobileLocalCacheScope,
  readCachedMobileDirectory,
  readCachedMobileMediaUri,
  writeCachedMobileDirectory,
} from "./mobile-local-cache";
import type {
  MobileLocalCacheFolderRef,
} from "./mobile-local-cache";
import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from "./mobile-theme";
import { MobileLoadingState } from "./MobileLoadingState";
import {
  DEFAULT_CARD_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
  DEFAULT_VIEW_MODE,
  DIRECTORY_FLASH_LIST_DRAW_DISTANCE,
  FOLDER_GESTURE_RESPONSE_DISTANCE,
  FOLDER_GRID_COLUMN_COUNT,
  FORBIDDEN_FOLDER_NAME_PATTERN,
  MAX_FOLDER_COVER_COUNT,
  PREVIEW_NEIGHBOR_PRELOAD_RADIUS,
  PREVIEW_NOTICE_DURATION_MS,
} from "./folders/folderConstants";
import type {
  DirectoryListItem,
  DirectorySelectionKey,
  PreviewImageGalleryItem,
  PreviewImageSource,
  PreviewMode,
  SelectionItem,
} from "./folders/folderTypes";
import {
  createCurrentDirectoryPathItems,
  createDirectoryListItems,
  createEmptyDirectory,
  createFileSelectionKey,
  createFolderCardLayoutStyle,
  createFolderGridLayoutStyle,
  createFolderSelectionKey,
  createInfusePlaybackUrl,
  createFolderStackRoutes,
  createMobileShareUrl,
  createPreviewMediaKey,
  formatSelectionSummary,
  getBreadcrumbItemId,
  getDirectorySelectionItems,
  getMediaWaterfallColumnCount,
  getPreviewActionLabel,
  getPreviewCacheLabel,
  getPreviewGestureAction,
  getPreviewImageSourceLabel,
  getPreviewWarmThumbnailItems,
  getVideoPlaybackUrl,
  INFUSE_URL_SCHEME,
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
} from "./folders/folderUtils";
import {
  PreviewDetailPanel,
  PreviewMorePanel,
  PreviewSettingsPanel,
  PreviewToolbarButton,
} from "./folders/panels/PreviewPanels";
import {
  FileTile,
  FolderCard,
} from "./folders/components/FolderDirectoryItems";
import {
  FolderConfigSheet,
  FolderFloatingMenu,
  SectionHeading,
  SelectionBar,
} from "./folders/components/FolderControls";
import {
  BatchMoveDialog,
  EmptyLine,
  FolderCoverDialog,
  FolderNameDialog,
  PathPillRow,
} from "./folders/components/FolderDialogs";
import {
  InlineVideoPreview,
  NativeVideoControlsOverlay,
  PreviewAlbumDialog,
  PreviewThumbnailWarmup,
  ProgressiveImagePreview,
} from "./folders/components/PreviewMedia";
import type { PreviewVideoSourceLabel } from "./folders/components/PreviewMedia";
import { styles } from "./folders/folderStyles";
import {
  MobileFullscreenModal,
} from "./components/MobileDialog";
import { MobileFadingOverlay } from "./components/MobileFadingOverlay";
import ImageView from "./MobileImageView";
import { useCachedMobileMediaUri } from "./useCachedMobileMediaUri";
import { useMobileApiOptions } from "./useMobileApiOptions";

export interface MobileFoldersSession {
  serverUrl: string;
  tokens: AuthTokens;
  user: {
    id?: number | string;
    username: string;
  };
}

interface MobileFoldersHomeProps {
  externalVideoPlayer: MobileExternalVideoPlayer;
  onChangeTokens: (tokens: AuthTokens) => void;
  onLogout: () => void;
  rootRequestVersion?: number;
  session: MobileFoldersSession;
}

interface MobileCacheScopeOptions {
  serverAliases: string[];
  serverUrl: string;
  userId?: number | string;
  username?: string;
}

interface PreviewOriginalTransition {
  fileKey: string;
  token: number;
  uri: string;
}

/**
 * Collects saved server addresses so old address-scoped cache records stay readable.
 */
const getMobileLegacyCacheServerAliases = (
  preferences: MobilePreferences,
  activeServerUrl: string,
): string[] => {
  return normalizeMobileServerAddressList([
    preferences.primaryServerUrl,
    preferences.backupServerUrl,
    preferences.serverUrl,
    activeServerUrl,
    ...(preferences.serverAddressHistory ?? []),
  ]);
};

/**
 * Builds the cache scope input shared by folder restore and mounted directory screens.
 */
const createMobileCacheScopeOptions = (
  session: MobileFoldersSession,
  serverAliases: string[],
): MobileCacheScopeOptions => ({
  serverAliases,
  serverUrl: session.serverUrl,
  userId: session.user.id,
  username: session.user.username,
});

type MobileFolderStackParamList = {
  directory: {
    folderId?: number;
  };
};

type MobileFolderDirectoryRoute = RouteProp<
  MobileFolderStackParamList,
  "directory"
>;
type MobileFolderDirectoryNavigation = NativeStackNavigationProp<
  MobileFolderStackParamList,
  "directory"
>;

interface MobileFolderDirectoryScreenProps extends MobileFoldersHomeProps {
  initialDirectory?: FolderDirectory;
  navigation: MobileFolderDirectoryNavigation;
  route: MobileFolderDirectoryRoute;
}

type PreviewBusyAction = "album" | "delete" | "favorite" | "refresh" | "share";

interface PreviewDisplayedImageUriState {
  fileKey: string;
  uri: string;
}

const FOLDER_CONTENT_BOTTOM_TABBAR_PADDING = 132;
const FOLDER_CONTENT_BOTTOM_TABBAR_SAFE_AREA_OFFSET = 98;
const FOLDER_RESTORE_OVERLAY_DELAY_MS = 180;
const FOLDER_RESTORE_OVERLAY_FADE_DURATION_MS = 220;
const INFUSE_APP_ICON_SOURCE = require("../assets/infuse-icon.jpg");
const VIDEO_TRANSCODE_FAILED_STATUS = -1;
const VIDEO_TRANSCODE_IGNORED_STATUS = 12;
const VIDEO_TRANSCODE_READY_STATUS = 2;
const VIDEO_TRANSCODE_WAIT_DELAYS_MS = [
  800,
  1200,
  1800,
  2600,
  3600,
] as const;

const FolderStack = createNativeStackNavigator<MobileFolderStackParamList>();
const FOLDER_NAVIGATION_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: MOBILE_SAGE_NEUTRALS.pageBg,
    border: "transparent",
    card: MOBILE_SAGE_NEUTRALS.pageBg,
  },
};
const FOLDER_STACK_SCREEN_OPTIONS: NativeStackNavigationOptions = {
  animationMatchesGesture: true,
  animation: "slide_from_right",
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
 * Renders the configured external player's app badge for the preview toolbar.
 */
const renderExternalVideoPlayerIcon = (
  player: MobileExternalVideoPlayer,
): ReactElement | undefined => {
  if (player === "infuse") {
    return <InfuseToolbarIcon />;
  }

  return undefined;
};

/**
 * Displays the bundled Infuse app icon in the preview toolbar.
 */
const InfuseToolbarIcon = (): ReactElement => (
  <Image
    accessibilityIgnoresInvertColors
    source={INFUSE_APP_ICON_SOURCE}
    style={styles.previewExternalPlayerInfuseIcon}
  />
);

/**
 * Waits between transcode readiness polls without blocking React state updates.
 */
const waitForVideoTranscodePoll = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

/**
 * Converts backend transcode task state into the user-facing preview failure reason.
 */
const getVideoTranscodeUnavailableMessage = (
  result?: VideoTranscodeResult,
): string => {
  if (result?.transcodeStatus === VIDEO_TRANSCODE_FAILED_STATUS) {
    return "视频转码失败，请稍后重试";
  }

  if (result?.transcodeStatus === VIDEO_TRANSCODE_IGNORED_STATUS) {
    return "当前视频暂不支持内置转码播放";
  }

  return "视频仍在转码中，请稍后再试";
};

/**
 * Hosts the native folder stack while the outer bottom tabs keep local state switching.
 */
export const MobileFoldersHome = ({
  externalVideoPlayer,
  onChangeTokens,
  onLogout,
  rootRequestVersion = 0,
  session,
}: MobileFoldersHomeProps) => {
  const theme = useMobileTheme();
  const [initialDirectory, setInitialDirectory] = useState<FolderDirectory>();
  const [initialFolderId, setInitialFolderId] = useState<number>();
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [restoreOverlayAllowed, setRestoreOverlayAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores the last visited folder and its cached directory before the stack first paints.
     */
    const hydrateInitialFolder = async (): Promise<void> => {
      const preferences = await readMobilePreferences();
      const nextInitialFolderId =
        typeof preferences.currentFolderId === "number"
          ? preferences.currentFolderId
          : undefined;
      const cacheScopeOptions = createMobileCacheScopeOptions(
        session,
        getMobileLegacyCacheServerAliases(preferences, session.serverUrl),
      );
      const cacheScope = createMobileLocalCacheScope(cacheScopeOptions);
      const cacheFallbackScopes =
        createMobileLocalCacheFallbackScopes(cacheScopeOptions);
      const cachedDirectory =
        preferences.localCacheEnabled ?? true
          ? await readCachedMobileDirectory({
              fallbackScopes: cacheFallbackScopes,
              folderId: nextInitialFolderId,
              scope: cacheScope,
            })
          : undefined;

      if (!mounted) {
        return;
      }

      setInitialDirectory(cachedDirectory);
      setInitialFolderId(nextInitialFolderId);

      setPreferencesHydrated(true);
    };

    void hydrateInitialFolder();

    return () => {
      mounted = false;
    };
  }, [session.serverUrl]);

  useEffect(() => {
    if (preferencesHydrated) {
      setRestoreOverlayAllowed(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setRestoreOverlayAllowed(true);
    }, FOLDER_RESTORE_OVERLAY_DELAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [preferencesHydrated]);

  return (
    <View style={styles.folderHomeFrame}>
      {preferencesHydrated ? (
        <NavigationContainer theme={FOLDER_NAVIGATION_THEME}>
          <FolderStack.Navigator screenOptions={FOLDER_STACK_SCREEN_OPTIONS}>
            <FolderStack.Screen
              name="directory"
              initialParams={{ folderId: initialFolderId }}
            >
              {({ navigation, route }) => (
                <MobileFolderDirectoryScreen
                  navigation={navigation}
                  externalVideoPlayer={externalVideoPlayer}
                  initialDirectory={
                    route.params?.folderId === initialFolderId
                      ? initialDirectory
                      : undefined
                  }
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
      ) : null}
      <MobileFadingOverlay
        exitDurationMs={FOLDER_RESTORE_OVERLAY_FADE_DURATION_MS}
        style={styles.folderRestoreOverlay}
        visible={!preferencesHydrated && restoreOverlayAllowed}
      >
        <MobileLoadingState
          description="恢复上次打开的目录和视图偏好"
          icon="folder-open-outline"
          theme={theme}
          title="正在恢复文件夹"
        />
      </MobileFadingOverlay>
    </View>
  );
};

/**
 * Renders one folder directory as a native stack screen.
 */
const MobileFolderDirectoryScreen = ({
  externalVideoPlayer,
  initialDirectory,
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
  const [directory, setDirectory] = useState<FolderDirectory | undefined>(
    () => initialDirectory,
  );
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [folderFabOpen, setFolderFabOpen] = useState(false);
  const [error, setError] = useState("");
  const [folderCardSize, setFolderCardSize] =
    useState<MobileFolderCardSize>(DEFAULT_CARD_SIZE);
  const [loading, setLoading] = useState(() => !initialDirectory);
  const [mediaAuthLoading, setMediaAuthLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [folderDialogError, setFolderDialogError] = useState("");
  const [folderDialogMode, setFolderDialogMode] = useState<
    "create" | "rename"
  >();
  const [folderDialogName, setFolderDialogName] = useState("");
  const [folderDialogTarget, setFolderDialogTarget] = useState<FolderSummary>();
  const [folderSubmitting, setFolderSubmitting] = useState(false);
  const [cacheServerAliases, setCacheServerAliases] = useState<string[]>([]);
  const [coverDialogAutoSubmitting, setCoverDialogAutoSubmitting] =
    useState(false);
  const [coverDialogDirectory, setCoverDialogDirectory] =
    useState<FolderDirectory>(() => createEmptyDirectory());
  const [coverDialogError, setCoverDialogError] = useState("");
  const [coverDialogLoading, setCoverDialogLoading] = useState(false);
  const [coverDialogSelectedHashes, setCoverDialogSelectedHashes] = useState<
    string[]
  >([]);
  const [coverDialogSubmitting, setCoverDialogSubmitting] = useState(false);
  const [coverDialogTarget, setCoverDialogTarget] = useState<FolderSummary>();
  const [moveDialogDirectory, setMoveDialogDirectory] =
    useState<FolderDirectory>(() => createEmptyDirectory());
  const [moveDialogError, setMoveDialogError] = useState("");
  const [moveDialogLoading, setMoveDialogLoading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogOverwriteMode, setMoveDialogOverwriteMode] =
    useState<FileMoveOverwriteMode>(2);
  const [moveDialogTarget, setMoveDialogTarget] = useState<FolderSummary>();
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [previewDetail, setPreviewDetail] = useState<FileDetail>();
  const [previewDetailError, setPreviewDetailError] = useState("");
  const [previewDetailLoading, setPreviewDetailLoading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FolderFileSummary>();
  const [previewDisplayedImageSource, setPreviewDisplayedImageSource] =
    useState<PreviewImageSource>("thumbnail");
  const [previewDisplayedImageUriState, setPreviewDisplayedImageUriState] =
    useState<PreviewDisplayedImageUriState>();
  const [previewHdLoadedUri, setPreviewHdLoadedUri] = useState<string>();
  const [previewImageViewerStartIndex, setPreviewImageViewerStartIndex] =
    useState(0);
  const [previewInfoVisible, setPreviewInfoVisible] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("thumbnail");
  const [previewMoreOpen, setPreviewMoreOpen] = useState(false);
  const [previewOpenNonce, setPreviewOpenNonce] = useState(0);
  const [previewPendingImageSource, setPreviewPendingImageSource] =
    useState<PreviewImageSource>();
  const [previewVideoPosterUriState, setPreviewVideoPosterUriState] =
    useState<PreviewDisplayedImageUriState>();
  const [previewNotice, setPreviewNotice] = useState("");
  const [previewSettingsOpen, setPreviewSettingsOpen] = useState(false);
  const [nativePreviewVideoOpen, setNativePreviewVideoOpen] = useState(false);
  const [nativePreviewVideoPosterUri, setNativePreviewVideoPosterUri] =
    useState<string>();
  const [nativePreviewVideoRequestKey, setNativePreviewVideoRequestKey] =
    useState<string>();
  const [nativePreviewVideoPlaybackKey, setNativePreviewVideoPlaybackKey] =
    useState<string>();
  const [nativePreviewVideoSourceLabel, setNativePreviewVideoSourceLabel] =
    useState<PreviewVideoSourceLabel>();
  const [nativePreviewVideoSourceUri, setNativePreviewVideoSourceUri] =
    useState<string>();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<DirectorySelectionKey>>(
    () => new Set(),
  );
  const [selectionMode, setSelectionMode] = useState(false);
  const [showFolderCovers, setShowFolderCovers] = useState(true);
  const [sortDirection, setSortDirection] = useState<MobileFolderSortDirection>(
    DEFAULT_SORT_DIRECTION,
  );
  const [sortField, setSortField] =
    useState<MobileFolderSortField>(DEFAULT_SORT_FIELD);
  const [submittingAction, setSubmittingAction] = useState<"delete" | "move">();
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [viewMode, setViewMode] =
    useState<MobileFolderViewMode>(DEFAULT_VIEW_MODE);
  const [previewAlbumIds, setPreviewAlbumIds] = useState<number[]>([]);
  const [previewAlbums, setPreviewAlbums] = useState<FileAlbumSummary[]>([]);
  const [previewAlbumsError, setPreviewAlbumsError] = useState("");
  const [previewAlbumsLoading, setPreviewAlbumsLoading] = useState(false);
  const [previewAlbumsOpen, setPreviewAlbumsOpen] = useState(false);
  const [previewBusyAction, setPreviewBusyAction] =
    useState<PreviewBusyAction>();
  const [previewFavoriteAlbumId, setPreviewFavoriteAlbumId] =
    useState<number>();
  const [previewFavoriteFileIds, setPreviewFavoriteFileIds] = useState<
    number[]
  >([]);
  const [previewOriginalTransition, setPreviewOriginalTransition] =
    useState<PreviewOriginalTransition>();
  const [previewWarmThumbnailUris, setPreviewWarmThumbnailUris] = useState<
    Record<string, string>
  >({});
  const [folderGridWidth, setFolderGridWidth] = useState(0);
  const coverDialogRequestIdRef = useRef(0);
  const handledRootRequestRef = useRef(rootRequestVersion);
  const mediaAuthRequestRef = useRef<Promise<string | undefined> | undefined>(
    undefined,
  );
  const nativePreviewVideoAuthRetryKeyRef = useRef<string | undefined>(
    undefined,
  );
  const previewAutoOriginalSessionRef = useRef<string | undefined>(undefined);
  const previewHdLoadRequestRef = useRef(0);
  const previewImageLoadRequestRef = useRef(0);
  const previewModeRef = useRef<PreviewMode>("thumbnail");
  const previewOpenBlockedUntilRef = useRef(0);
  const previewNoticeTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const nativePreviewVideoPreloadRequestRef = useRef(0);
  const nativePreviewVideoLoadRequestRef = useRef(0);
  const previewVideoPrepareRequestRef = useRef(0);
  const apiOptions = useMobileApiOptions({
    onChangeTokens,
    serverUrl: session.serverUrl,
    tokens: session.tokens,
  });
  const { tokensRef } = apiOptions;
  const cacheScopeOptions = useMemo(
    () => createMobileCacheScopeOptions(session, cacheServerAliases),
    [
      cacheServerAliases,
      session.serverUrl,
      session.user.id,
      session.user.username,
    ],
  );
  const cacheScope = useMemo(
    () => createMobileLocalCacheScope(cacheScopeOptions),
    [cacheScopeOptions],
  );
  const cacheFallbackScopes = useMemo(
    () => createMobileLocalCacheFallbackScopes(cacheScopeOptions),
    [cacheScopeOptions],
  );
  const cacheFolder = useMemo(
    () =>
      createMobileLocalCacheFolderRef({
        directory,
        fallbackScopes: cacheFallbackScopes,
        folderId: currentFolderId,
        scope: cacheScope,
      }),
    [cacheFallbackScopes, cacheScope, currentFolderId, directory],
  );
  const coverDialogCacheFolder = useMemo(
    () =>
      createMobileLocalCacheFolderRef({
        directory: coverDialogDirectory,
        fallbackScopes: cacheFallbackScopes,
        scope: cacheScope,
      }),
    [cacheFallbackScopes, cacheScope, coverDialogDirectory],
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
  const folderContentContainerStyle = useMemo(
    () => [
      styles.content,
      {
        paddingBottom: Math.max(
          FOLDER_CONTENT_BOTTOM_TABBAR_PADDING,
          safeAreaInsets.bottom + FOLDER_CONTENT_BOTTOM_TABBAR_SAFE_AREA_OFFSET,
        ),
      },
    ],
    [safeAreaInsets.bottom],
  );
  const folderGridModeStyle =
    viewMode === "list" ? styles.folderListGrid : styles.folderGridTrack;
  const folderGridColumnCount =
    viewMode === "list" ? 1 : FOLDER_GRID_COLUMN_COUNT[folderCardSize];
  const mediaColumnCount = getMediaWaterfallColumnCount(folderCardSize);

  /**
   * Lets FlashList masonry use real media columns while keeping headers and file rows full-width.
   */
  const overrideDirectoryItemLayout = useCallback<
    NonNullable<FlashListProps<DirectoryListItem>["overrideItemLayout"]>
  >((layout, item, _index, maxColumns) => {
    layout.span = item.type === "media-file" ? 1 : maxColumns;
  }, []);

  /**
   * Gives FlashList stable recycle pools for heavy media cells and full-width controls.
   */
  const getDirectoryListItemType = useCallback(
    (item: DirectoryListItem): string => {
      return item.type;
    },
    [],
  );

  /**
   * Stores the real folder grid viewport width so stack transitions cannot skew column anchors.
   */
  const handleFolderGridLayout = useCallback(
    (event: LayoutChangeEvent): void => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);

      setFolderGridWidth((currentWidth) =>
        currentWidth === nextWidth ? currentWidth : nextWidth,
      );
    },
    [],
  );

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

      setCacheServerAliases(
        getMobileLegacyCacheServerAliases(preferences, session.serverUrl),
      );
      setFolderCardSize(preferences.folderCardSize ?? DEFAULT_CARD_SIZE);
      setCacheEnabled(preferences.localCacheEnabled ?? true);
      setShowFolderCovers(preferences.showFolderCovers ?? true);
      setSortDirection(
        preferences.folderSortDirection ?? DEFAULT_SORT_DIRECTION,
      );
      setSortField(preferences.folderSortField ?? DEFAULT_SORT_FIELD);
      setViewMode(preferences.folderViewMode ?? DEFAULT_VIEW_MODE);
      setPreferencesHydrated(true);
    };

    void hydratePreferences();

    return () => {
      mounted = false;
    };
  }, [session.serverUrl]);

  /**
   * Ensures image endpoints have a media auth_code for thumbnails and previews.
   */
  const ensureMediaAuthCode = useCallback(async (
    options: { forceRefresh?: boolean } = {},
  ): Promise<string | undefined> => {
    if (tokensRef.current.authCode && !options.forceRefresh) {
      return tokensRef.current.authCode;
    }

    if (mediaAuthRequestRef.current) {
      return mediaAuthRequestRef.current;
    }

    setMediaAuthLoading(true);
    mediaAuthRequestRef.current = fetchMediaAuthCode(
      session.serverUrl,
      tokensRef.current.refreshToken,
    )
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
    async (
      folderId = currentFolderId,
      mode: "loading" | "refreshing" = "loading",
    ) => {
      if (mode === "refreshing") {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");
      setMessage("");
      const cachedDirectory =
        cacheEnabled && mode === "loading"
          ? await readCachedMobileDirectory({
              fallbackScopes: cacheFallbackScopes,
              folderId,
              scope: cacheScope,
            })
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
              fallbackScopes: cacheFallbackScopes,
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
    [apiOptions, cacheEnabled, cacheFallbackScopes, cacheScope, currentFolderId],
  );

  /**
   * Triggers a directory reload from the native pull gesture.
   */
  const handleDirectoryRefresh = useCallback((): void => {
    void loadDirectory(currentFolderId, "refreshing");
  }, [currentFolderId, loadDirectory]);

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
      void loadDirectory(undefined, "refreshing");
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "directory", params: { folderId: undefined } }],
      });
    }

    void mergeMobilePreferences({ currentFolderId: undefined });
  }, [currentFolderId, loadDirectory, navigation, rootRequestVersion]);

  const sortedDirectory = useMemo(
    () =>
      directory
        ? sortDirectory(directory, {
            direction: sortDirection,
            field: sortField,
          })
        : undefined,
    [directory, sortDirection, sortField],
  );
  const currentPathItems = useMemo(
    () =>
      sortedDirectory ? createCurrentDirectoryPathItems(sortedDirectory) : [],
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
    () =>
      previewFiles.filter(isMediaFile).flatMap((file) => {
        const thumbnailUri = createThumbnailUrl({
          authCode: session.tokens.authCode,
          baseUrl: session.serverUrl,
          md5: file.md5,
          type: "h220",
        });
        const hdUri = isVideoFile(file)
          ? undefined
          : createFilePreviewUrl({
              authCode: session.tokens.authCode,
              baseUrl: session.serverUrl,
              id: file.id,
              md5: file.md5,
              type: "hd",
            });
        const uri = thumbnailUri || hdUri;

        if (!uri) {
          return [];
        }

        return [
          {
            file,
            thumbnailUri,
            uri,
          },
        ];
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
    [
      folderCardSize,
      folderGridColumnCount,
      isInitialLoading,
      sortedDirectory,
      viewMode,
    ],
  );

  const allVisibleSelected =
    selectionItems.length > 0 && selectedItems.length === selectionItems.length;
  const previewIsVideo = Boolean(previewFile && isVideoFile(previewFile));
  const previewIsImage = Boolean(previewFile && isImageFile(previewFile));
  const previewFileKey = previewFile
    ? createFileSelectionKey(previewFile)
    : undefined;
  const previewListThumbnailUrl = createThumbnailUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    md5: previewFile?.md5,
    type: "h220",
  });
  const previewVideoPosterUrl =
    previewFile && previewIsVideo
      ? createThumbnailUrl({
          authCode: session.tokens.authCode,
          baseUrl: session.serverUrl,
          md5: previewFile.md5,
          type: "poster",
        })
      : undefined;
  const previewHdImageUrl =
    previewFile && !previewIsVideo
      ? createFilePreviewUrl({
          authCode: session.tokens.authCode,
          baseUrl: session.serverUrl,
          id: previewFile.id,
          md5: previewFile.md5,
          type: "hd",
        })
      : undefined;
  const previewOriginalUrl = createFilePreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: "ori",
  });
  const previewVideoDirectUrl = createVideoPreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: "direct",
  });
  const previewVideoTranscodeUrl = createVideoPreviewUrl({
    authCode: session.tokens.authCode,
    baseUrl: session.serverUrl,
    id: previewFile?.id,
    md5: previewFile?.md5,
    type: "transcode",
  });
  const previewVideoPlaybackUrl =
    previewFile && previewIsVideo
      ? getVideoPlaybackUrl(
          previewFile,
          previewVideoDirectUrl,
          previewVideoTranscodeUrl,
        )
      : undefined;
  const previewOriginalMediaUrl = previewIsVideo
    ? previewVideoPlaybackUrl
    : previewOriginalUrl;
  const previewListThumbnailCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: "file-thumbnail",
    md5: previewFile?.md5,
    sourceUrl: previewFile ? previewListThumbnailUrl : undefined,
    cacheOnMiss: true,
    variant: "h220",
  });
  const previewHdImageCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile && !previewIsVideo),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: "file-hd-thumbnail",
    md5: previewFile?.md5,
    sourceUrl: previewFile && !previewIsVideo ? previewHdImageUrl : undefined,
    cacheOnMiss: true,
    variant: "hd",
  });
  const previewOriginalImageCache = useCachedMobileMediaUri({
    enabled: cacheEnabled && Boolean(previewFile && !previewIsVideo),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: "image-preview",
    md5: previewFile?.md5,
    sourceUrl: previewFile && !previewIsVideo ? previewOriginalUrl : undefined,
    variant: "ori",
  });
  const previewVideoCache = useCachedMobileMediaUri({
    enabled:
      cacheEnabled &&
      Boolean(previewFile && previewIsVideo && previewMode === "original"),
    fileId: previewFile?.id,
    folder: cacheFolder,
    instantNetworkFallback: true,
    kind: "video-preview",
    md5: previewFile?.md5,
    sourceUrl:
      previewFile && previewIsVideo && previewMode === "original"
        ? previewVideoPlaybackUrl
        : undefined,
    variant: isDirectVideoPreviewSupported(previewFile)
      ? "direct"
      : "transcode",
  });

  useEffect(() => {
    if (
      !previewFile ||
      !previewFileKey ||
      !previewIsVideo ||
      !previewVideoPosterUrl ||
      !cacheEnabled
    ) {
      return undefined;
    }

    let cancelled = false;
    const cacheParams = {
      fileId: previewFile.id,
      folder: cacheFolder,
      kind: "video-poster" as const,
      md5: previewFile.md5,
      url: previewVideoPosterUrl,
      variant: "poster",
    };
    const applyPosterUri = (uri?: string): void => {
      if (!cancelled && uri) {
        setPreviewVideoPosterUriState({ fileKey: previewFileKey, uri });
      }
    };

    /**
     * Poster is an enhancement for fullscreen video: use cached poster when available,
     * otherwise keep h220 visible and fetch poster in the background.
     */
    const hydrateVideoPoster = async (): Promise<void> => {
      const cachedUri = await readCachedMobileMediaUri(cacheParams).catch(
        () => undefined,
      );

      if (cancelled) {
        return;
      }

      if (cachedUri) {
        applyPosterUri(cachedUri);
        return;
      }

      const downloadedUri = await cacheMobileMediaResourceFromUrl(cacheParams);
      applyPosterUri(downloadedUri);
    };

    void hydrateVideoPoster();

    return () => {
      cancelled = true;
    };
  }, [
    cacheEnabled,
    cacheFolder,
    previewFile,
    previewFileKey,
    previewIsVideo,
    previewVideoPosterUrl,
  ]);

  useEffect(() => {
    previewModeRef.current = previewMode;
  }, [previewMode]);

  useEffect(() => {
    previewImageLoadRequestRef.current += 1;
    previewHdLoadRequestRef.current += 1;
    setPreviewDisplayedImageSource("thumbnail");
    setPreviewDisplayedImageUriState(undefined);
    setPreviewHdLoadedUri(undefined);
    setPreviewMoreOpen(false);
    setPreviewOriginalTransition(undefined);
    setPreviewPendingImageSource(undefined);
  }, [previewFile?.id, previewFile?.md5]);

  useEffect(() => {
    if (
      !previewIsImage ||
      !previewListThumbnailCache.displayUri ||
      !previewFileKey
    ) {
      return;
    }

    setPreviewDisplayedImageUriState((currentState) => {
      const currentUri =
        currentState?.fileKey === previewFileKey ? currentState.uri : undefined;
      const nextUri =
        currentUri && previewDisplayedImageSource !== "thumbnail"
          ? currentUri
          : previewListThumbnailCache.displayUri;

      return nextUri ? { fileKey: previewFileKey, uri: nextUri } : undefined;
    });
  }, [
    previewDisplayedImageSource,
    previewFileKey,
    previewIsImage,
    previewListThumbnailCache.displayUri,
  ]);

  useEffect(() => {
    const hdUri = previewHdImageCache.displayUri;
    const requestId = previewHdLoadRequestRef.current + 1;
    let cancelled = false;

    previewHdLoadRequestRef.current = requestId;
    setPreviewHdLoadedUri(undefined);

    if (!previewIsImage || !hdUri || !previewFileKey) {
      setPreviewPendingImageSource((current) =>
        current === "hd" ? undefined : current,
      );
      return undefined;
    }

    if (previewModeRef.current === "thumbnail") {
      setPreviewPendingImageSource("hd");
    }

    const commitHdPreview = (): void => {
      if (cancelled || previewHdLoadRequestRef.current !== requestId) {
        return;
      }

      setPreviewHdLoadedUri(hdUri);

      if (previewModeRef.current === "thumbnail") {
        setPreviewDisplayedImageSource("hd");
        setPreviewDisplayedImageUriState({
          fileKey: previewFileKey,
          uri: hdUri,
        });
        setPreviewPendingImageSource((current) =>
          current === "hd" ? undefined : current,
        );
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
        } else if (
          !cancelled &&
          previewHdLoadRequestRef.current === requestId
        ) {
          setPreviewPendingImageSource((current) =>
            current === "hd" ? undefined : current,
          );
        }
      })
      .catch(() => {
        if (!cancelled && previewHdLoadRequestRef.current === requestId) {
          setPreviewPendingImageSource((current) =>
            current === "hd" ? undefined : current,
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    previewFile?.id,
    previewFile?.md5,
    previewFileKey,
    previewHdImageCache.cacheHit,
    previewHdImageCache.displayUri,
    previewHdImageCache.rememberLoadedResource,
    previewIsImage,
  ]);

  useEffect(() => {
    if (!previewFileKey) {
      return;
    }

    const autoOriginalSession = `${previewFileKey}:${previewOpenNonce}`;

    if (
      !previewIsImage ||
      previewAutoOriginalSessionRef.current === autoOriginalSession ||
      previewDisplayedImageSource !== "hd" ||
      !previewOriginalImageCache.cacheHit ||
      !previewOriginalImageCache.displayUri
    ) {
      return;
    }

    previewAutoOriginalSessionRef.current = autoOriginalSession;
    setPreviewOriginalTransition({
      fileKey: previewFileKey,
      token: Date.now(),
      uri: previewOriginalImageCache.displayUri,
    });
    setPreviewPendingImageSource("original");
  }, [
    previewDisplayedImageSource,
    previewFileKey,
    previewIsImage,
    previewOpenNonce,
    previewOriginalImageCache.cacheHit,
    previewOriginalImageCache.displayUri,
  ]);

  const previewHdReady = Boolean(
    previewHdImageCache.displayUri &&
    previewHdLoadedUri === previewHdImageCache.displayUri,
  );
  const previewImageShowsOriginal =
    previewIsImage && previewDisplayedImageSource === "original";
  const previewDisplayedMode: PreviewMode =
    previewImageShowsOriginal || (previewIsVideo && previewMode === "original")
      ? "original"
      : "thumbnail";
  const previewActionDisabled =
    Boolean(previewPendingImageSource) ||
    (previewDisplayedMode === "thumbnail" &&
      (!previewOriginalMediaUrl || videoPreparing));
  const previewActionLabel = getPreviewActionLabel(
    previewFile,
    previewDisplayedMode,
    videoPreparing,
  );
  const previewIndex = previewFile
    ? previewFiles.findIndex(
        (file) =>
          createFileSelectionKey(file) === createFileSelectionKey(previewFile),
      )
    : -1;
  const previewImageGalleryIndex = previewFile
    ? previewImageGalleryItems.findIndex(
        (item) =>
          createFileSelectionKey(item.file) ===
          createFileSelectionKey(previewFile),
      )
    : -1;
  const previewCurrentGalleryItem =
    previewImageGalleryIndex >= 0
      ? previewImageGalleryItems[previewImageGalleryIndex]
      : undefined;
  const previewDefaultImageCache = previewHdReady
    ? previewHdImageCache
    : previewListThumbnailCache;
  const previewDisplayedImageCache =
    previewDisplayedImageSource === "original"
      ? previewOriginalImageCache
      : previewDisplayedImageSource === "hd"
        ? previewHdImageCache
        : previewListThumbnailCache;
  const previewDisplayCache = previewIsImage
    ? previewDisplayedImageCache
    : previewMode === "original"
      ? previewVideoCache
      : previewListThumbnailCache;
  const previewIsFavorite = Boolean(
    previewFile &&
    (previewFavoriteFileIds.includes(previewFile.id) ||
      (previewFavoriteAlbumId &&
        previewAlbumIds.includes(previewFavoriteAlbumId))),
  );
  const previewDisplayedImageUri =
    previewDisplayedImageUriState &&
    previewDisplayedImageUriState.fileKey === previewFileKey
      ? previewDisplayedImageUriState.uri
      : undefined;
  const previewVideoPosterUri =
    cacheEnabled &&
    previewVideoPosterUriState &&
    previewVideoPosterUriState.fileKey === previewFileKey
      ? previewVideoPosterUriState.uri
      : undefined;
  const previewOriginalTargetUri =
    previewOriginalTransition &&
    previewOriginalTransition.fileKey === previewFileKey
      ? previewOriginalTransition.uri
      : undefined;
  const previewImageActiveUri =
    previewOriginalTargetUri ??
    previewDisplayedImageUri ??
    previewDefaultImageCache.displayUri ??
    previewListThumbnailCache.displayUri;
  const previewVideoCoverUri =
    previewListThumbnailCache.displayUri ??
    previewCurrentGalleryItem?.thumbnailUri ??
    previewCurrentGalleryItem?.uri ??
    previewVideoPosterUri;
  const previewCurrentMediaActiveUri = previewIsVideo
    ? previewVideoCoverUri
    : previewImageActiveUri;
  const previewImageViewerImages = useMemo(
    () =>
      previewImageGalleryItems.map((item) => {
        const mediaKey = createPreviewMediaKey(item.file);
        const itemFileKey = createFileSelectionKey(item.file);

        return {
          uri:
            previewFile &&
            itemFileKey === createFileSelectionKey(previewFile)
              ? (previewCurrentMediaActiveUri ??
                previewWarmThumbnailUris[mediaKey] ??
                item.uri)
              : (previewWarmThumbnailUris[mediaKey] ?? item.uri),
        };
      }),
    [
      previewCurrentMediaActiveUri,
      previewFile,
      previewImageGalleryItems,
      previewWarmThumbnailUris,
    ],
  );
  const previewImageViewerInitialIndex = Math.min(
    Math.max(previewImageViewerStartIndex, 0),
    Math.max(previewImageViewerImages.length - 1, 0),
  );
  const previewUsesImageViewer = Boolean(
    previewFile && previewImageGalleryIndex >= 0,
  );
  const nativePreviewVideoMounted = Boolean(
    previewUsesImageViewer && previewIsVideo && previewFileKey,
  );
  const previewVideoPlaybackActive = Boolean(
    nativePreviewVideoOpen || nativePreviewVideoRequestKey,
  );
  const previewWarmThumbnailSources = useMemo(() => {
    if (!previewUsesImageViewer || previewImageGalleryIndex < 0) {
      return [];
    }

    return getPreviewWarmThumbnailItems(
      previewImageGalleryItems,
      previewImageGalleryIndex,
      PREVIEW_NEIGHBOR_PRELOAD_RADIUS,
    )
      .map(
        (item) =>
          previewWarmThumbnailUris[createPreviewMediaKey(item.file)] ??
          item.thumbnailUri ??
          item.uri,
      )
      .filter((uri): uri is string => Boolean(uri));
  }, [
    previewImageGalleryIndex,
    previewImageGalleryItems,
    previewUsesImageViewer,
    previewWarmThumbnailUris,
  ]);
  const previewCacheSourceName = previewIsImage
    ? getPreviewImageSourceLabel(previewDisplayedImageSource)
    : previewMode === "original"
      ? "原视频"
      : "视频封面";
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
    if (
      !previewVideoPosterUri ||
      !previewFileKey ||
      !nativePreviewVideoMounted
    ) {
      return;
    }

    if (
      nativePreviewVideoRequestKey &&
      nativePreviewVideoRequestKey !== previewFileKey
    ) {
      return;
    }

    setNativePreviewVideoPosterUri(previewVideoPosterUri);
  }, [
    nativePreviewVideoMounted,
    nativePreviewVideoOpen,
    nativePreviewVideoRequestKey,
    previewFileKey,
    previewVideoPosterUri,
  ]);

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
    const warmKeys = new Set(
      warmItems.map((item) => createPreviewMediaKey(item.file)),
    );

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

          return uri
            ? ([createPreviewMediaKey(item.file), uri] as const)
            : undefined;
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
  }, [
    cacheEnabled,
    cacheFolder,
    previewImageGalleryIndex,
    previewImageGalleryItems,
    previewUsesImageViewer,
  ]);

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
    return navigation.addListener("focus", () => {
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
  }, [
    folderCardSize,
    preferencesHydrated,
    showFolderCovers,
    sortDirection,
    sortField,
    viewMode,
  ]);

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
      setPreviewDetailError("");
      setPreviewDetailLoading(false);
      return;
    }

    let cancelled = false;

    setPreviewDetail(undefined);
    setPreviewDetailError("");
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
      setError("当前文件夹缺少 folderId，暂时无法下钻。");
      return;
    }

    navigation.push("directory", {
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
      void loadDirectory(undefined, "refreshing");
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: "directory", params: { folderId: undefined } }],
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

    const breadcrumbIndex = sortedDirectory.breadcrumbs.findIndex(
      (item) => getBreadcrumbItemId(item) === folderId,
    );

    if (breadcrumbIndex >= 0) {
      const routes = createFolderStackRoutes(
        sortedDirectory.breadcrumbs.slice(0, breadcrumbIndex + 1),
      );

      navigation.reset({
        index: routes.length - 1,
        routes,
      });
    } else {
      navigation.push("directory", { folderId });
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
          showPreviewNotice(
            `已尝试准备转码预览：${getApiErrorMessage(transcodeError)}`,
          );
        }
      })
      .finally(() => {
        if (previewVideoPrepareRequestRef.current === requestId) {
          setVideoPreparing(false);
        }
      });
  };

  /**
   * Waits until a non-direct video has a generated transcode file before
   * handing its URL to the native player.
   */
  const waitForNativeVideoTranscodeReady = async (
    file: FolderFileSummary,
    requestId: number,
  ): Promise<boolean> => {
    let lastResult: VideoTranscodeResult | undefined;

    for (
      let attemptIndex = 0;
      attemptIndex <= VIDEO_TRANSCODE_WAIT_DELAYS_MS.length;
      attemptIndex += 1
    ) {
      if (nativePreviewVideoLoadRequestRef.current !== requestId) {
        return false;
      }

      try {
        lastResult = await triggerVideoTranscode({
          ...apiOptions,
          fileId: file.id,
        });
      } catch (transcodeError) {
        if (nativePreviewVideoLoadRequestRef.current === requestId) {
          showPreviewNotice(
            `视频转码准备失败：${getApiErrorMessage(transcodeError)}`,
          );
        }

        return false;
      }

      if (nativePreviewVideoLoadRequestRef.current !== requestId) {
        return false;
      }

      if (lastResult.transcodeStatus === VIDEO_TRANSCODE_READY_STATUS) {
        return true;
      }

      if (
        lastResult.transcodeStatus === VIDEO_TRANSCODE_FAILED_STATUS ||
        lastResult.transcodeStatus === VIDEO_TRANSCODE_IGNORED_STATUS
      ) {
        showPreviewNotice(getVideoTranscodeUnavailableMessage(lastResult));
        return false;
      }

      const nextDelay = VIDEO_TRANSCODE_WAIT_DELAYS_MS[attemptIndex];

      if (nextDelay === undefined) {
        break;
      }

      await waitForVideoTranscodePoll(nextDelay);
    }

    if (nativePreviewVideoLoadRequestRef.current === requestId) {
      showPreviewNotice(getVideoTranscodeUnavailableMessage(lastResult));
    }

    return false;
  };

  /**
   * Opens a file preview and starts media authorization if needed.
   */
  const handlePreviewFile = (file: FolderFileSummary): void => {
    if (Date.now() < previewOpenBlockedUntilRef.current) {
      return;
    }

    if (selectionMode) {
      toggleSelection(createFileSelectionKey(file));
      return;
    }

    const isPreviewVideo = isVideoFile(file);
    const imageViewerStartIndex = previewImageGalleryItems.findIndex(
      (item) =>
        createFileSelectionKey(item.file) === createFileSelectionKey(file),
    );

    setPreviewFile(file);
    setPreviewOpenNonce((current) => current + 1);
    setPreviewImageViewerStartIndex(Math.max(imageViewerStartIndex, 0));
    setPreviewInfoVisible(false);
    setPreviewMode(isPreviewVideo ? "original" : "thumbnail");
    setPreviewMoreOpen(false);
    setPreviewOriginalTransition(undefined);
    setPreviewDisplayedImageSource("thumbnail");
    setPreviewDisplayedImageUriState(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewDetailError("");
    setPreviewNotice("");
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    nativePreviewVideoPreloadRequestRef.current += 1;
    nativePreviewVideoLoadRequestRef.current += 1;
    setNativePreviewVideoOpen(false);
    setNativePreviewVideoPlaybackKey(undefined);
    setNativePreviewVideoPosterUri(undefined);
    setNativePreviewVideoRequestKey(undefined);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    void ensureMediaAuthCode();
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
      setPreviewNotice("");
    }, PREVIEW_NOTICE_DURATION_MS);
  };

  /**
   * Closes the fullscreen preview and clears transient toolbar state.
   */
  const closePreview = (): void => {
    previewOpenBlockedUntilRef.current = Date.now() + 600;
    previewVideoPrepareRequestRef.current += 1;
    setPreviewFile(undefined);
    setPreviewDisplayedImageSource("thumbnail");
    setPreviewDisplayedImageUriState(undefined);
    setPreviewInfoVisible(false);
    setPreviewMode("thumbnail");
    setPreviewMoreOpen(false);
    setPreviewOriginalTransition(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewDetailError("");
    setPreviewNotice("");
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    nativePreviewVideoPreloadRequestRef.current += 1;
    nativePreviewVideoLoadRequestRef.current += 1;
    setNativePreviewVideoOpen(false);
    setNativePreviewVideoPlaybackKey(undefined);
    setNativePreviewVideoPosterUri(undefined);
    setNativePreviewVideoRequestKey(undefined);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    setPreviewImageViewerStartIndex(0);
  };

  /**
   * Creates an official file share link and opens the native share sheet.
   */
  const handleSharePreviewFile = async (): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    setPreviewBusyAction("share");

    try {
      const response = await createFileShareLink(apiOptions, {
        cover: previewFile.md5,
        desc: previewFile.name,
        fileIds: [previewFile.id],
        linkEndTime: null,
        linkPwd: "",
        showDownload: true,
        showExif: true,
      });
      const shareUrl = createMobileShareUrl(session.serverUrl, response.key);

      await Share.share({
        message: shareUrl,
        title: previewFile.name,
        url: shareUrl,
      });
      showPreviewNotice("分享链接已生成");
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
    setPreviewAlbumsError("");
    setPreviewAlbumsLoading(true);
    setPreviewBusyAction("album");

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
  const handleTogglePreviewAlbum = async (
    album: FileAlbumSummary,
  ): Promise<void> => {
    if (!previewFile || previewBusyAction) {
      return;
    }

    const included = previewAlbumIds.includes(album.id);

    setPreviewBusyAction("album");
    setPreviewAlbumsError("");

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

    setPreviewBusyAction("favorite");

    try {
      const favoriteAlbum = previewFavoriteAlbumId
        ? { id: previewFavoriteAlbumId }
        : await checkFavoriteAlbum(apiOptions);
      const favoriteAlbumId = favoriteAlbum.id;

      if (!favoriteAlbumId) {
        throw new Error("收藏夹不可用");
      }

      if (previewIsFavorite) {
        await removeFilesFromAlbum(apiOptions, favoriteAlbumId, [
          previewFile.id,
        ]);
        setPreviewFavoriteFileIds((ids) =>
          ids.filter((id) => id !== previewFile.id),
        );
        setPreviewAlbumIds((ids) => ids.filter((id) => id !== favoriteAlbumId));
        showPreviewNotice("已取消收藏");
      } else {
        await addFilesToAlbum(apiOptions, favoriteAlbumId, [previewFile.id]);
        setPreviewFavoriteAlbumId(favoriteAlbumId);
        setPreviewFavoriteFileIds((ids) =>
          Array.from(new Set([...ids, previewFile.id])),
        );
        setPreviewAlbumIds((ids) =>
          Array.from(new Set([...ids, favoriteAlbumId])),
        );
        showPreviewNotice("已收藏");
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

    Alert.alert(
      "放到回收站",
      `将「${previewFile.name}」放到回收站。是否继续？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "放到回收站",
          style: "destructive",
          onPress: () => void handleDeletePreviewFile(),
        },
      ],
    );
  };

  /**
   * Moves the current preview file to the recycle bin and refreshes the directory.
   */
  const handleDeletePreviewFile = async (): Promise<void> => {
    if (!previewFile) {
      return;
    }

    setPreviewBusyAction("delete");

    try {
      await deleteFiles(apiOptions, [previewFile.id]);
      closePreview();
      setMessage("已放到回收站");
      await loadDirectory(currentFolderId, "refreshing");
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

    setPreviewBusyAction("refresh");

    try {
      await refreshFileThumbs({ ...apiOptions, fileId: previewFile.id });
      showPreviewNotice("已刷新缩略图，服务端缓存可能需要几分钟生效");
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

    setPreviewBusyAction("refresh");

    try {
      const result = await refreshFileDescriptor({
        ...apiOptions,
        fileId: previewFile.id,
      });

      showPreviewNotice(
        result.n && result.n > 0 ? "已刷新人脸识别" : "没有需要刷新的人脸数据",
      );
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

    setPreviewBusyAction("refresh");

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
      showPreviewNotice("已刷新 EXIF 信息");
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
    setSelectedKeys(
      allVisibleSelected
        ? new Set()
        : new Set(selectionItems.map((item) => item.key)),
    );
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

    setMoveDialogError("");
    setMoveDialogOpen(true);
    setMoveDialogOverwriteMode(2);
    setMoveDialogTarget(undefined);
    void loadMoveDialogDirectory();
  };

  /**
   * Loads one level of folders for the batch move target picker.
   */
  const loadMoveDialogDirectory = async (folderId?: number): Promise<void> => {
    setMoveDialogError("");
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
      setMoveDialogError("请选择目标文件夹。");
      return;
    }

    if (selectedFolders.some((folder) => folder.id === moveDialogTarget.id)) {
      setMoveDialogError("不能把文件夹移动到自己。");
      return;
    }

    setMoveDialogError("");
    setSubmittingAction("move");

    try {
      const fileIds = selectedFiles
        .map((file) => file.id)
        .filter((id) => id > 0);

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

      setMessage(
        `已移动 ${formatSelectionSummary(selectedFolders.length, selectedFiles.length)}`,
      );
      setMoveDialogOpen(false);
      clearSelection();
      await loadDirectory(currentFolderId, "refreshing");
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
      "删除所选内容",
      `将删除 ${selectedFolders.length} 个文件夹、${selectedFiles.length} 个文件。是否继续？`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: () => void handleDeleteSelection(),
        },
      ],
    );
  };

  /**
   * Deletes selected files and folders, then reloads the current directory.
   */
  const handleDeleteSelection = async (): Promise<void> => {
    setSubmittingAction("delete");
    setError("");
    setMessage("");

    try {
      if (selectedFiles.length > 0) {
        await deleteFiles(
          apiOptions,
          selectedFiles.map((file) => file.id),
        );
      }

      for (const folder of selectedFolders) {
        await deleteFolder(apiOptions, folder.id);
      }

      setMessage(
        `已删除 ${selectedFolders.length} 个文件夹、${selectedFiles.length} 个文件`,
      );
      clearSelection();
      await loadDirectory(currentFolderId, "refreshing");
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

    const nextIndex = Math.min(
      Math.max(previewIndex + step, 0),
      previewFiles.length - 1,
    );
    const nextFile = previewFiles[nextIndex];

    if (!nextFile || nextIndex === previewIndex) {
      return;
    }

    const nextIsVideo = isVideoFile(nextFile);
    const nextImageViewerIndex = previewImageGalleryItems.findIndex(
      (item) =>
        createFileSelectionKey(item.file) === createFileSelectionKey(nextFile),
    );

    setPreviewMode(nextIsVideo ? "original" : "thumbnail");
    setPreviewDisplayedImageSource("thumbnail");
    setPreviewDisplayedImageUriState(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewOpenNonce((current) => current + 1);
    setPreviewImageViewerStartIndex(Math.max(nextImageViewerIndex, 0));
    setPreviewDetailError("");
    setPreviewOriginalTransition(undefined);
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    nativePreviewVideoPreloadRequestRef.current += 1;
    nativePreviewVideoLoadRequestRef.current += 1;
    setNativePreviewVideoOpen(false);
    setNativePreviewVideoPlaybackKey(undefined);
    setNativePreviewVideoPosterUri(undefined);
    setNativePreviewVideoRequestKey(undefined);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    setPreviewFile(nextFile);
    void ensureMediaAuthCode();
  };

  /**
   * Keeps toolbar actions and metadata in sync with the image currently shown by the carousel.
   */
  const handleImagePreviewIndexChange = (nextIndex: number): void => {
    const nextFile = previewImageGalleryItems[nextIndex]?.file;

    if (!nextFile) {
      return;
    }

    if (
      previewFile &&
      createFileSelectionKey(nextFile) === createFileSelectionKey(previewFile)
    ) {
      return;
    }

    const nextIsVideo = isVideoFile(nextFile);

    setPreviewMode(nextIsVideo ? "original" : "thumbnail");
    setPreviewDisplayedImageSource("thumbnail");
    setPreviewDisplayedImageUriState(undefined);
    setPreviewPendingImageSource(undefined);
    setPreviewOpenNonce((current) => current + 1);
    setPreviewDetailError("");
    setPreviewOriginalTransition(undefined);
    setPreviewSettingsOpen(false);
    setVideoPreparing(false);
    nativePreviewVideoPreloadRequestRef.current += 1;
    nativePreviewVideoLoadRequestRef.current += 1;
    setNativePreviewVideoOpen(false);
    setNativePreviewVideoPlaybackKey(undefined);
    setNativePreviewVideoPosterUri(undefined);
    setNativePreviewVideoRequestKey(undefined);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    setPreviewFile(nextFile);

    if (nextIsVideo) {
      void ensureMediaAuthCode();
    }
  };

  /**
   * Switches the preview modal between progressive HD preview and original media.
   */
  const handleTogglePreviewMode = async (): Promise<void> => {
    const currentPreviewFileKey = previewFile
      ? createFileSelectionKey(previewFile)
      : undefined;
    const currentPreviewIsOriginal = previewIsVideo
      ? previewMode === "original"
      : previewImageShowsOriginal;

    if (currentPreviewIsOriginal) {
      const fallbackUri = previewHdReady
        ? (previewHdImageCache.displayUri ??
          previewListThumbnailCache.displayUri)
        : previewListThumbnailCache.displayUri;

      setPreviewMode("thumbnail");
      setPreviewDisplayedImageSource(
        previewHdReady && fallbackUri ? "hd" : "thumbnail",
      );
      setPreviewDisplayedImageUriState(
        fallbackUri && currentPreviewFileKey
          ? { fileKey: currentPreviewFileKey, uri: fallbackUri }
          : undefined,
      );
      setPreviewOriginalTransition(undefined);
      setPreviewPendingImageSource(undefined);
      showPreviewNotice("已切回高清预览图");
      return;
    }

    if (!previewOriginalMediaUrl || !previewFile || !currentPreviewFileKey) {
      showPreviewNotice(
        previewIsVideo
          ? "当前视频没有可用内置播放地址"
          : "当前文件缺少原图地址",
      );
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
          showPreviewNotice(
            `已尝试准备转码预览：${getApiErrorMessage(transcodeError)}`,
          );
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
      let nextOriginalUri =
        previewOriginalImageCache.displayUri ?? previewOriginalMediaUrl;

      previewImageLoadRequestRef.current = requestId;
      setPreviewPendingImageSource("original");

      try {
        if (cacheEnabled) {
          nextOriginalUri =
            (await cacheMobileMediaResourceFromUrl({
              fileId: previewFile.id,
              folder: cacheFolder,
              kind: "image-preview",
              md5: previewFile.md5,
              url: previewOriginalMediaUrl,
              variant: "ori",
            })) ?? nextOriginalUri;
        }

        if (!previewOriginalImageCache.cacheHit) {
          const originalLoaded = await Image.prefetch(nextOriginalUri);

          if (!originalLoaded) {
            throw new Error("原图预加载失败");
          }
        }

        if (previewImageLoadRequestRef.current !== requestId) {
          return;
        }

        if (previewUsesImageViewer) {
          setPreviewOriginalTransition({
            fileKey: currentPreviewFileKey,
            token: Date.now(),
            uri: nextOriginalUri,
          });
          setPreviewPendingImageSource("original");
          showPreviewNotice("正在加载原图预览");
          return;
        }

        setPreviewMode("original");
        setPreviewDisplayedImageSource("original");
        setPreviewDisplayedImageUriState({
          fileKey: currentPreviewFileKey,
          uri: nextOriginalUri,
        });
        setPreviewPendingImageSource(undefined);
        showPreviewNotice("正在使用原图预览");
      } catch (originalError) {
        if (previewImageLoadRequestRef.current === requestId) {
          setPreviewPendingImageSource(undefined);
          showPreviewNotice(
            `原图加载失败：${getApiErrorMessage(originalError)}`,
          );
        }
      }
      return;
    }

    if (cacheEnabled) {
      void cacheMobileMediaResourceFromUrl({
        fileId: previewFile.id,
        folder: cacheFolder,
        kind: "video-preview",
        md5: previewFile.md5,
        url: previewOriginalMediaUrl,
        variant: isDirectVideoPreviewSupported(previewFile)
          ? "direct"
          : "transcode",
      });
    }

    setPreviewMode("original");
    showPreviewNotice("正在使用原视频预览");
  };

  const previewPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          shouldCapturePreviewGesture(gestureState),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          shouldCapturePreviewGesture(gestureState),
        onPanResponderRelease: (_event, gestureState) => {
          const action = getPreviewGestureAction(gestureState);

          if (action === "close") {
            closePreview();
            return;
          }

          if (action === "previous" && previewIndex > 0) {
            handleStepPreview(-1);
          }

          if (
            action === "next" &&
            previewIndex >= 0 &&
            previewIndex < previewFiles.length - 1
          ) {
            handleStepPreview(1);
          }
        },
      }),
    [closePreview, handleStepPreview, previewFiles.length, previewIndex],
  );

  /**
   * Opens the mobile folder-name dialog for create or rename flows.
   */
  const openFolderDialog = (
    mode: "create" | "rename",
    folder?: FolderSummary,
  ): void => {
    setFolderDialogMode(mode);
    setFolderDialogTarget(folder);
    setFolderDialogName(folder?.name ?? "");
    setFolderDialogError("");
  };

  /**
   * Validates and submits create/rename folder operations.
   */
  const handleSubmitFolderDialog = async (): Promise<void> => {
    const folderName = folderDialogName.trim();

    if (!folderName) {
      setFolderDialogError("请输入文件夹名称。");
      return;
    }

    if (FORBIDDEN_FOLDER_NAME_PATTERN.test(folderName)) {
      setFolderDialogError('名称不能包含 / \\ : * ? " < > |。');
      return;
    }

    if (folderDialogMode === "rename" && !folderDialogTarget) {
      setFolderDialogError("当前缺少要重命名的文件夹。");
      return;
    }

    setFolderSubmitting(true);
    setFolderDialogError("");

    try {
      if (folderDialogMode === "rename" && folderDialogTarget) {
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
      setFolderDialogName("");
      await loadDirectory(currentFolderId, "refreshing");
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

    setCoverDialogError("");
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogSelectedHashes(
      folder.coverHashes.slice(0, MAX_FOLDER_COVER_COUNT),
    );
    setCoverDialogTarget(folder);
    void loadCoverDialogDirectory(folder.id);
  };

  /**
   * Loads one folder level inside the cover picker.
   */
  const loadCoverDialogDirectory = async (folderId: number): Promise<void> => {
    const requestId = coverDialogRequestIdRef.current + 1;

    coverDialogRequestIdRef.current = requestId;
    setCoverDialogError("");
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

    if (
      !coverDialogSelectedHashes.includes(file.md5) &&
      coverDialogSelectedHashes.length >= MAX_FOLDER_COVER_COUNT
    ) {
      setCoverDialogError(`最多选择 ${MAX_FOLDER_COVER_COUNT} 张图片。`);
      return;
    }

    setCoverDialogError("");
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
      setCoverDialogError("请选择至少 1 张图片作为封面。");
      return;
    }

    setCoverDialogError("");
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

      setMessage("文件夹封面已更新");
      resetCoverDialog();
      await loadDirectory(currentFolderId, "refreshing");
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

    setCoverDialogError("");
    setCoverDialogAutoSubmitting(true);

    try {
      await autoSetFolderCover(apiOptions, coverDialogTarget.id);
      setMessage("文件夹封面已自动设置");
      resetCoverDialog();
      await loadDirectory(currentFolderId, "refreshing");
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
    setCoverDialogError("");
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogLoading(false);
    setCoverDialogSelectedHashes([]);
    setCoverDialogTarget(undefined);
  };

  const renderDirectoryListItemContent = (
    item: DirectoryListItem,
  ): ReactElement | null => {
    switch (item.type) {
      case "initial-loading":
        return (
          <MobileLoadingState
            description="同步目录、封面和本地缓存状态"
            icon="folder-outline"
            title="正在加载文件夹"
          />
        );
      case "folder-heading":
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
                  fallbackLabel={sortedDirectory.path || "根目录"}
                  items={currentPathItems}
                  onOpenFolderId={handleOpenPathFolder}
                  onOpenRoot={handleOpenRootPath}
                />
              }
            />
          </View>
        );
      case "folder-empty":
        return <EmptyLine text="当前目录没有子文件夹" />;
      case "folder-row":
        return (
          <View
            onLayout={handleFolderGridLayout}
            style={styles.folderGridMeasure}
          >
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
                      onLongSelect={() =>
                        toggleSelection(createFolderSelectionKey(folder))
                      }
                      onOpen={handleOpenFolder}
                      onRename={() => openFolderDialog("rename", folder)}
                      onSetCover={() => openCoverDialog(folder)}
                      onToggleSelection={() =>
                        toggleSelection(createFolderSelectionKey(folder))
                      }
                      selected={selectedKeys.has(
                        createFolderSelectionKey(folder),
                      )}
                      selectionMode={selectionMode}
                      showCover={showFolderCovers}
                      thumbnailsEnabled
                      viewMode={viewMode}
                    />
                  ))}
                  {Array.from({ length: item.placeholderCount }).map(
                    (_, placeholderIndex) => (
                      <View
                        key={`${viewMode}-${folderCardSize}-${item.key}-placeholder-${placeholderIndex}`}
                        pointerEvents="none"
                        style={[
                          styles.folderCardPlaceholder,
                          folderCardLayoutStyle,
                        ]}
                      />
                    ),
                  )}
                </View>
              </View>
            ) : null}
          </View>
        );
      case "file-heading":
        return (
          <View style={styles.section}>
            <SectionHeading count={item.count} title="文件" />
          </View>
        );
      case "file-empty":
        return <EmptyLine text="当前目录没有直接文件" />;
      case "file-group-heading":
        return (
          <View style={styles.sectionHeading}>
            <Text style={styles.fileGroupTitle}>{item.group.day}</Text>
            <Text style={styles.sectionCount}>
              {item.group.addr ? `${item.group.addr} · ` : ""}
              {item.group.list.length} 个文件
            </Text>
          </View>
        );
      case "media-file":
        return (
          <View style={styles.mediaMasonryItem}>
            <FileTile
              authCode={session.tokens.authCode}
              baseUrl={session.serverUrl}
              cacheEnabled={cacheEnabled}
              cacheFolder={cacheFolder}
              cardSize={folderCardSize}
              file={item.file}
              onLongSelect={(nextFile) =>
                toggleSelection(createFileSelectionKey(nextFile))
              }
              onPreviewFile={handlePreviewFile}
              onToggleSelection={(nextFile) =>
                toggleSelection(createFileSelectionKey(nextFile))
              }
              selected={selectedKeys.has(createFileSelectionKey(item.file))}
              selectionMode={selectionMode}
              thumbnailsEnabled
              viewMode={viewMode}
              waterfall
            />
          </View>
        );
      case "normal-file-row":
        return (
          <View style={viewMode === "list" ? styles.fileList : styles.fileGrid}>
            {item.files.map((file) => (
              <FileTile
                authCode={session.tokens.authCode}
                baseUrl={session.serverUrl}
                cacheEnabled={cacheEnabled}
                cacheFolder={cacheFolder}
                cardSize={folderCardSize}
                file={file}
                key={file.id || file.md5 || file.name}
                onLongSelect={(nextFile) =>
                  toggleSelection(createFileSelectionKey(nextFile))
                }
                onPreviewFile={handlePreviewFile}
                onToggleSelection={(nextFile) =>
                  toggleSelection(createFileSelectionKey(nextFile))
                }
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

  const renderDirectoryListItem = ({
    item,
  }: ListRenderItemInfo<DirectoryListItem>) => {
    return renderDirectoryListItemContent(item);
  };

  const renderPreviewChrome = () => (
    <>
      <View style={styles.previewHeader}>
        <Pressable onPress={closePreview} style={styles.previewBackButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.strong} name="close" size={21} />
        </Pressable>
        {!previewIsVideo ? (
          <Pressable
            accessibilityLabel={previewActionLabel}
            disabled={previewActionDisabled}
            onPress={() => void handleTogglePreviewMode()}
            style={[
              styles.previewOriginalAction,
              previewActionDisabled ? styles.previewToolButtonDisabled : null,
            ]}
          >
            <Ionicons
              color={MOBILE_SAGE_SLATE.title}
              name={previewImageShowsOriginal ? "image" : "image-outline"}
              size={16}
            />
            <Text numberOfLines={1} style={styles.previewOriginalActionText}>
              {previewActionLabel}
            </Text>
          </Pressable>
        ) : null}
        <ScrollView
          contentContainerStyle={styles.previewToolbar}
          horizontal
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          style={styles.previewToolbarScroll}
        >
          {previewFile &&
          previewIsVideo &&
          externalVideoPlayer === "infuse" &&
          Platform.OS === "ios" ? (
            <PreviewToolbarButton
              disabled={Boolean(previewBusyAction)}
              icon="open-outline"
              iconElement={renderExternalVideoPlayerIcon(externalVideoPlayer)}
              label="Infuse"
              onPress={() => void handleOpenExternalVideoPlayer(previewFile)}
            />
          ) : null}
          <PreviewToolbarButton
            busy={previewBusyAction === "share"}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="share-social-outline"
            label="分享"
            onPress={() => void handleSharePreviewFile()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === "album"}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="albums-outline"
            label="添加到相册"
            onPress={() => void handleOpenPreviewAlbums()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === "favorite"}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon={previewIsFavorite ? "star" : "star-outline"}
            label={previewIsFavorite ? "取消收藏" : "收藏"}
            onPress={() => void handleTogglePreviewFavorite()}
          />
          <PreviewToolbarButton
            busy={previewBusyAction === "delete"}
            disabled={!previewFile || Boolean(previewBusyAction)}
            icon="trash-outline"
            iconOpacity={0.62}
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
          onClose={() => setPreviewSettingsOpen(false)}
          onToggleMode={() => void handleTogglePreviewMode()}
          videoUsesTranscode={Boolean(
            previewFile &&
            previewIsVideo &&
            !isDirectVideoPreviewSupported(previewFile),
          )}
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

  /**
   * Builds the best playable URL for a video file without depending on preview state from another item.
   */
  const createVideoPlaybackUrlForFile = (
    file: FolderFileSummary,
    authCode = session.tokens.authCode,
  ): string | undefined => {
    const directUrl = createVideoPreviewUrl({
      authCode,
      baseUrl: session.serverUrl,
      id: file.id,
      md5: file.md5,
      type: "direct",
    });
    const transcodeUrl = createVideoPreviewUrl({
      authCode,
      baseUrl: session.serverUrl,
      id: file.id,
      md5: file.md5,
      type: "transcode",
    });

    return getVideoPlaybackUrl(file, directUrl, transcodeUrl);
  };

  /**
   * Builds the original remote video URL for external players that handle their own decoding.
   */
  const createExternalVideoSourceUrl = (
    file: FolderFileSummary,
    authCode?: string,
  ): string | undefined => {
    return createVideoPreviewUrl({
      authCode,
      baseUrl: session.serverUrl,
      id: file.id,
      md5: file.md5,
      type: "direct",
    });
  };

  /**
   * Returns the poster currently used by the gallery item so playback can cover first-frame black flashes.
   */
  const getVideoPosterUriForFile = (
    file: FolderFileSummary,
  ): string | undefined => {
    const galleryItem = previewImageGalleryItems.find(
      (item) =>
        createFileSelectionKey(item.file) === createFileSelectionKey(file),
    );
    const mediaKey = createPreviewMediaKey(file);
    const fileKey = createFileSelectionKey(file);
    const currentFileSelected =
      previewFile && fileKey === createFileSelectionKey(previewFile);
    const currentPosterUri =
      previewVideoPosterUriState?.fileKey === fileKey
        ? previewVideoPosterUriState.uri
        : undefined;

    return currentFileSelected
      ? (currentPosterUri ??
          previewImageActiveUri ??
          previewWarmThumbnailUris[mediaKey] ??
          galleryItem?.uri)
      : (previewWarmThumbnailUris[mediaKey] ?? galleryItem?.uri);
  };

  useEffect(() => {
    if (
      !nativePreviewVideoMounted ||
      !previewFile ||
      !previewFileKey ||
      !previewIsVideo
    ) {
      nativePreviewVideoPreloadRequestRef.current += 1;
      setNativePreviewVideoPlaybackKey(undefined);
      setNativePreviewVideoSourceLabel(undefined);
      setNativePreviewVideoSourceUri(undefined);
      return undefined;
    }

    const remoteSourceUri = createVideoPlaybackUrlForFile(previewFile);
    const preloadRequestId = nativePreviewVideoPreloadRequestRef.current + 1;

    nativePreviewVideoPreloadRequestRef.current = preloadRequestId;
    setNativePreviewVideoPlaybackKey(previewFileKey);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);

    if (!remoteSourceUri || !cacheEnabled) {
      return undefined;
    }

    let cancelled = false;
    const variant = isDirectVideoPreviewSupported(previewFile)
      ? "direct"
      : "transcode";

    /**
     * Preloads only cached videos while the user is browsing the fullscreen gallery.
     */
    const preloadCachedVideoSource = async (): Promise<void> => {
      const cachedUri = await readCachedMobileMediaUri({
        fileId: previewFile.id,
        folder: cacheFolder,
        kind: "video-preview",
        md5: previewFile.md5,
        url: remoteSourceUri,
        variant,
      }).catch(() => undefined);

      if (
        cancelled ||
        nativePreviewVideoPreloadRequestRef.current !== preloadRequestId
      ) {
        return;
      }

      if (cachedUri) {
        setNativePreviewVideoSourceLabel("缓存");
        setNativePreviewVideoSourceUri(cachedUri);
      }
    };

    void preloadCachedVideoSource();

    return () => {
      cancelled = true;
    };
  }, [
    cacheEnabled,
    cacheFolder,
    nativePreviewVideoMounted,
    previewFile,
    previewFileKey,
    previewIsVideo,
  ]);

  /**
   * Resolves a cached video source first, then falls back to the remote preview URL.
   */
  const handleOpenNativePreviewVideo = async (
    file: FolderFileSummary,
  ): Promise<void> => {
    const fileKey = createFileSelectionKey(file);
    const requestId = nativePreviewVideoLoadRequestRef.current + 1;
    const cachedPlaybackSourceReady =
      nativePreviewVideoPlaybackKey === fileKey &&
      nativePreviewVideoSourceLabel === "缓存" &&
      Boolean(nativePreviewVideoSourceUri);

    nativePreviewVideoLoadRequestRef.current = requestId;
    nativePreviewVideoAuthRetryKeyRef.current = undefined;
    setNativePreviewVideoPosterUri(getVideoPosterUriForFile(file));
    setNativePreviewVideoPlaybackKey(fileKey);
    setNativePreviewVideoOpen(true);

    if (cachedPlaybackSourceReady) {
      setNativePreviewVideoRequestKey(undefined);
      return;
    }

    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    setNativePreviewVideoRequestKey(fileKey);

    let authCode: string | undefined;

    try {
      authCode = await ensureMediaAuthCode();
    } catch {
      authCode = undefined;
    }

    if (nativePreviewVideoLoadRequestRef.current !== requestId) {
      return;
    }

    const remoteSourceUri = createVideoPlaybackUrlForFile(file, authCode);

    if (!remoteSourceUri) {
      setNativePreviewVideoOpen(false);
      setNativePreviewVideoPlaybackKey(undefined);
      setNativePreviewVideoRequestKey(undefined);
      showPreviewNotice("当前视频没有可用播放地址");
      return;
    }

    const variant = isDirectVideoPreviewSupported(file)
      ? "direct"
      : "transcode";
    let playbackSourceUri = remoteSourceUri;
    let shouldCachePlaybackSource = false;
    let sourceLabel: PreviewVideoSourceLabel = "接口";
    const cacheParams = {
      fileId: file.id,
      folder: cacheFolder,
      kind: "video-preview" as const,
      md5: file.md5,
      url: remoteSourceUri,
      variant,
    };
    const currentPreviewFileSelected =
      previewFile &&
      createFileSelectionKey(file) === createFileSelectionKey(previewFile);

    if (currentPreviewFileSelected && previewVideoCache.cacheHit) {
      if (previewVideoCache.displayUri) {
        playbackSourceUri = previewVideoCache.displayUri;
        sourceLabel = "缓存";
      }
    } else if (cacheEnabled) {
      const cachedUri = await readCachedMobileMediaUri(cacheParams).catch(
        () => undefined,
      );

      if (nativePreviewVideoLoadRequestRef.current !== requestId) {
        return;
      }

      if (cachedUri) {
        playbackSourceUri = cachedUri;
        sourceLabel = "缓存";
      } else {
        if (currentPreviewFileSelected && previewVideoCache.displayUri) {
          playbackSourceUri = previewVideoCache.displayUri;
        }

        shouldCachePlaybackSource = true;
      }
    } else if (currentPreviewFileSelected && previewVideoCache.displayUri) {
      playbackSourceUri = previewVideoCache.displayUri;
    }

    if (nativePreviewVideoLoadRequestRef.current !== requestId) {
      return;
    }

    if (sourceLabel !== "缓存" && !isDirectVideoPreviewSupported(file)) {
      const transcodeReady = await waitForNativeVideoTranscodeReady(
        file,
        requestId,
      );

      if (nativePreviewVideoLoadRequestRef.current !== requestId) {
        return;
      }

      if (!transcodeReady) {
        setNativePreviewVideoOpen(false);
        setNativePreviewVideoRequestKey(undefined);
        return;
      }
    }

    if (shouldCachePlaybackSource) {
      void cacheMobileMediaResourceFromUrl(cacheParams);
    }

    setNativePreviewVideoSourceLabel(sourceLabel);
    setNativePreviewVideoSourceUri(playbackSourceUri);
  };

  /**
   * Opens the selected video in the configured external player.
   */
  const handleOpenExternalVideoPlayer = async (
    file: FolderFileSummary,
  ): Promise<void> => {
    if (externalVideoPlayer !== "infuse") {
      showPreviewNotice("请先在设置中选择 Infuse 外部播放器");
      return;
    }

    if (Platform.OS !== "ios") {
      showPreviewNotice("Infuse 外部播放当前仅支持 iOS");
      return;
    }

    let authCode: string | undefined;

    try {
      authCode = await ensureMediaAuthCode();
    } catch {
      showPreviewNotice("获取媒体授权失败，请稍后重试");
      return;
    }

    const sourceUrl = createExternalVideoSourceUrl(file, authCode);

    if (!sourceUrl) {
      showPreviewNotice("当前视频没有可用外部播放地址");
      return;
    }

    const infuseUrl = createInfusePlaybackUrl({
      filename: file.name,
      sourceUrl,
    });

    try {
      const canOpenInfuse = await Linking.canOpenURL(INFUSE_URL_SCHEME);

      if (!canOpenInfuse) {
        showPreviewNotice("未检测到 Infuse，请确认已安装");
        return;
      }

      await Linking.openURL(infuseUrl);
    } catch {
      showPreviewNotice("打开 Infuse 失败，请稍后重试");
    }
  };

  /**
   * Marks the source as original only after the zoomable image item commits it.
   */
  const handlePreviewImageSourceCommit = (
    imageIndex: number,
    imageSource: { uri?: string },
  ): void => {
    const transition = previewOriginalTransition;
    const transitionFile = previewImageGalleryItems[imageIndex]?.file;

    if (!transition || !previewFileKey || transition.fileKey !== previewFileKey) {
      return;
    }

    if (
      !transitionFile ||
      createFileSelectionKey(transitionFile) !== transition.fileKey ||
      imageSource.uri !== transition.uri
    ) {
      return;
    }

    previewImageLoadRequestRef.current += 1;
    setPreviewMode("original");
    setPreviewDisplayedImageSource("original");
    setPreviewDisplayedImageUriState({
      fileKey: transition.fileKey,
      uri: transition.uri,
    });
    setPreviewPendingImageSource(undefined);
    setPreviewOriginalTransition(undefined);
  };

  const handlePreviewImageSourceError = (
    imageIndex: number,
    imageSource: { uri?: string },
  ): void => {
    const transition = previewOriginalTransition;
    const transitionFile = previewImageGalleryItems[imageIndex]?.file;

    if (
      !transition ||
      !transitionFile ||
      createFileSelectionKey(transitionFile) !== transition.fileKey ||
      imageSource.uri !== transition.uri
    ) {
      return;
    }

    setPreviewOriginalTransition((current) =>
      current?.token === transition.token ? undefined : current,
    );
    setPreviewPendingImageSource((current) =>
      current === "original" ? undefined : current,
    );
  };

  const renderImagePreviewFooter = (imageIndex: number) => {
    if (previewVideoPlaybackActive) {
      return null;
    }

    const footerFile = previewImageGalleryItems[imageIndex]?.file;
    const footerIsVideo = Boolean(footerFile && isVideoFile(footerFile));

    return (
      <View
        pointerEvents="box-none"
        style={[
          styles.previewImageFooter,
          { paddingBottom: Math.max(24, safeAreaInsets.bottom + 14) },
        ]}
      >
        <View style={styles.previewSourceBadge}>
          {previewPendingImageSource ? (
            <ActivityIndicator color="#e2e8f0" size="small" />
          ) : (
            <Ionicons
              color="#e2e8f0"
              name={footerIsVideo ? "videocam-outline" : "layers-outline"}
              size={13}
            />
          )}
          <Text style={styles.previewSourceBadgeText}>
            {footerIsVideo ? "视频封面" : previewImageSourceBadgeLabel}
          </Text>
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
            <Text style={styles.previewImageHintMeta}>
              左右滑动切换，下滑退出
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Lets the native video surface own the current video item instead of keeping
   * react-native-image-viewing's image layer underneath it.
   */
  const shouldRenderPreviewImageItem = (imageIndex: number): boolean => {
    const itemFile = previewImageGalleryItems[imageIndex]?.file;

    if (!itemFile || !isVideoFile(itemFile) || !nativePreviewVideoMounted) {
      return true;
    }

    return createFileSelectionKey(itemFile) !== previewFileKey;
  };

  /**
   * Stops the native video layer before the carousel starts moving.
   */
  const closeNativePreviewVideoLayer = (): void => {
    nativePreviewVideoLoadRequestRef.current += 1;
    nativePreviewVideoAuthRetryKeyRef.current = undefined;
    setNativePreviewVideoOpen(false);
    setNativePreviewVideoRequestKey(undefined);

    if (nativePreviewVideoSourceLabel !== "缓存") {
      setNativePreviewVideoSourceLabel(undefined);
      setNativePreviewVideoSourceUri(undefined);
    }
  };

  /**
   * Replaces the current native video source with a fresh direct URL.
   */
  const retryNativePreviewVideoWithRemoteSource = async (
    file: FolderFileSummary,
    fileKey: string,
    options: { forceRefreshAuth?: boolean } = {},
  ): Promise<boolean> => {
    const requestId = nativePreviewVideoLoadRequestRef.current + 1;

    nativePreviewVideoLoadRequestRef.current = requestId;
    setNativePreviewVideoPlaybackKey(fileKey);
    setNativePreviewVideoRequestKey(fileKey);

    const authCode = await ensureMediaAuthCode({
      forceRefresh: options.forceRefreshAuth,
    });

    if (nativePreviewVideoLoadRequestRef.current !== requestId) {
      return true;
    }

    const remoteSourceUri = createVideoPlaybackUrlForFile(file, authCode);

    if (!remoteSourceUri) {
      return false;
    }

    setNativePreviewVideoOpen(true);
    setNativePreviewVideoSourceLabel("接口");
    setNativePreviewVideoSourceUri(remoteSourceUri);
    return true;
  };

  /**
   * Falls back from stale cache or stale auth before surfacing native player errors.
   */
  const handleNativePreviewVideoLoadError = async (
    messageText: string,
  ): Promise<void> => {
    const file = previewFile;
    const fileKey = file ? createFileSelectionKey(file) : undefined;

    if (file && fileKey && nativePreviewVideoPlaybackKey === fileKey) {
      if (nativePreviewVideoSourceLabel === "缓存") {
        showPreviewNotice("本地视频缓存不可用，正在切换接口播放");

        if (await retryNativePreviewVideoWithRemoteSource(file, fileKey)) {
          return;
        }
      }

      if (
        nativePreviewVideoSourceLabel === "接口" &&
        isDirectVideoPreviewSupported(file) &&
        nativePreviewVideoAuthRetryKeyRef.current !== fileKey
      ) {
        nativePreviewVideoAuthRetryKeyRef.current = fileKey;
        showPreviewNotice("视频授权已刷新，正在重试播放");

        if (
          await retryNativePreviewVideoWithRemoteSource(file, fileKey, {
            forceRefreshAuth: true,
          })
        ) {
          return;
        }
      }
    }

    setNativePreviewVideoOpen(false);
    setNativePreviewVideoPlaybackKey(undefined);
    setNativePreviewVideoPosterUri(undefined);
    setNativePreviewVideoRequestKey(undefined);
    setNativePreviewVideoSourceLabel(undefined);
    setNativePreviewVideoSourceUri(undefined);
    showPreviewNotice(messageText);
  };

  const renderVideoPreviewOverlay = ({
    imageIndex,
  }: {
    imageIndex: number;
  }) => {
    const overlayFile = previewImageGalleryItems[imageIndex]?.file;
    const overlayFileKey = overlayFile
      ? createFileSelectionKey(overlayFile)
      : undefined;

    if (
      !nativePreviewVideoMounted ||
      !overlayFile ||
      !isVideoFile(overlayFile) ||
      overlayFileKey !== previewFileKey
    ) {
      return null;
    }

    const videoPlayEnabled = !previewInfoVisible;

    return (
      <NativeVideoControlsOverlay
        enhancedPosterUri={nativePreviewVideoPosterUri}
        mounted
        onClose={closeNativePreviewVideoLayer}
        onLoadComplete={() => {
          setNativePreviewVideoRequestKey(undefined);
          setNativePreviewVideoOpen(true);
        }}
        onLoadError={(messageText) => {
          void handleNativePreviewVideoLoadError(messageText);
        }}
        onPlayPress={
          videoPlayEnabled
            ? () => void handleOpenNativePreviewVideo(overlayFile)
            : undefined
        }
        playLoading={
          videoPlayEnabled && nativePreviewVideoRequestKey === previewFileKey
        }
        playbackKey={nativePreviewVideoPlaybackKey ?? previewFileKey}
        posterUri={previewVideoCoverUri}
        sourceLabel={nativePreviewVideoSourceLabel}
        sourceUri={nativePreviewVideoSourceUri}
        visible={nativePreviewVideoOpen}
      />
    );
  };

  const renderImagePreviewHeader = () => {
    if (previewVideoPlaybackActive) {
      return null;
    }

    return (
      <View
        pointerEvents="box-none"
        style={[styles.previewChromeLayer, previewSafeAreaStyle]}
      >
        {renderPreviewChrome()}
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? (
        <Text
          style={[
            styles.message,
            {
              backgroundColor: "#fff",
              borderColor: theme.selection,
              color: theme.hex,
            },
          ]}
        >
          {message}
        </Text>
      ) : null}
      {mediaAuthLoading ? (
        <Text style={styles.hint}>正在准备缩略图权限...</Text>
      ) : null}
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
        contentContainerStyle={folderContentContainerStyle}
        data={directoryListItems}
        drawDistance={DIRECTORY_FLASH_LIST_DRAW_DISTANCE}
        getItemType={getDirectoryListItemType}
        keyExtractor={(item) => item.key}
        masonry={mediaColumnCount > 1}
        numColumns={mediaColumnCount}
        optimizeItemArrangement={false}
        overrideItemLayout={overrideDirectoryItemLayout}
        refreshControl={
          <RefreshControl
            colors={[theme.hex]}
            onRefresh={handleDirectoryRefresh}
            progressBackgroundColor="#fff"
            refreshing={refreshing}
            tintColor={theme.hex}
          />
        }
        renderItem={renderDirectoryListItem}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      <FolderFloatingMenu
        canCreateFolder={currentFolderId !== undefined}
        onOpenConfig={() => {
          setFolderFabOpen(false);
          setConfigDialogOpen(true);
        }}
        onOpenCreateFolder={() => {
          setFolderFabOpen(false);
          openFolderDialog("create");
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
          openFolderDialog("create");
        }}
        onToggleCovers={() => setShowFolderCovers((current) => !current)}
        open={configDialogOpen}
        showCovers={showFolderCovers}
        sortDirection={sortDirection}
        sortField={sortField}
        viewMode={viewMode}
      />

      {previewUsesImageViewer ? (
        <PreviewThumbnailWarmup sources={previewWarmThumbnailSources} />
      ) : null}

      {previewUsesImageViewer ? (
        <ImageView
          animationType="fade"
          backgroundColor="#020617"
          doubleTapToZoomEnabled
          FooterComponent={({ imageIndex }) =>
            renderImagePreviewFooter(imageIndex)
          }
          HeaderComponent={renderImagePreviewHeader}
          imageIndex={previewImageViewerInitialIndex}
          images={previewImageViewerImages}
          keyExtractor={(_image, imageIndex) => {
            const file = previewImageGalleryItems[imageIndex]?.file;

            return `${file?.id ?? imageIndex}-${file?.md5 ?? imageIndex}`;
          }}
          onImageIndexChange={handleImagePreviewIndexChange}
          onImageSourceCommit={handlePreviewImageSourceCommit}
          onImageSourceError={handlePreviewImageSourceError}
          onRequestClose={closePreview}
          onSwipeStart={closeNativePreviewVideoLayer}
          OverlayComponent={renderVideoPreviewOverlay}
          presentationStyle="overFullScreen"
          shouldRenderImageItem={shouldRenderPreviewImageItem}
          swipeToCloseEnabled
          visible={previewUsesImageViewer}
        />
      ) : null}

      <MobileFullscreenModal
        onClose={closePreview}
        visible={Boolean(previewFile && !previewUsesImageViewer)}
      >
        <View
          {...previewPanResponder.panHandlers}
          style={[styles.previewOverlay, previewSafeAreaStyle]}
        >
          {renderPreviewChrome()}
          {previewFile && previewIsVideo ? (
            previewMode === "original" ? (
              <InlineVideoPreview
                onFirstFrame={previewVideoCache.rememberLoadedResource}
                playbackKey={previewFileKey}
                posterUri={previewVideoCoverUri}
                sourceUri={previewVideoCache.displayUri}
              />
            ) : previewVideoCoverUri ? (
              <Image
                onLoad={previewListThumbnailCache.rememberLoadedResource}
                resizeMode="contain"
                source={{ uri: previewVideoCoverUri }}
                style={styles.previewImage}
              />
            ) : (
              <View style={styles.previewFallback}>
                <ActivityIndicator color={theme.hex} />
                <Text style={styles.previewFallbackText}>正在读取视频封面</Text>
              </View>
            )
          ) : previewFile && (previewListThumbnailUrl || previewHdImageUrl) ? (
            previewMode === "original" ? (
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
                onThumbnailLoad={
                  previewListThumbnailCache.rememberLoadedResource
                }
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
          {previewFile &&
          previewIsVideo &&
          previewMode === "original" ? null : (
            <View
              {...previewPanResponder.panHandlers}
              style={styles.previewGestureLayer}
            />
          )}
          {renderPreviewInfoLayer()}
          <View style={styles.previewStepper}>
            <Pressable
              disabled={previewIndex <= 0}
              onPress={() => handleStepPreview(-1)}
              style={[
                styles.previewStepButton,
                previewIndex <= 0 ? styles.disabledButton : null,
              ]}
            >
              <Text style={styles.previewStepText}>‹</Text>
            </Pressable>
            <Text style={styles.previewStepMeta}>
              {previewIndex >= 0
                ? `${previewIndex + 1} / ${previewFiles.length}`
                : "0 / 0"}
            </Text>
            <Pressable
              disabled={
                previewIndex < 0 || previewIndex >= previewFiles.length - 1
              }
              onPress={() => handleStepPreview(1)}
              style={[
                styles.previewStepButton,
                previewIndex < 0 || previewIndex >= previewFiles.length - 1
                  ? styles.disabledButton
                  : null,
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
        busy={previewBusyAction === "album"}
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
            setFolderDialogError("");
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
        currentPath={
          coverDialogDirectory.path ||
          coverDialogTarget?.path ||
          coverDialogTarget?.name ||
          "当前文件夹"
        }
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
          if (submittingAction !== "move") {
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
        selectedSummary={formatSelectionSummary(
          selectedFolders.length,
          selectedFiles.length,
        )}
        submitting={submittingAction === "move"}
        target={moveDialogTarget}
      />
    </View>
  );
};
