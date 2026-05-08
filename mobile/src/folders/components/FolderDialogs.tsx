import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import type { FileMoveOverwriteMode, FolderDirectory, FolderFileSummary, FolderSummary } from "@kwphoto/core";
import { createThumbnailUrl } from "@kwphoto/core";

import type { MobileLocalCacheFolderRef } from "../../mobile-local-cache";
import { MOBILE_SAGE_SLATE, useMobileTheme } from "../../mobile-theme";
import { MobileBottomSheetModal, MobileCenterDialog } from "../../components/MobileDialog";
import { MAX_FOLDER_COVER_COUNT, MOVE_OVERWRITE_OPTIONS } from "../folderConstants";
import type { PathItem } from "../folderTypes";
import { createDirectoryPathItems, getCoverCandidateFiles } from "../folderUtils";
import { styles } from "../folderStyles";
import { CachedMobileImage } from "./PreviewMedia";

/**
 * Shows the create or rename folder form inside the shared center dialog.
 */
export const FolderNameDialog = ({
  error,
  mode,
  name,
  onCancel,
  onChangeName,
  onSubmit,
  submitting,
}: {
  error: string;
  mode?: "create" | "rename";
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
      <Text style={styles.dialogTitle}>
        {mode === "rename" ? "重命名文件夹" : "新建文件夹"}
      </Text>
      <Text style={styles.dialogDescription}>
        {mode === "rename"
          ? "输入新的文件夹名称。"
          : "在当前目录下创建一个新文件夹。"}
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
        <Pressable
          disabled={submitting}
          onPress={onCancel}
          style={styles.dialogSecondaryButton}
        >
          <Text style={styles.dialogSecondaryText}>取消</Text>
        </Pressable>
        <Pressable
          disabled={submitting}
          onPress={() => void onSubmit()}
          style={[
            styles.dialogPrimaryButton,
            { backgroundColor: theme.hex },
            submitting ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.dialogPrimaryText}>
            {submitting ? "处理中" : "确定"}
          </Text>
        </Pressable>
      </View>
    </MobileCenterDialog>
  );
};

/**
 * Lets users pick folder-cover images from the target folder directory.
 */
export const FolderCoverDialog = ({
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
    <MobileCenterDialog
      backdropStyle={styles.dialogOverlay}
      contentStyle={[styles.dialogLarge, styles.coverDialogLarge]}
      onClose={onClose}
      visible={Boolean(folder)}
    >
      <Text style={styles.dialogTitle}>设置文件夹封面</Text>
      <Text style={styles.dialogDescription}>
        {folder.name} · 从文件夹内选择最多 {MAX_FOLDER_COVER_COUNT}{" "}
        张图片作为封面拼贴。
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
          style={[
            styles.dialogSecondaryButton,
            disabled ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.dialogSecondaryText}>
            {autoSubmitting ? "自动设置中" : "自动设置"}
          </Text>
        </Pressable>
        <Text style={styles.dialogMetaText}>
          已选择 {selectedHashes.length}/{MAX_FOLDER_COVER_COUNT}
        </Text>
      </View>

      {loading ? (
        <View style={styles.dialogLoadingLine}>
          <ActivityIndicator color={theme.hex} />
          <Text style={styles.dialogLoadingText}>正在加载文件夹图片</Text>
        </View>
      ) : null}

      {!loading && coverFiles.length + directory.folders.length === 0 ? (
        <Text style={styles.dialogEmptyText}>
          当前文件夹没有可设置为封面的图片。
        </Text>
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
            style={[
              styles.coverPickerCard,
              styles.coverPickerFolderCard,
              disabled ? styles.disabledButton : null,
            ]}
          >
            <View
              style={[
                styles.coverPickerFolderIcon,
                { backgroundColor: theme.selection },
              ]}
            >
              <Text
                style={[styles.coverPickerFolderIconText, { color: theme.hex }]}
              >
                ▤
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.coverPickerName}>
              {childFolder.name}
            </Text>
          </Pressable>
        ))}
        {coverFiles.map((file) => {
          const selected = selectedHashSet.has(file.md5);
          const thumbnailUrl = createThumbnailUrl({
            authCode,
            baseUrl: serverUrl,
            md5: file.md5,
            type: "h220",
          });

          return (
            <Pressable
              disabled={disabled}
              key={`${file.id}-${file.md5}`}
              onPress={() => onToggleFile(file)}
              style={[
                styles.coverPickerCard,
                selected
                  ? [styles.coverPickerCardSelected, { borderColor: theme.hex }]
                  : null,
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
                  <Text
                    style={[
                      styles.coverPickerFolderIconText,
                      { color: theme.hex },
                    ]}
                  >
                    IMG
                  </Text>
                )}
                {selected ? (
                  <Text
                    style={[
                      styles.coverPickerCheck,
                      { backgroundColor: theme.hex },
                    ]}
                  >
                    ✓
                  </Text>
                ) : null}
              </View>
              <Text numberOfLines={1} style={styles.coverPickerName}>
                {file.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.dialogError}>{error}</Text> : null}

      <View style={styles.dialogActions}>
        <Pressable
          disabled={disabled}
          onPress={onClose}
          style={styles.dialogSecondaryButton}
        >
          <Text style={styles.dialogSecondaryText}>取消</Text>
        </Pressable>
        <Pressable
          disabled={disabled || selectedHashes.length === 0}
          onPress={() => void onSubmit()}
          style={[
            styles.dialogPrimaryButton,
            { backgroundColor: theme.hex },
            disabled || selectedHashes.length === 0
              ? styles.disabledButton
              : null,
          ]}
        >
          <Text style={styles.dialogPrimaryText}>
            {submitting ? "保存中" : "保存封面"}
          </Text>
        </Pressable>
      </View>
    </MobileCenterDialog>
  );
};

/**
 * Shows the folder picker and overwrite mode controls for batch move actions.
 */
export const BatchMoveDialog = ({
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
      <Text style={styles.dialogDescription}>
        {selectedSummary} · 选择目标文件夹后执行移动。
      </Text>
      <View style={styles.dialogToolbarRow}>
        <Pressable
          disabled={disabled}
          onPress={onOpenRoot}
          style={styles.dialogSecondaryButton}
        >
          <Text style={styles.dialogSecondaryText}>根目录</Text>
        </Pressable>
        <PathPillRow
          disabled={disabled}
          fallbackLabel={currentDirectory.path || "根目录"}
          items={createDirectoryPathItems(currentDirectory)}
          onOpenFolderId={onOpenFolderId}
        />
      </View>

      <View style={styles.moveTargetPanel}>
        <Text style={styles.moveTargetLabel}>目标文件夹</Text>
        <Text numberOfLines={1} style={styles.moveTargetValue}>
          {target?.path || target?.name || "未选择"}
        </Text>
      </View>

      <View style={styles.overwriteGroup}>
        {MOVE_OVERWRITE_OPTIONS.map((option) => (
          <Pressable
            disabled={submitting}
            key={option.value}
            onPress={() => onChangeOverwriteMode(option.value)}
            style={[
              styles.overwriteButton,
              overwriteMode === option.value
                ? styles.overwriteButtonActive
                : null,
              overwriteMode === option.value
                ? { backgroundColor: theme.hex, borderColor: theme.hex }
                : null,
            ]}
          >
            <Text
              style={[
                styles.overwriteButtonText,
                overwriteMode === option.value
                  ? styles.overwriteButtonTextActive
                  : null,
              ]}
            >
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
            <Pressable
              disabled={disabled}
              onPress={() => onOpenFolder(folder)}
              style={styles.moveFolderMain}
            >
              <Text style={[styles.moveFolderIcon, { color: theme.hex }]}>
                ▤
              </Text>
              <View style={styles.moveFolderCopy}>
                <Text numberOfLines={1} style={styles.moveFolderName}>
                  {folder.name}
                </Text>
                <Text numberOfLines={1} style={styles.moveFolderMeta}>
                  {folder.path || `${folder.childCount} 个子文件夹`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              disabled={disabled}
              onPress={() => onSelectTarget(folder)}
              style={[
                styles.moveTargetButton,
                { backgroundColor: theme.selection },
              ]}
            >
              <Text style={[styles.moveTargetButtonText, { color: theme.hex }]}>
                设为目标
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {error ? <Text style={styles.dialogError}>{error}</Text> : null}

      <View style={styles.dialogActions}>
        <Pressable
          disabled={submitting}
          onPress={onClose}
          style={styles.dialogSecondaryButton}
        >
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
          <Text style={styles.dialogPrimaryText}>
            {submitting ? "移动中" : "确认移动"}
          </Text>
        </Pressable>
      </View>
    </MobileBottomSheetModal>
  );
};

/**
 * Renders a horizontally scrollable directory breadcrumb row.
 */
export const PathPillRow = ({
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
      style={[
        styles.pathPillScroll,
        compact ? styles.pathPillScrollCompact : null,
      ]}
    >
      <View
        style={[styles.pathPillRow, compact ? styles.pathPillRowCompact : null]}
      >
        {displayItems.map((item, index) => {
          const folderId = item.id;
          const clickable = item.isRoot
            ? Boolean(onOpenRoot)
            : folderId !== undefined && folderId > 0;

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
                clickable
                  ? {
                      backgroundColor: theme.selection,
                      borderColor: theme.light,
                    }
                  : null,
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
                {index > 0 ? "/ " : ""}
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

/**
 * Renders a muted single-line empty state used across folder panels.
 */
export const EmptyLine = ({ text }: { text: string }) => {
  return <Text style={styles.emptyText}>{text}</Text>;
};
