import Ionicons from "@expo/vector-icons/Ionicons";
import { useEventListener } from "expo";
import { createVideoPlayer, VideoView } from "expo-video";
import type { VideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { AppStateStatus, ImageStyle, StyleProp } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FileAlbumSummary } from "@kwphoto/core";

import type {
  MobileLocalCacheFolderRef,
  MobileLocalCacheResourceKind,
} from "../../mobile-local-cache";
import { MOBILE_SAGE_SLATE } from "../../mobile-theme";
import { MobileCenterDialog } from "../../components/MobileDialog";
import { useCachedMobileMediaUri } from "../../useCachedMobileMediaUri";
import { styles } from "../folderStyles";

export type PreviewVideoSourceLabel = "接口" | "缓存";

const MIN_RESTORABLE_VIDEO_TIME = 0.35;
const VIDEO_AUTOPLAY_RETRY_DELAYS_MS = [120, 360, 720, 1200, 1800] as const;
const VIDEO_RECENT_PLAYING_WINDOW_MS = 1500;
const VIDEO_POSTER_FADE_DURATION_MS = 140;
const VIDEO_TIME_UPDATE_INTERVAL_SECONDS = 0.25;

/**
 * Creates a video player that is released after this component's own cleanup effects.
 */
const createConfiguredVideoPlayer = (): VideoPlayer => {
  const player = createVideoPlayer(null);

  player.allowsExternalPlayback = false;
  player.loop = false;
  player.timeUpdateEventInterval = VIDEO_TIME_UPDATE_INTERVAL_SECONDS;

  return player;
};

/**
 * Releases the native player only after callers have removed listeners and stopped timers.
 */
const useReleaseVideoPlayerOnUnmount = (player: VideoPlayer): void => {
  useEffect(() => {
    return () => {
      try {
        player.release();
      } catch {
        // The native player can already be gone during fast refresh or native teardown.
      }
    };
  }, [player]);
};

/**
 * Keeps the current video cover visible until the next cover has fully loaded.
 */
const SmoothVideoPoster = ({
  enhancedUri,
  posterKey,
  uri,
}: {
  enhancedUri?: string;
  posterKey?: string;
  uri?: string;
}) => {
  const fadeOpacity = useRef(new Animated.Value(0)).current;
  const pendingUriRef = useRef<string | undefined>(undefined);
  const posterKeyRef = useRef(posterKey);
  const baseUri = uri ?? enhancedUri;
  const nextUri = enhancedUri ?? baseUri;
  const [committedUri, setCommittedUri] = useState(baseUri);
  const [pendingUri, setPendingUri] = useState<string>();

  useEffect(() => {
    if (posterKeyRef.current !== posterKey) {
      posterKeyRef.current = posterKey;
      pendingUriRef.current = undefined;
      fadeOpacity.stopAnimation();
      fadeOpacity.setValue(0);
      setCommittedUri(baseUri);
      setPendingUri(
        nextUri && nextUri !== baseUri ? nextUri : undefined,
      );
      pendingUriRef.current =
        nextUri && nextUri !== baseUri ? nextUri : undefined;
      return;
    }

    if (!committedUri && baseUri) {
      setCommittedUri(baseUri);
      return;
    }

    if (nextUri && nextUri !== committedUri && nextUri !== pendingUriRef.current) {
      pendingUriRef.current = nextUri;
      fadeOpacity.stopAnimation();
      fadeOpacity.setValue(0);
      setPendingUri(nextUri);
    }
  }, [baseUri, committedUri, fadeOpacity, nextUri, posterKey]);

  const handlePendingLoad = useCallback((): void => {
    const loadedUri = pendingUriRef.current;

    if (!loadedUri) {
      return;
    }

    Animated.timing(fadeOpacity, {
      duration: VIDEO_POSTER_FADE_DURATION_MS,
      toValue: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || pendingUriRef.current !== loadedUri) {
        return;
      }

      pendingUriRef.current = undefined;
      setCommittedUri(loadedUri);
      setPendingUri(undefined);
      fadeOpacity.setValue(0);
    });
  }, [fadeOpacity]);

  const handlePendingError = useCallback((): void => {
    pendingUriRef.current = undefined;
    setPendingUri(undefined);
    fadeOpacity.setValue(0);
  }, [fadeOpacity]);

  return (
    <View pointerEvents="none" style={styles.nativeVideoPosterLayer}>
      {committedUri ? (
        <Image
          resizeMode="contain"
          source={{ uri: committedUri }}
          style={styles.nativeVideoPosterImage}
        />
      ) : null}
      {pendingUri ? (
        <Animated.Image
          onError={handlePendingError}
          onLoad={handlePendingLoad}
          resizeMode="contain"
          source={{ uri: pendingUri }}
          style={[
            styles.nativeVideoPosterImage,
            styles.nativeVideoPosterImageOverlay,
            { opacity: fadeOpacity },
          ]}
        />
      ) : null}
    </View>
  );
};

