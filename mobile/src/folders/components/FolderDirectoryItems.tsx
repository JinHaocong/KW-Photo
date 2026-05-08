import Ionicons from "@expo/vector-icons/Ionicons";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { Image, Pressable, Text, View } from "react-native";
import type { ImageStyle, ViewStyle } from "react-native";

import type {
  FolderFileGroup,
  FolderFileSummary,
  FolderSummary,
} from "@kwphoto/core";
import { createThumbnailUrl } from "@kwphoto/core";

import type {
  MobileFolderCardSize,
  MobileFolderViewMode,
} from "../../mobile-storage";
import type { MobileLocalCacheFolderRef } from "../../mobile-local-cache";
import { createMobileLocalCacheFolderRef } from "../../mobile-local-cache";
import { MOBILE_SAGE_SLATE, useMobileTheme } from "../../mobile-theme";
import { MobileCenterDialog } from "../../components/MobileDialog";
import { useCachedMobileMediaUri } from "../../useCachedMobileMediaUri";
import {
  LONG_PRESS_DELAY_MS,
  MAX_FOLDER_COVER_COUNT,
} from "../folderConstants";
import type { DirectorySelectionKey } from "../folderTypes";
import {
  buildMediaWaterfallColumns,
  createFileSelectionKey,
  createFileThumbnailKey,
  getLoadedImageAspectRatio,
  getMediaAspectRatio,
  getMediaPlaceholderAspectRatio,
  getMediaWaterfallColumnCount,
  isMediaFile,
  isVideoFile,
} from "../folderUtils";
import { styles } from "../folderStyles";
import { CachedMobileImage } from "./PreviewMedia";

/**
 * Renders one folder card including cached cover collage, selection state, and row actions.
 */
