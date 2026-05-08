import Ionicons from "@expo/vector-icons/Ionicons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { ImageStyle, StyleProp } from "react-native";
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

    void player
      .replaceAsync(sourceUri)
      .then(() => {
        if (!cancelled) {
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
      safelyPausePlayer();
    };
  }, [player, sourceUri]);

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
  onClose,
  onLoadComplete,
  onLoadError,
  posterUri,
  sourceLabel,
  sourceUri,
  visible,
}: {
  onClose: () => void;
  onLoadComplete?: () => void;
  onLoadError?: (messageText: string) => void;
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
  const onLoadCompleteRef = useRef(onLoadComplete);
  const onLoadErrorRef = useRef(onLoadError);
  const nativePlayer = useVideoPlayer(null, (createdPlayer) => {
    createdPlayer.allowsExternalPlayback = false;
    createdPlayer.loop = false;
  });

  useEffect(() => {
    onLoadCompleteRef.current = onLoadComplete;
    onLoadErrorRef.current = onLoadError;
  }, [onLoadComplete, onLoadError]);

  useEffect(() => {
    let cancelled = false;

    if (!sourceUri) {
      setNativeFirstFrameRendered(false);
      setNativeLoadedSourceUri(undefined);
      setNativeLoadError("");

      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the modal is closing.
      }
      return undefined;
    }

    setNativeLoadError("");
    setNativeFirstFrameRendered(false);

    void nativePlayer
      .replaceAsync(sourceUri)
      .then(() => {
        if (!cancelled) {
          setNativeLoadedSourceUri(sourceUri);
          onLoadCompleteRef.current?.();
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

      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the modal is closing.
      }
    };
  }, [nativePlayer, sourceUri]);

  useEffect(() => {
    if (!visible || !sourceUri || nativeLoadedSourceUri !== sourceUri) {
      try {
        nativePlayer.pause();
      } catch {
        // Native player may already be detached while the overlay is hidden.
      }
      return;
    }

    try {
      nativePlayer.play();
    } catch {
      // Playback can fail if the source was replaced while the overlay was opening.
    }
  }, [nativeLoadedSourceUri, nativePlayer, sourceUri, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.nativeVideoPlayerOverlay,
        !nativeFirstFrameRendered
          ? styles.nativeVideoPlayerOverlayPreparing
          : null,
      ]}
    >
      {sourceUri ? (
        <VideoView
          contentFit="contain"
          fullscreenOptions={{ enable: true }}
          nativeControls
          onFirstFrameRender={() => setNativeFirstFrameRendered(true)}
          player={nativePlayer}
          style={[
            styles.nativeVideoPlayer,
            !nativeFirstFrameRendered ? styles.nativeVideoPlayerHidden : null,
          ]}
        />
      ) : null}
      {posterUri && !nativeFirstFrameRendered ? (
        <View pointerEvents="none" style={styles.nativeVideoPosterLayer}>
          <Image
            resizeMode="contain"
            source={{ uri: posterUri }}
            style={styles.nativeVideoPosterImage}
          />
        </View>
      ) : null}
      {sourceLabel ? (
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
      {nativeLoadError ? (
        <View pointerEvents="none" style={styles.nativeVideoLoadingLayer}>
          <Ionicons color="#fff" name="alert-circle-outline" size={24} />
          <Text style={styles.nativeVideoLoadingText}>{nativeLoadError}</Text>
        </View>
      ) : null}
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
    </View>
  );
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