interface ProgressiveImagePreviewProps {
  hdReady: boolean;
  hdSource?: string;
  onHdLoad: () => void;
  onThumbnailLoad: () => void;
  themeColor: string;
  thumbnailSource?: string;
}

/**
 * Renders an image through the mobile file cache before falling back to network.
 */
export const CachedMobileImage = ({
  cacheOnMiss = false,
  cacheEnabled,
  cacheFolder,
  fileId,
  kind,
  md5,
  resizeMode = "cover",
  showSourceOnMiss = true,
  sourceUrl,
  style,
  variant,
}: {
  cacheOnMiss?: boolean;
  cacheEnabled: boolean;
  cacheFolder: MobileLocalCacheFolderRef;
  fileId?: number;
  kind: Exclude<MobileLocalCacheResourceKind, "directory">;
  md5?: string;
  resizeMode?: "center" | "contain" | "cover" | "repeat" | "stretch";
  showSourceOnMiss?: boolean;
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
    showSourceOnMiss,
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
export const PreviewThumbnailWarmup = ({ sources }: { sources: string[] }) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.previewWarmupLayer}>
      {sources.map((uri, index) => (
        <Image
          key={`${uri}-${index}`}
          resizeMode="cover"
          source={{ uri }}
          style={styles.previewWarmupImage}
        />
      ))}
    </View>
  );
};

/**
 * Plays preview videos inside the modal so media never jumps to the system viewer.
 */
export const InlineVideoPreview = ({
  onFirstFrame,
  playbackKey,
  posterUri,
  sourceUri,
}: {
  onFirstFrame: () => void;
  playbackKey?: string;
  posterUri?: string;
  sourceUri?: string;
}) => {
  const [firstFrameRendered, setFirstFrameRendered] = useState(false);
  const player = useMemo(createConfiguredVideoPlayer, []);
  const { capturePlaybackSnapshot, restorePlaybackSnapshot } =
    useVideoPlaybackResume({
      active: Boolean(sourceUri),
      loaded: Boolean(sourceUri),
      playbackKey,
      player,
      sourceUri,
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
        capturePlaybackSnapshot({ pause: true });
        safelyPausePlayer();
      };
    }

    void player
      .replaceAsync(sourceUri)
      .then(() => {
        if (!cancelled) {
          restorePlaybackSnapshot({ requireLoaded: false });

          try {
            player.pause();
          } catch {
            // Playback may fail if the preview was closed while the source was loading.
          }
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      capturePlaybackSnapshot({ pause: true });
      safelyPausePlayer();
    };
  }, [capturePlaybackSnapshot, player, restorePlaybackSnapshot, sourceUri]);

  useReleaseVideoPlayerOnUnmount(player);

  if (!sourceUri) {
    return (
      <View pointerEvents="none" style={styles.previewFallback}>
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
          <Image
            resizeMode="contain"
            source={{ uri: posterUri }}
            style={styles.previewVideoPosterImage}
          />
        </View>
      ) : null}
    </View>
  );
};

/**
 * Plays a prepared video source over the fullscreen preview without leaving the app.
 */