export const FolderCard = ({
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
        .filter((item): item is { md5: string; url: string } =>
          Boolean(item.url),
        )
    : [];
  const contentCount = folder.childCount + folder.fileCount + folder.trashCount;
  const isListMode = viewMode === "list";
  const shouldMergeFolderMeta = isListMode || cardSize === "large";
  const showFolderPath = isListMode || cardSize !== "small";
  const showFolderMeta = cardSize !== "small" || isListMode;
  const showCoverIcon = !thumbnailsEnabled || coverItems.length === 0;
  const folderPathLines = cardSize === "large" ? 2 : 1;
  const folderCoverIconSize = isListMode
    ? cardSize === "large"
      ? 19
      : cardSize === "small"
        ? 13
        : 16
    : cardSize === "large"
      ? 26
      : cardSize === "small"
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
        isListMode && cardSize === "small"
          ? styles.smallListFolderCardFrame
          : null,
        isListMode && cardSize === "medium"
          ? styles.mediumListFolderCardFrame
          : null,
        isListMode && cardSize === "large"
          ? styles.largeListFolderCardFrame
          : null,
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
            selected
              ? { backgroundColor: theme.hex, borderColor: theme.hex }
              : null,
          ]}
        >
          <Text style={styles.selectionToggleText}>{selected ? "✓" : ""}</Text>
        </Pressable>
      ) : null}
      <View
        style={[
          styles.folderCover,
          styles[`${cardSize}FolderCover`],
          isListMode ? styles.listFolderCover : null,
          isListMode ? styles[`${cardSize}ListFolderCover`] : null,
          { backgroundColor: coverBackgroundColor },
        ]}
      >
        {showCoverIcon ? (
          <View
            style={[
              styles.folderCoverIcon,
              cardSize === "small" ? styles.smallFolderCoverIcon : null,
              cardSize === "large" ? styles.largeFolderCoverIcon : null,
              isListMode ? styles.listFolderCoverIcon : null,
              isListMode && cardSize === "small"
                ? styles.smallListFolderCoverIcon
                : null,
              isListMode && cardSize === "large"
                ? styles.largeListFolderCoverIcon
                : null,
            ]}
          >
            <Ionicons
              color="#fff"
              name="folder-outline"
              size={folderCoverIconSize}
            />
          </View>
        ) : null}
        <Text
          style={[
            styles.folderCount,
            cardSize === "small" ? styles.smallFolderCount : null,
          ]}
        >
          {contentCount}
        </Text>
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
                showSourceOnMiss={false}
                sourceUrl={thumbnailsEnabled ? item.url : undefined}
                style={[
                  styles.folderCoverImage,
                  getMobileCoverImageLayoutStyle(
                    index,
                    visibleCoverItems.length,
                  ),
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
            cardSize === "small" ? styles.smallFolderCardTitle : null,
            cardSize === "large" ? styles.largeFolderCardTitle : null,
          ]}
        >
          {folder.name}
        </Text>
        {showFolderPath ? (
          <Text
            numberOfLines={folderPathLines}
            style={[
              styles.folderCardPath,
              cardSize === "large" ? styles.largeFolderCardPath : null,
            ]}
          >
            {folder.path}
          </Text>
        ) : null}
        <View style={styles.folderStatusLine}>
          <View style={styles.folderStatusMain}>
            {folder.trashCount > 0 ? (
              <Text
                style={[
                  styles.tag,
                  styles.themeTag,
                  { backgroundColor: theme.selection, color: theme.hex },
                ]}
              >
                {folder.trashCount} 回收
              </Text>
            ) : null}
            {shouldMergeFolderMeta ? (
              <View style={[styles.folderMeta, styles.folderMetaInline]}>
                <Text style={styles.folderMetaText}>
                  {folder.childCount} 个子文件夹
                </Text>
                <Text style={styles.folderMetaText}>
                  {folder.fileCount} 个文件
                </Text>
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
            <Text
              style={[
                styles.folderActionsToggleText,
                actionsOpen ? { color: theme.hex } : null,
              ]}
            >
              ⋯
            </Text>
          </Pressable>
        </View>
        <MobileCenterDialog
          backdropStyle={styles.folderActionSheetOverlay}
          contentStyle={styles.folderActionSheet}
          onClose={() => setActionsOpen(false)}
          visible={actionsOpen}
        >
          <View style={styles.folderActionSheetHeader}>
            <Text numberOfLines={1} style={styles.folderActionSheetTitle}>
              {folder.name}
            </Text>
            <Pressable
              onPress={() => setActionsOpen(false)}
              style={styles.folderActionSheetClose}
            >
              <Ionicons
                color={MOBILE_SAGE_SLATE.muted}
                name="close"
                size={18}
              />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              setActionsOpen(false);
              onRename();
            }}
            style={({ pressed }) => [
              styles.folderActionSheetButton,
              pressed
                ? { backgroundColor: theme.selection, borderColor: theme.hex }
                : null,
            ]}
          >
            <View
              style={[
                styles.folderActionSheetIcon,
                { backgroundColor: theme.selection },
              ]}
            >
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
              pressed
                ? { backgroundColor: theme.selection, borderColor: theme.hex }
                : null,
            ]}
          >
            <View
              style={[
                styles.folderActionSheetIcon,
                { backgroundColor: theme.selection },
              ]}
            >
              <Ionicons color={theme.hex} name="image-outline" size={17} />
            </View>
            <Text style={styles.folderActionSheetButtonText}>设封面</Text>
          </Pressable>
        </MobileCenterDialog>
        {showFolderMeta && !shouldMergeFolderMeta ? (
          <View style={styles.folderMeta}>
            <Text style={styles.folderMetaText}>
              {folder.childCount} 个子文件夹
            </Text>
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
const getMobileCoverImageLayoutStyle = (
  imageIndex: number,
  imageCount: number,
): ImageStyle => {
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

/**
 * Renders one dated file group with media arranged in waterfall columns.
 */
export const FileGroupPreview = ({
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
  const mediaColumns = buildMediaWaterfallColumns(
    mediaFiles,
    getMediaWaterfallColumnCount(cardSize),
  );

  return (
    <View style={styles.fileGroup}>
      <View style={styles.sectionHeading}>
        <Text style={styles.fileGroupTitle}>{group.day}</Text>
        <Text style={styles.sectionCount}>
          {group.addr ? `${group.addr} · ` : ""}
          {group.list.length} 个文件
        </Text>
      </View>
      {mediaFiles.length > 0 ? (
        <View style={styles.mediaWaterfall}>
          {mediaColumns.map((column, index) => (
            <View
              key={`${group.day}-media-column-${index}`}
              style={styles.mediaWaterfallColumn}
            >
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
                  thumbnailsEnabled={loadedThumbnailKeys.has(
                    createFileThumbnailKey(file),
                  )}
                  viewMode={viewMode}
                  waterfall
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}
      {normalFiles.length > 0 ? (
        <View style={viewMode === "list" ? styles.fileList : styles.fileGrid}>
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
              thumbnailsEnabled={loadedThumbnailKeys.has(
                createFileThumbnailKey(file),
              )}
              viewMode={viewMode}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

/**
 * Renders one file tile with cached thumbnail loading and optional media aspect-ratio stabilization.
 */
export const FileTile = ({
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
    type: "h220",
  });
  const thumbnailCache = useCachedMobileMediaUri({
    cacheOnMiss: true,
    enabled: cacheEnabled && thumbnailsEnabled,
    fileId: file.id,
    folder: cacheFolder,
    kind: "file-thumbnail",
    md5: file.md5,
    sourceUrl: thumbnailsEnabled ? thumbnailUrl : undefined,
    variant: "h220",
  });
  const [loadedThumbnailAspectRatio, setLoadedThumbnailAspectRatio] = useState<
    number | undefined
  >();
  const isListMode = !waterfall && viewMode === "list";
  const isMediaFileItem = isMediaFile(file);
  const mediaAspectRatio =
    getMediaAspectRatio(file) ??
    loadedThumbnailAspectRatio ??
    getMediaPlaceholderAspectRatio(file);
  const showFileInfo = !isMediaFileItem;
  const handleThumbnailLoad = useCallback<
    NonNullable<ComponentProps<typeof Image>["onLoad"]>
  >(
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
        isListMode && cardSize === "small"
          ? styles.smallListFileCardFrame
          : null,
        isListMode && cardSize === "medium"
          ? styles.mediumListFileCardFrame
          : null,
        isListMode && cardSize === "large"
          ? styles.largeListFileCardFrame
          : null,
        selected && !waterfall
          ? [styles.selectedCard, { borderColor: theme.hex }]
          : null,
        pressed ? styles.pressedCard : null,
      ]}
    >
      {selectionMode || selected ? (
        <Pressable
          onPress={() => onToggleSelection(file)}
          style={[
            styles.selectionToggle,
            selected ? styles.selectionToggleSelected : null,
            selected
              ? { backgroundColor: theme.hex, borderColor: theme.hex }
              : null,
          ]}
        >
          <Text style={styles.selectionToggleText}>{selected ? "✓" : ""}</Text>
        </Pressable>
      ) : null}
      <View
        style={[
          styles.fileThumb,
          isMediaFileItem ? styles.mediaFileThumb : null,
          isListMode ? styles.fileThumbList : null,
          isListMode ? styles[`${cardSize}ListFileThumb`] : null,
          isMediaFileItem && mediaAspectRatio
            ? { aspectRatio: mediaAspectRatio }
            : null,
        ]}
      >
        {thumbnailCache.displayUri ? (
          <Image
            onLoad={handleThumbnailLoad}
            resizeMode="cover"
            source={{ uri: thumbnailCache.displayUri }}
            style={styles.fileThumbImage}
          />
        ) : (
          <View
            style={[
              styles.fileThumbFallback,
              { backgroundColor: theme.selection },
            ]}
          >
            <Text style={[styles.fileThumbFallbackText, { color: theme.hex }]}>
              {file.fileType.slice(0, 4)}
            </Text>
          </View>
        )}
        {isVideoFile(file) ? <Text style={styles.videoBadge}>▶</Text> : null}
      </View>
      {showFileInfo ? (
        <View style={styles.fileCardBody}>
          <Text
            numberOfLines={cardSize === "large" ? 2 : 1}
            style={[
              styles.fileCardTitle,
              cardSize === "large" ? styles.largeFileCardTitle : null,
            ]}
          >
            {file.name}
          </Text>
          <Text
            numberOfLines={cardSize === "large" ? 2 : 1}
            style={styles.fileCardMeta}
          >
            {file.fileType}
            {file.sizeLabel ? ` · ${file.sizeLabel}` : ""}
            {file.width && file.height ? ` · ${file.width}x${file.height}` : ""}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};