export const NativeVideoControlsOverlay = ({
  enhancedPosterUri,
  mounted,
  onClose,
  onLoadComplete,
  onLoadError,
  onPlayPress,
  playLoading,
  playbackKey,
  posterUri,
  sourceLabel,
  sourceUri,
  visible,
}: {
  enhancedPosterUri?: string;
  mounted: boolean;
  onClose: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (messageText: string) => void;
  onPlayPress?: () => void;
  playLoading?: boolean;
  playbackKey?: string;
  posterUri?: string;
  sourceLabel?: PreviewVideoSourceLabel;
  sourceUri?: string;
  visible: boolean;
}) => {
  const safeAreaInsets = useSafeAreaInsets();
  const [nativeFirstFrameRendered, setNativeFirstFrameRendered] =
    useState(false);
  const [nativeLoadError, setNativeLoadError] = useState("");
  const [nativeLoadedSourceUri, setNativeLoadedSourceUri] = useState<string>();
  const [nativePlaybackStarted, setNativePlaybackStarted] = useState(false);
  const [nativePlaying, setNativePlaying] = useState(false);
  const nativeAutoplayTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const nativePlaybackRevealTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onLoadErrorRef = useRef(onLoadError);
  const playLoadingRef = useRef(Boolean(playLoading));
  const visibleRef = useRef(visible);
  const nativePlayer = useMemo(createConfiguredVideoPlayer, []);
  const { capturePlaybackSnapshot, restorePlaybackSnapshot } =
    useVideoPlaybackResume({
      active: Boolean(sourceUri),
      loaded: Boolean(sourceUri && nativeLoadedSourceUri === sourceUri),
      playbackKey,
      player: nativePlayer,
      sourceUri,
    });
  const nativeSourceReady = Boolean(
    sourceUri && nativeLoadedSourceUri === sourceUri,
  );
  const nativeReadyToReveal = nativeFirstFrameRendered && nativePlaybackStarted;
  const nativePreparing = !nativeSourceReady || (visible && !nativeReadyToReveal);
  const nativePosterVisible = Boolean(
    (posterUri || enhancedPosterUri) && (!visible || !nativeReadyToReveal),
  );

  const clearNativeAutoplayTimers = useCallback((): void => {
    nativeAutoplayTimersRef.current.forEach((timer) => clearTimeout(timer));
    nativeAutoplayTimersRef.current = [];
  }, []);

  const clearNativePlaybackRevealTimer = useCallback((): void => {
    if (nativePlaybackRevealTimerRef.current) {
      clearTimeout(nativePlaybackRevealTimerRef.current);
      nativePlaybackRevealTimerRef.current = undefined;
    }
  }, []);

  /**
   * Reveals native video only after playback is actually advancing.
   */
  const markNativePlaybackStarted = useCallback((): void => {
    clearNativePlaybackRevealTimer();
    setNativePlaybackStarted(true);
  }, [clearNativePlaybackRevealTimer]);

  /**
   * Starts playback as soon as the native source is ready while the parent opens controls.
   */
  const completeNativeLoadIfRequested = useCallback((): void => {
    if (visibleRef.current || playLoadingRef.current) {
      playVideoPlayer(nativePlayer);
      onLoadCompleteRef.current?.();
    }
  }, [nativePlayer]);

  useEventListener(nativePlayer, "playingChange", ({ isPlaying }) => {
    setNativePlaying(isPlaying);

    if (isPlaying) {
      clearNativeAutoplayTimers();

      nativePlaybackRevealTimerRef.current = setTimeout(() => {
        if (
          visibleRef.current &&
          getVideoPlayerCurrentTime(nativePlayer) > 0.05
        ) {
          markNativePlaybackStarted();
        }
      }, 700);
    }
  });

  useEventListener(nativePlayer, "timeUpdate", ({ currentTime }) => {
    if (
      visibleRef.current &&
      nativeLoadedSourceUri === sourceUri &&
      normalizeVideoTime(currentTime) > 0.05
    ) {
      markNativePlaybackStarted();
    }
  });

  useEventListener(nativePlayer, "statusChange", ({ status }) => {
    if (status === "error") {
      const messageText = "视频加载失败，请稍后重试";

      setNativeLoadError(messageText);
      clearNativeAutoplayTimers();
      onLoadErrorRef.current?.(messageText);
      return;
    }

    if (status === "readyToPlay" && sourceUri) {
      setNativeLoadedSourceUri(sourceUri);
      completeNativeLoadIfRequested();
    }
  });

  /**
   * Replays auto-play a few times because native views can attach after the loaded event.
   */
  const requestNativeAutoplay = useCallback((): void => {
    clearNativeAutoplayTimers();

    const playIfStillVisible = (): void => {
      if (!visible || !sourceUri || nativeLoadedSourceUri !== sourceUri) {
        return;
      }

      playVideoPlayer(nativePlayer);
    };

    nativeAutoplayTimersRef.current = VIDEO_AUTOPLAY_RETRY_DELAYS_MS.map((delay) =>
      setTimeout(playIfStillVisible, delay),
    );
    playIfStillVisible();
  }, [
    clearNativeAutoplayTimers,
    nativeLoadedSourceUri,
    nativePlayer,
    sourceUri,
    visible,
  ]);

  useEffect(() => {
    onLoadCompleteRef.current = onLoadComplete;
    onLoadErrorRef.current = onLoadError;
  }, [onLoadComplete, onLoadError]);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    playLoadingRef.current = Boolean(playLoading);
  }, [playLoading]);

  useEffect(() => {
    let cancelled = false;

    if (!sourceUri) {
      capturePlaybackSnapshot({ pause: true });
      setNativeFirstFrameRendered(false);
      setNativeLoadedSourceUri(undefined);
      setNativeLoadError("");
      setNativePlaybackStarted(false);
      setNativePlaying(false);
      clearNativePlaybackRevealTimer();

      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the modal is closing.
      }
      return undefined;
    }

    setNativeLoadError("");
    setNativeFirstFrameRendered(false);
    setNativePlaybackStarted(false);
    setNativePlaying(false);
    clearNativePlaybackRevealTimer();

    void nativePlayer
      .replaceAsync(sourceUri)
      .then(() => {
        if (!cancelled) {
          setNativeLoadedSourceUri(sourceUri);
          restorePlaybackSnapshot({ requireLoaded: false });
          completeNativeLoadIfRequested();
        }
      })
      .catch(() => {
        if (!cancelled) {
          const messageText = "视频加载失败，请稍后重试";

          setNativeLoadError(messageText);
          onLoadErrorRef.current?.(messageText);
        }
      });

    return () => {
      cancelled = true;
      capturePlaybackSnapshot({ pause: true });
      clearNativePlaybackRevealTimer();

      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the modal is closing.
      }
    };
  }, [
    capturePlaybackSnapshot,
    clearNativePlaybackRevealTimer,
    completeNativeLoadIfRequested,
    nativePlayer,
    restorePlaybackSnapshot,
    sourceUri,
  ]);

  useEffect(() => {
    if (!visible || !sourceUri || nativeLoadedSourceUri !== sourceUri) {
      clearNativeAutoplayTimers();

      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the overlay is hidden.
      }
      return;
    }

    try {
      const restored = restorePlaybackSnapshot({ resume: true });

      if (!restored || !isVideoPlayerPlaying(nativePlayer)) {
        requestNativeAutoplay();
      }
    } catch {
      // Playback can fail if the source was replaced while the overlay was opening.
    }
  }, [
    clearNativeAutoplayTimers,
    nativeLoadedSourceUri,
    nativePlayer,
    requestNativeAutoplay,
    restorePlaybackSnapshot,
    sourceUri,
    visible,
  ]);

  useEffect(() => {
    if (visible && nativeSourceReady && !nativePlaying && !nativeLoadError) {
      requestNativeAutoplay();
    }
  }, [
    nativeLoadError,
    nativePlaying,
    nativeSourceReady,
    requestNativeAutoplay,
    visible,
  ]);

  useEffect(() => {
    return () => {
      clearNativeAutoplayTimers();
      clearNativePlaybackRevealTimer();
    };
  }, [clearNativeAutoplayTimers, clearNativePlaybackRevealTimer]);

  useReleaseVideoPlayerOnUnmount(nativePlayer);

  if (!mounted) {
    return null;
  }

  return (
    <View
      collapsable={false}
      pointerEvents="auto"
      style={[
        styles.nativeVideoPlayerOverlay,
        nativePreparing
          ? styles.nativeVideoPlayerOverlayPreparing
          : null,
        !visible ? styles.nativeVideoPlayerOverlayIdle : null,
      ]}
    >
      <VideoView
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls={visible}
        onFirstFrameRender={() => setNativeFirstFrameRendered(true)}
        player={nativePlayer}
        surfaceType="textureView"
        style={[
          styles.nativeVideoPlayer,
          !nativeSourceReady ? styles.nativeVideoPlayerHidden : null,
        ]}
      />
      {nativePosterVisible ? (
        <SmoothVideoPoster
          enhancedUri={enhancedPosterUri}
          posterKey={playbackKey}
          uri={posterUri}
        />
      ) : null}
      {!visible && onPlayPress ? (
        <View pointerEvents="box-none" style={styles.previewPosterActionStack}>
          <Pressable
            accessibilityLabel="播放视频"
            disabled={playLoading}
            onPress={onPlayPress}
            style={[
              styles.previewPosterPlayButton,
              playLoading ? styles.previewPosterPlayButtonLoading : null,
            ]}
          >
            {playLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons color="#fff" name="play" size={30} />
            )}
          </Pressable>
        </View>
      ) : null}
      {visible && nativePreparing && !nativeLoadError ? (
        <View pointerEvents="none" style={styles.nativeVideoLoadingLayer}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.nativeVideoLoadingText}>
            {sourceUri ? "正在加载视频" : "正在准备播放地址"}
          </Text>
        </View>
      ) : null}
      {visible && sourceLabel ? (
        <View
          pointerEvents="none"
          style={[
            styles.nativeVideoSourceBadge,
            { bottom: Math.max(92, safeAreaInsets.bottom + 76) },
          ]}
        >
          <Text style={styles.nativeVideoSourceBadgeText}>{sourceLabel}</Text>
        </View>
      ) : null}
      {visible && nativeLoadError ? (
        <View pointerEvents="none" style={styles.nativeVideoLoadingLayer}>
          <Ionicons color="#fff" name="alert-circle-outline" size={24} />
          <Text style={styles.nativeVideoLoadingText}>{nativeLoadError}</Text>
        </View>
      ) : null}
      {visible ? (
        <Pressable
          accessibilityLabel="关闭视频播放器"
          onPress={onClose}
          style={[
            styles.nativeVideoCloseButton,
            styles.nativeVideoCloseButtonSide,
          ]}
        >
          <Ionicons color="#fff" name="close" size={22} />
        </Pressable>
      ) : null}
    </View>
  );
};

interface VideoPlaybackResumeOptions {
  active: boolean;
  loaded: boolean;
  playbackKey?: string;
  player: VideoPlayer;
  sourceUri?: string;
}

interface VideoPlaybackSnapshot {
  playbackKey: string;
  position: number;
  shouldResume: boolean;
}

/**
 * Preserves native video progress across app backgrounding and same-video source reloads.
 */
const useVideoPlaybackResume = ({
  active,
  loaded,
  playbackKey,
  player,
  sourceUri,
}: VideoPlaybackResumeOptions): {
  capturePlaybackSnapshot: (options?: { pause?: boolean }) => void;
  restorePlaybackSnapshot: (options?: { requireLoaded?: boolean; resume?: boolean }) => boolean;
} => {
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastPlayingAtRef = useRef(0);
  const latestPlayingRef = useRef(false);
  const latestPositionRef = useRef(0);
  const restoreTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const snapshotRef = useRef<VideoPlaybackSnapshot | undefined>(undefined);
  const activePlaybackKey = playbackKey ?? sourceUri;

  const clearRestoreTimers = useCallback((): void => {
    restoreTimersRef.current.forEach((timer) => clearTimeout(timer));
    restoreTimersRef.current = [];
  }, []);

  useEventListener(player, "timeUpdate", ({ currentTime }) => {
    if (!active || !activePlaybackKey || !sourceUri) {
      return;
    }

    const nextPosition = normalizeVideoTime(currentTime);

    if (nextPosition > 0) {
      latestPositionRef.current = nextPosition;
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying }) => {
    if (isPlaying) {
      lastPlayingAtRef.current = Date.now();
    }

    if (appStateRef.current === "active") {
      latestPlayingRef.current = isPlaying;

      if (!isPlaying) {
        clearRestoreTimers();
      }
    }
  });

  /**
   * Applies a saved position and optional resume command without forcing stale seeks.
   */
  const applyPlaybackSnapshot = useCallback((
    snapshot: VideoPlaybackSnapshot,
    options: { resume?: boolean } = {},
  ): void => {
    if (snapshot.position > MIN_RESTORABLE_VIDEO_TIME) {
      const currentPosition = getVideoPlayerCurrentTime(player);

      if (Math.abs(currentPosition - snapshot.position) > 0.25) {
        seekVideoPlayer(player, snapshot.position);
      }
    }

    if (options.resume && snapshot.shouldResume && !isVideoPlayerPlaying(player)) {
      playVideoPlayer(player);
    }
  }, [player]);

  /**
   * Retries restore briefly because native players can report ready before seek/play is accepted.
   */
  const schedulePlaybackRestoreRetries = useCallback((
    snapshot: VideoPlaybackSnapshot,
    options: { resume?: boolean } = {},
  ): void => {
    clearRestoreTimers();
    restoreTimersRef.current = VIDEO_AUTOPLAY_RETRY_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        const currentSnapshot = snapshotRef.current;

        if (
          !active ||
          !activePlaybackKey ||
          currentSnapshot?.playbackKey !== snapshot.playbackKey
        ) {
          return;
        }

        applyPlaybackSnapshot(snapshot, options);
      }, delay),
    );
  }, [
    active,
    activePlaybackKey,
    applyPlaybackSnapshot,
    clearRestoreTimers,
  ]);

  const capturePlaybackSnapshot = useCallback((options: { pause?: boolean } = {}): void => {
    if (!active || !activePlaybackKey || !sourceUri) {
      return;
    }

    clearRestoreTimers();

    const previousSnapshot = snapshotRef.current;

    if (appStateRef.current !== "active" && previousSnapshot?.playbackKey === activePlaybackKey) {
      if (options.pause) {
        pauseVideoPlayer(player);
      }

      return;
    }

    const currentPosition = getVideoPlayerCurrentTime(player);
    const latestPosition = latestPositionRef.current;
    const position = currentPosition > 0
      ? currentPosition
      : latestPosition > 0
        ? latestPosition
      : previousSnapshot?.playbackKey === activePlaybackKey
        ? previousSnapshot.position
        : 0;

    snapshotRef.current = {
      playbackKey: activePlaybackKey,
      position,
      shouldResume:
        isVideoPlayerPlaying(player) ||
        latestPlayingRef.current ||
        Date.now() - lastPlayingAtRef.current < VIDEO_RECENT_PLAYING_WINDOW_MS,
    };

    if (options.pause) {
      pauseVideoPlayer(player);
    }
  }, [active, activePlaybackKey, clearRestoreTimers, player, sourceUri]);

  const restorePlaybackSnapshot = useCallback((options: { requireLoaded?: boolean; resume?: boolean } = {}): boolean => {
    const requireLoaded = options.requireLoaded ?? true;

    if ((requireLoaded && !loaded) || !activePlaybackKey || !sourceUri) {
      return false;
    }

    const snapshot = snapshotRef.current;

    if (!snapshot || snapshot.playbackKey !== activePlaybackKey) {
      return false;
    }

    if (options.resume) {
      schedulePlaybackRestoreRetries(snapshot, options);
    }

    applyPlaybackSnapshot(snapshot, options);

    return true;
  }, [
    activePlaybackKey,
    applyPlaybackSnapshot,
    loaded,
    schedulePlaybackRestoreRetries,
    sourceUri,
  ]);

  useEffect(() => {
    if (!activePlaybackKey || !sourceUri) {
      latestPlayingRef.current = false;
      latestPositionRef.current = 0;
      clearRestoreTimers();
      return;
    }

    const snapshot = snapshotRef.current;

    latestPositionRef.current =
      snapshot?.playbackKey === activePlaybackKey ? snapshot.position : 0;
    latestPlayingRef.current = isVideoPlayerPlaying(player);
  }, [activePlaybackKey, clearRestoreTimers, player, sourceUri]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const previousAppState = appStateRef.current;
      const returningToForeground =
        /inactive|background/.test(previousAppState) && nextAppState === "active";

      if (nextAppState !== "active") {
        capturePlaybackSnapshot({ pause: true });
      }

      appStateRef.current = nextAppState;

      if (returningToForeground) {
        restorePlaybackSnapshot({ resume: true });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [capturePlaybackSnapshot, restorePlaybackSnapshot]);

  useEffect(() => clearRestoreTimers, [clearRestoreTimers]);

  return {
    capturePlaybackSnapshot,
    restorePlaybackSnapshot,
  };
};

const getVideoPlayerCurrentTime = (player: VideoPlayer): number => {
  try {
    return normalizeVideoTime(player.currentTime);
  } catch {
    return 0;
  }
};

const isVideoPlayerPlaying = (player: VideoPlayer): boolean => {
  try {
    return player.playing;
  } catch {
    return false;
  }
};

const pauseVideoPlayer = (player: VideoPlayer): void => {
  try {
    player.pause();
  } catch {
    // Native player may be detached while the app is transitioning between states.
  }
};

const playVideoPlayer = (player: VideoPlayer): void => {
  try {
    player.play();
  } catch {
    // Native player may still be reconnecting after the app returns to foreground.
  }
};

const seekVideoPlayer = (player: VideoPlayer, position: number): void => {
  try {
    player.currentTime = position;
  } catch {
    // Some native sources reject seeks until they have finished reloading.
  }
};

const normalizeVideoTime = (time: number): number => {
  return Number.isFinite(time) && time > 0 ? time : 0;
};

/**
 * Keeps the first fullscreen paint consistent with the list thumbnail, then swaps in HD preview after load.
 */
export const ProgressiveImagePreview = ({
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
        <View
          style={[styles.previewImageLayer, styles.previewImageLayerFallback]}
        >
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
            hdReady
              ? styles.previewImageLayerVisible
              : styles.previewImageLayerHidden,
          ]}
        />
      ) : null}
      {!hdReady ? (
        <View pointerEvents="none" style={styles.previewUpgradeBadge}>
          <ActivityIndicator color="#fff" size="small" />
          <Text style={styles.previewUpgradeBadgeText}>
            {hdSource ? "高清预览加载中" : "正在获取高清预览"}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Shows all available albums and lets the caller toggle the preview file membership.
 */
export const PreviewAlbumDialog = ({
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
          <Text style={styles.dialogDescription}>
            与官方预览中的相册选择逻辑一致。
          </Text>
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.previewAlbumList}
      >
        {albums.map((album) => {
          const included = albumIds.includes(album.id);

          return (
            <Pressable
              disabled={busy}
              key={album.id}
              onPress={() => onToggleAlbum(album)}
              style={[
                styles.previewAlbumRow,
                included ? styles.previewAlbumRowActive : null,
              ]}
            >
              <View
                style={[
                  styles.previewAlbumRowIcon,
                  included ? styles.previewAlbumRowIconActive : null,
                ]}
              >
                <Ionicons
                  color={included ? "#fff" : MOBILE_SAGE_SLATE.muted}
                  name={included ? "checkmark" : "albums-outline"}
                  size={18}
                />
              </View>
              <View style={styles.previewAlbumRowCopy}>
                <Text style={styles.previewAlbumRowTitle}>{album.name}</Text>
                <Text style={styles.previewAlbumRowMeta}>
                  {album.count ?? 0} 个文件
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </MobileCenterDialog>
  );
};
