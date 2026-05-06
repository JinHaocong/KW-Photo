import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";

import { FilePreviewDialog } from "../components/FilePreviewPanel";
import {
  DirectoryContent,
  FolderMetric,
  FolderSkeleton,
} from "../components/FolderBrowser";
import {
  BatchDeleteConfirmDialog,
  BatchMoveDialog,
  BatchShareDialog,
  CreateFolderDialog,
  FolderCoverDialog,
  FolderNameDialog,
} from "../components/FolderDialogs";
import type {
  BatchMoveOverwriteMode,
  BatchShareFormValues,
} from "../components/FolderDialogs";
import { getApiErrorMessage } from "../services/api-client";
import { useLocalCachePreferences } from "../hooks/useLocalCachePreferences";
import {
  addFilesToAlbum,
  checkFavoriteAlbum,
  createFileShareLink,
  deleteFiles,
  fetchFileAlbumIds,
  fetchFileAlbums,
  moveFilesToFolder,
  removeFilesFromAlbum,
} from "../services/file-operations-service";
import type { FileAlbumSummary } from "../services/file-operations-service";
import {
  autoSetFolderCover,
  createFolder,
  deleteFolder,
  fetchFolderDirectory,
  fetchRootFolders,
  moveFolder,
  renameFolder,
  setFolderCover,
} from "../services/folders-service";
import {
  downloadBatchFiles,
  downloadOriginalFile,
  fetchFileInfo,
  refreshFileDescriptor,
  refreshFileInfo,
  refreshFileThumbs,
  triggerVideoTranscode,
} from "../services/media-service";
import type { FileDetail } from "../services/media-service";
import { getDirectorySelectionItems } from "../shared/directory-selection";
import {
  createLocalCacheFolderRef,
  createLocalCacheScope,
} from "../shared/local-cache";
import type {
  FolderBreadcrumbItem,
  FolderDirectory,
  FolderFileSummary,
  FolderSummary,
  UploadTarget,
} from "../shared/types";
import { useSessionStore } from "../stores/session-store";
import { FolderBatchActionBar } from "./folders/FolderBatchActionBar";
import { FoldersToolbar } from "./folders/FoldersToolbar";
import {
  readFolderIdFromLocation,
  readFolderHistoryState,
  writeFolderHistoryState,
} from "./folders/folder-history";
import type {
  BatchActionKey,
  FolderHistoryAction,
  FolderNavigationPreview,
} from "./folders/folder-page-types";
import {
  copyTextToClipboard,
  createEmptyDirectory,
  createShareUrl,
  FORBIDDEN_FOLDER_NAME_PATTERN,
  formatSelectionSummary,
  getCoverCandidateFiles,
  MAX_FOLDER_COVER_COUNT,
  sortDirectory,
} from "./folders/folder-utils";
import { useDirectorySelection } from "./folders/useDirectorySelection";
import { useFolderDirectory } from "./folders/useFolderDirectory";
import { useFolderSwipeBack } from "./folders/useFolderSwipeBack";
import { useFolderViewPreference } from "./folders/useFolderViewPreference";
import { useWorkspacePullToRefresh } from "./folders/useWorkspacePullToRefresh";

interface FoldersPageProps {
  onOpenUpload: (target?: UploadTarget) => void;
  onShowToast: (message: string) => void;
  uploadRefreshKey: number;
}

type FolderPageMotionDirection = "forward" | "backward";

interface FolderPageMotionCustom {
  direction: FolderPageMotionDirection;
  reduceMotion: boolean;
}

const FOLDER_PAGE_MOTION_TRANSITION = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1] as const,
};

const FOLDER_PAGE_MOTION_VARIANTS: Variants = {
  center: {
    filter: "blur(0px)",
    opacity: 1,
    x: 0,
  },
  enter: ({ direction, reduceMotion }: FolderPageMotionCustom) => ({
    filter: reduceMotion ? "blur(0px)" : "blur(2px)",
    opacity: reduceMotion ? 1 : 0,
    x: reduceMotion ? 0 : direction === "forward" ? 38 : -38,
  }),
  exit: ({ direction, reduceMotion }: FolderPageMotionCustom) => ({
    filter: reduceMotion ? "blur(0px)" : "blur(1px)",
    opacity: reduceMotion ? 1 : 0,
    x: reduceMotion ? 0 : direction === "forward" ? -30 : 30,
  }),
};

/**
 * Renders the real folder workspace based on MT Photos folder APIs.
 */
export const FoldersPage = ({
  onOpenUpload,
  onShowToast,
  uploadRefreshKey,
}: FoldersPageProps) => {
  const authCode = useSessionStore((state) => state.tokens?.authCode);
  const ensureAuthCode = useSessionStore((state) => state.ensureAuthCode);
  const refresh = useSessionStore((state) => state.refresh);
  const serverUrl = useSessionStore((state) => state.serverUrl);
  const userId = useSessionStore((state) => state.user?.id);
  const { cacheEnabled } = useLocalCachePreferences();
  const cacheScope = useMemo(
    () => createLocalCacheScope({ serverUrl, userId }),
    [serverUrl, userId],
  );
  const {
    folderCardSize,
    setFolderCardSize,
    setShowFolderCovers,
    setSortDirection,
    setSortField,
    showFolderCovers,
    sortDirection,
    sortField,
  } = useFolderViewPreference(userId);
  const [currentFolderId, setCurrentFolderId] = useState<number | undefined>(
    () => readFolderIdFromLocation(),
  );
  const [optimisticDirectory, setOptimisticDirectory] =
    useState<FolderDirectory>();
  const [coverDialogAutoSubmitting, setCoverDialogAutoSubmitting] =
    useState(false);
  const [coverDialogDirectory, setCoverDialogDirectory] =
    useState<FolderDirectory>(() => createEmptyDirectory());
  const [coverDialogError, setCoverDialogError] = useState("");
  const [coverDialogFiles, setCoverDialogFiles] = useState<FolderFileSummary[]>(
    [],
  );
  const [coverDialogLoading, setCoverDialogLoading] = useState(false);
  const [coverDialogTarget, setCoverDialogTarget] = useState<FolderSummary>();
  const [coverDialogSelectedHashes, setCoverDialogSelectedHashes] = useState<
    string[]
  >([]);
  const [coverDialogSubmitting, setCoverDialogSubmitting] = useState(false);
  const [createFolderError, setCreateFolderError] = useState("");
  const [createFolderName, setCreateFolderName] = useState("");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { directory, error, loadDirectory, loading } = useFolderDirectory({
    cacheEnabled,
    cacheScope,
    currentFolderId,
    refresh,
    serverUrl,
    uploadRefreshKey,
  });
  const [moveDialogDirectory, setMoveDialogDirectory] =
    useState<FolderDirectory>(() => createEmptyDirectory());
  const [moveDialogError, setMoveDialogError] = useState("");
  const [moveDialogLoading, setMoveDialogLoading] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveDialogOverwriteMode, setMoveDialogOverwriteMode] =
    useState<BatchMoveOverwriteMode>(2);
  const [moveDialogTarget, setMoveDialogTarget] = useState<FolderSummary>();
  const [pinnedPath, setPinnedPath] = useState("");
  const [previewFile, setPreviewFile] = useState<FolderFileSummary>();
  const [renameFolderError, setRenameFolderError] = useState("");
  const [renameFolderName, setRenameFolderName] = useState("");
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderSummary>();
  const [renamingFolder, setRenamingFolder] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [submittingBatchAction, setSubmittingBatchAction] =
    useState<BatchActionKey>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [folderTransitionDirection, setFolderTransitionDirection] =
    useState<FolderPageMotionDirection>("forward");
  const [loadingOverlayVisible, setLoadingOverlayVisible] = useState(false);
  const coverDialogRequestIdRef = useRef(0);
  const loadingOverlayTimerRef = useRef<number | undefined>(undefined);
  const folderHistoryIndexRef = useRef(readFolderHistoryState()?.index ?? 0);
  const reduceFolderMotion = useReducedMotion();

  const sortedDirectory = useMemo(
    () =>
      sortDirectory(directory, { direction: sortDirection, field: sortField }),
    [directory, sortDirection, sortField],
  );
  const selectionItems = useMemo(
    () => getDirectorySelectionItems(sortedDirectory),
    [sortedDirectory],
  );
  const {
    allVisibleSelected,
    resetSelection: resetDirectorySelection,
    selectedFileCount,
    selectedFiles,
    selectedFolderCount,
    selectedFolders,
    selectedItems,
    selectedKeys,
    selectionMode,
    toggleSelectAllVisible: handleToggleSelectAllVisible,
    toggleSelection: handleToggleSelection,
    toggleSelectionMode: handleToggleSelectionMode,
  } = useDirectorySelection(selectionItems);
  const toolbarDirectory = optimisticDirectory ?? directory;
  const directFileCount = useMemo(
    () =>
      toolbarDirectory.files.reduce((sum, group) => sum + group.list.length, 0),
    [toolbarDirectory.files],
  );
  const previewFiles = useMemo(
    () => sortedDirectory.files.flatMap((group) => group.list),
    [sortedDirectory.files],
  );
  const cacheFolder = useMemo(
    () => createLocalCacheFolderRef({ directory, scope: cacheScope }),
    [cacheScope, directory],
  );
  const hasDirectoryContent = toolbarDirectory.folders.length + directFileCount > 0;
  const showingOptimisticDirectory = Boolean(optimisticDirectory);
  const showBlockingLoading =
    (loading || showingOptimisticDirectory) &&
    !error &&
    (!hasDirectoryContent || showingOptimisticDirectory);
  const showDirectoryContent = !showingOptimisticDirectory && !error && hasDirectoryContent;
  const showEmptyDirectory = !showingOptimisticDirectory && !loading && !error && !hasDirectoryContent;
  const showLoadingOverlay = !showingOptimisticDirectory && loading && hasDirectoryContent && !error;
  const scanningCount = useMemo(
    () =>
      toolbarDirectory.folders.filter((folder) => folder.status === "scanning").length,
    [toolbarDirectory.folders],
  );
  const folderMotionCustom = useMemo<FolderPageMotionCustom>(
    () => ({
      direction: folderTransitionDirection,
      reduceMotion: Boolean(reduceFolderMotion),
    }),
    [folderTransitionDirection, reduceFolderMotion],
  );
  const folderPageMotionKey = currentFolderId ?? "root";

  useEffect(() => {
    writeFolderHistoryState(currentFolderId, "replace", {
      index: folderHistoryIndexRef.current,
    });
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextFolderId = readFolderIdFromLocation();
      const nextHistoryState = readFolderHistoryState();
      const nextHistoryIndex = nextHistoryState?.index ?? 0;
      const preview =
        nextHistoryState?.preview ??
        createBreadcrumbNavigationPreview(directory, nextFolderId);
      const nextDirection =
        nextHistoryIndex < folderHistoryIndexRef.current ? "backward" : "forward";

      setFolderTransitionDirection(nextDirection);
      folderHistoryIndexRef.current = nextHistoryIndex;
      setOptimisticDirectory(createOptimisticDirectory(nextFolderId, preview));
      setPreviewFile(undefined);
      resetDirectorySelection();
      setCurrentFolderId(nextFolderId);
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [directory, resetDirectorySelection]);

  useEffect(() => {
    if (!authCode) {
      void ensureAuthCode().catch((requestError: unknown) => {
        onShowToast(getApiErrorMessage(requestError));
      });
    }
  }, [authCode, ensureAuthCode, onShowToast]);

  useEffect(() => {
    if (!optimisticDirectory || loading) {
      return;
    }

    if (directory.folderId === optimisticDirectory.folderId) {
      setOptimisticDirectory(undefined);
    }
  }, [directory.folderId, loading, optimisticDirectory]);

  useEffect(() => {
    if (loadingOverlayTimerRef.current !== undefined) {
      window.clearTimeout(loadingOverlayTimerRef.current);
      loadingOverlayTimerRef.current = undefined;
    }

    if (showLoadingOverlay) {
      setLoadingOverlayVisible(true);
      return undefined;
    }

    loadingOverlayTimerRef.current = window.setTimeout(() => {
      setLoadingOverlayVisible(false);
      loadingOverlayTimerRef.current = undefined;
    }, 140);

    return () => {
      if (loadingOverlayTimerRef.current !== undefined) {
        window.clearTimeout(loadingOverlayTimerRef.current);
        loadingOverlayTimerRef.current = undefined;
      }
    };
  }, [showLoadingOverlay]);

  /**
   * Enters a child folder when it has nested folders or files.
   */
  const handleOpenFolder = (folder: FolderSummary): void => {
    if (folder.id <= 0) {
      return;
    }

    navigateFolder(
      folder.id,
      "push",
      createChildFolderNavigationPreview(toolbarDirectory, folder),
    );
  };

  /**
   * Navigates folders while keeping browser history in sync.
   */
  const navigateFolder = useCallback(
    (
      folderId: number | undefined,
      action: FolderHistoryAction = "push",
      preview?: FolderNavigationPreview,
    ): void => {
      if (folderId === currentFolderId) {
        void loadDirectory(folderId);
        return;
      }

      const navigationPreview =
        preview ?? createBreadcrumbNavigationPreview(toolbarDirectory, folderId);

      setFolderTransitionDirection(
        getFolderPageMotionDirection(toolbarDirectory, folderId, navigationPreview),
      );
      setOptimisticDirectory(createOptimisticDirectory(folderId, navigationPreview));

      const nextHistoryIndex =
        action === "push"
          ? folderHistoryIndexRef.current + 1
          : folderHistoryIndexRef.current;

      folderHistoryIndexRef.current = nextHistoryIndex;
      writeFolderHistoryState(folderId, action, {
        index: nextHistoryIndex,
        preview: navigationPreview,
      });
      setPreviewFile(undefined);
      resetDirectorySelection();
      setCurrentFolderId(folderId);
    },
    [
      currentFolderId,
      loadDirectory,
      resetDirectorySelection,
      toolbarDirectory,
    ],
  );

  /**
   * Routes batch toolbar commands to their real business flow.
   */
  const handleBatchAction = (action: BatchActionKey): void => {
    if (selectedItems.length === 0) {
      onShowToast("请先选择文件或文件夹");
      return;
    }

    if (action === "move") {
      openMoveDialog();
      return;
    }

    if (action === "share") {
      if (selectedFiles.length === 0) {
        onShowToast("分享目前仅支持文件，请先选择文件。");
        return;
      }

      setShareDialogOpen(true);
      return;
    }

    if (action === "download") {
      void handleBatchDownload();
      return;
    }

    setDeleteDialogOpen(true);
  };

  /**
   * Opens the move dialog and starts folder picking from root.
   */
  const openMoveDialog = (): void => {
    setMoveDialogError("");
    setMoveDialogOpen(true);
    setMoveDialogOverwriteMode(2);
    setMoveDialogTarget(undefined);
    void loadMoveDialogDirectory();
  };

  /**
   * Loads one folder level for the move target picker.
   */
  const loadMoveDialogDirectory = async (folderId?: number): Promise<void> => {
    setMoveDialogError("");
    setMoveDialogLoading(true);

    try {
      const nextDirectory = folderId
        ? await fetchFolderDirectory(getApiOptions(), folderId)
        : await fetchRootFolders(getApiOptions());

      setMoveDialogDirectory(nextDirectory);
    } catch (requestError) {
      setMoveDialogError(getApiErrorMessage(requestError));
    } finally {
      setMoveDialogLoading(false);
    }
  };

  /**
   * Moves selected files and folders to the selected destination folder.
   */
  const handleSubmitBatchMove = async (): Promise<void> => {
    if (!moveDialogTarget) {
      setMoveDialogError("请选择目标文件夹。");
      return;
    }

    if (selectedFolders.some((folder) => folder.id === moveDialogTarget.id)) {
      setMoveDialogError("不能把文件夹移动到自己。");
      return;
    }

    setMoveDialogError("");
    setSubmittingBatchAction("move");

    try {
      const fileIds = selectedFiles
        .map((file) => file.id)
        .filter((id) => id > 0);

      if (fileIds.length > 0) {
        await moveFilesToFolder(getApiOptions(), {
          fileIds,
          overwrite: moveDialogOverwriteMode,
          targetFolderId: moveDialogTarget.id,
        });
      }

      for (const folder of selectedFolders) {
        await moveFolder(getApiOptions(), {
          folderId: folder.id,
          targetFolderId: moveDialogTarget.id,
        });
      }

      onShowToast(
        `已移动 ${formatSelectionSummary(selectedFolderCount, selectedFileCount)}`,
      );
      setMoveDialogOpen(false);
      resetDirectorySelection();
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      setMoveDialogError(getApiErrorMessage(requestError));
    } finally {
      setSubmittingBatchAction(undefined);
    }
  };

  /**
   * Creates and copies a share link for selected files.
   */
  const handleSubmitBatchShare = async (values: BatchShareFormValues): Promise<void> => {
    const fileIds = selectedFiles.map((file) => file.id).filter((id) => id > 0);

    if (fileIds.length === 0) {
      onShowToast("分享目前仅支持文件，请先选择文件。");
      return;
    }

    setSubmittingBatchAction("share");

    try {
      const linkEndTime = values.expiresInDays
        ? new Date(
            Date.now() + values.expiresInDays * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;
      const response = await createFileShareLink(getApiOptions(), {
        cover: selectedFiles[0]?.md5,
        desc: values.desc,
        fileIds,
        linkEndTime,
        linkPwd: values.password,
        showDownload: values.showDownload,
        showExif: values.showExif,
      });
      const shareUrl = createShareUrl(serverUrl, response.key, values.password);

      await copyTextToClipboard(shareUrl);
      onShowToast("分享链接已生成并复制");
      setShareDialogOpen(false);
    } catch (requestError) {
      onShowToast(`分享失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setSubmittingBatchAction(undefined);
    }
  };

  /**
   * Starts batch download for selected files through the server package endpoint.
   */
  const handleBatchDownload = async (): Promise<void> => {
    if (selectedFiles.length === 0) {
      onShowToast("下载目前仅支持文件，请先选择文件。");
      return;
    }

    setSubmittingBatchAction("download");

    try {
      const result = await downloadBatchFiles({
        baseUrl: serverUrl,
        files: selectedFiles.map((file) => ({
          id: file.id,
          md5: file.md5,
          name: file.name,
        })),
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });

      onShowToast(
        result.mode === "zip"
          ? "批量下载压缩包已开始"
          : `已开始下载 ${result.downloadedCount} 个文件`,
      );
    } catch (requestError) {
      onShowToast(`下载失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setSubmittingBatchAction(undefined);
    }
  };

  /**
   * Deletes selected files and folders, then refreshes the current directory.
   */
  const handleConfirmBatchDelete = async (): Promise<void> => {
    setSubmittingBatchAction("delete");

    try {
      const fileIds = selectedFiles
        .map((file) => file.id)
        .filter((id) => id > 0);

      if (fileIds.length > 0) {
        await deleteFiles(getApiOptions(), fileIds);
      }

      for (const folder of selectedFolders) {
        await deleteFolder(getApiOptions(), folder.id);
      }

      onShowToast(
        `已删除 ${formatSelectionSummary(selectedFolderCount, selectedFileCount)}`,
      );
      setDeleteDialogOpen(false);
      resetDirectorySelection();
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      onShowToast(`删除失败：${getApiErrorMessage(requestError)}`);
    } finally {
      setSubmittingBatchAction(undefined);
    }
  };

  const getApiOptions = () => {
    return {
      baseUrl: serverUrl,
      getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
      onUnauthorized: refresh,
    };
  };

  /**
   * Opens the cover picker and loads image candidates from the target folder.
   */
  const handleOpenCoverDialog = async (folder: FolderSummary): Promise<void> => {
    if (folder.id <= 0) {
      return;
    }

    setCoverDialogError("");
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogFiles([]);
    setCoverDialogSelectedHashes(
      folder.coverHashes.slice(0, MAX_FOLDER_COVER_COUNT),
    );
    setCoverDialogTarget(folder);
    await loadCoverDialogDirectory(folder.id);
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
      const nextDirectory = await fetchFolderDirectory(
        {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        },
        folderId,
      );
      const coverFiles = getCoverCandidateFiles(nextDirectory);

      if (coverDialogRequestIdRef.current !== requestId) {
        return;
      }

      setCoverDialogDirectory(nextDirectory);
      setCoverDialogFiles(coverFiles);
    } catch (requestError) {
      if (coverDialogRequestIdRef.current !== requestId) {
        return;
      }

      setCoverDialogError(getApiErrorMessage(requestError));
    } finally {
      if (coverDialogRequestIdRef.current === requestId) {
        setCoverDialogLoading(false);
      }
    }
  };

  /**
   * Lets the server generate folder covers automatically.
   */
  const handleAutoSetFolderCover = async (): Promise<void> => {
    if (!coverDialogTarget) {
      return;
    }

    setCoverDialogError("");
    setCoverDialogAutoSubmitting(true);

    try {
      await autoSetFolderCover(
        {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        },
        coverDialogTarget.id,
      );
      onShowToast("文件夹封面已自动设置");
      resetCoverDialog();
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      setCoverDialogError(getApiErrorMessage(requestError));
    } finally {
      setCoverDialogAutoSubmitting(false);
    }
  };

  /**
   * Closes the cover picker and discards any pending candidate request.
   */
  const handleCloseCoverDialog = (): void => {
    if (coverDialogAutoSubmitting || coverDialogSubmitting) {
      return;
    }

    coverDialogRequestIdRef.current += 1;
    resetCoverDialog();
  };

  const resetCoverDialog = (): void => {
    setCoverDialogError("");
    setCoverDialogDirectory(createEmptyDirectory());
    setCoverDialogFiles([]);
    setCoverDialogLoading(false);
    setCoverDialogSelectedHashes([]);
    setCoverDialogTarget(undefined);
  };

  /**
   * Selects or removes one image from the folder cover payload.
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
  const handleSaveFolderCover = async (): Promise<void> => {
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
      const response = await setFolderCover(
        {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        },
        {
          coverHashes: coverDialogSelectedHashes,
          folderId: coverDialogTarget.id,
        },
      );

      if (response.msg) {
        setCoverDialogError(response.msg);
        return;
      }

      onShowToast("文件夹封面已更新");
      resetCoverDialog();
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      setCoverDialogError(getApiErrorMessage(requestError));
    } finally {
      setCoverDialogSubmitting(false);
    }
  };

  /**
   * Creates a folder under the current server directory and refreshes the listing.
   */
  const handleCreateFolder = async (): Promise<void> => {
    const folderName = createFolderName.trim();

    if (!folderName) {
      setCreateFolderError("请输入文件夹名称。");
      return;
    }

    if (FORBIDDEN_FOLDER_NAME_PATTERN.test(folderName)) {
      setCreateFolderError('名称不能包含 / \\ : * ? " < > |。');
      return;
    }

    if (
      directory.folders.some(
        (folder) =>
          folder.name === folderName || folder.galleryName === folderName,
      )
    ) {
      setCreateFolderError("当前目录下已存在同名文件夹。");
      return;
    }

    setCreateFolderError("");
    setCreatingFolder(true);

    try {
      const response = await createFolder(
        {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        },
        {
          name: folderName,
          parentId: currentFolderId,
        },
      );

      if (response.msg) {
        setCreateFolderError(response.msg);
        return;
      }

      setCreateFolderName("");
      setCreateFolderOpen(false);
      onShowToast("文件夹已创建");
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      setCreateFolderError(getApiErrorMessage(requestError));
    } finally {
      setCreatingFolder(false);
    }
  };

  /**
   * Opens the rename dialog with the selected folder as the edit target.
   */
  const handleOpenRenameFolder = (folder: FolderSummary): void => {
    setRenameFolderTarget(folder);
    setRenameFolderName(folder.name);
    setRenameFolderError("");
  };

  /**
   * Renames a folder and refreshes the current directory after success.
   */
  const handleRenameFolder = async (): Promise<void> => {
    const folderName = renameFolderName.trim();

    if (!renameFolderTarget) {
      return;
    }

    if (!folderName) {
      setRenameFolderError("请输入文件夹名称。");
      return;
    }

    if (FORBIDDEN_FOLDER_NAME_PATTERN.test(folderName)) {
      setRenameFolderError('名称不能包含 / \\ : * ? " < > |。');
      return;
    }

    if (
      folderName === renameFolderTarget.name ||
      folderName === renameFolderTarget.galleryName
    ) {
      setRenameFolderTarget(undefined);
      setRenameFolderError("");
      return;
    }

    const hasSameName = directory.folders.some((folder) => {
      if (folder.id === renameFolderTarget.id) {
        return false;
      }

      return folder.name === folderName || folder.galleryName === folderName;
    });

    if (hasSameName) {
      setRenameFolderError("当前目录下已存在同名文件夹。");
      return;
    }

    setRenameFolderError("");
    setRenamingFolder(true);

    try {
      const response = await renameFolder(
        {
          baseUrl: serverUrl,
          getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
          onUnauthorized: refresh,
        },
        {
          folderId: renameFolderTarget.id,
          name: folderName,
        },
      );

      if (response.msg) {
        setRenameFolderError(response.msg);
        return;
      }

      setRenameFolderTarget(undefined);
      setRenameFolderName("");
      onShowToast("文件夹已重命名");
      await loadDirectory(currentFolderId);
    } catch (requestError) {
      setRenameFolderError(getApiErrorMessage(requestError));
    } finally {
      setRenamingFolder(false);
    }
  };

  /**
   * Downloads an original media file through the authenticated gateway endpoint.
   */
  const handleDownloadFile = useCallback(
    async (file: FolderFileSummary): Promise<void> => {
      await downloadOriginalFile({
        baseUrl: serverUrl,
        file: {
          id: file.id,
          md5: file.md5,
          name: file.name,
        },
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });
    },
    [refresh, serverUrl],
  );

  /**
   * Loads the latest file detail for the preview side panel.
   */
  const handleLoadFileDetail = useCallback(
    async (file: FolderFileSummary): Promise<FileDetail> => {
      return fetchFileInfo({
        baseUrl: serverUrl,
        file: {
          id: file.id,
          md5: file.md5,
          name: file.name,
        },
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });
    },
    [refresh, serverUrl],
  );

  /**
   * Starts server-side transcode preparation before Web/Desktop built-in video preview.
   */
  const handlePrepareVideoPreview = useCallback(
    async (file: FolderFileSummary): Promise<void> => {
      await triggerVideoTranscode({
        baseUrl: serverUrl,
        fileId: file.id,
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });
    },
    [refresh, serverUrl],
  );

  /**
   * Loads album and favorite membership used by preview toolbar state.
   */
  const handleLoadPreviewMembership = useCallback(
    async (file: FolderFileSummary) => {
      const options = getApiOptions();
      const [albumIds, favoriteAlbum] = await Promise.all([
        fetchFileAlbumIds(options, file.id),
        checkFavoriteAlbum(options),
      ]);

      return {
        albumIds,
        favoriteAlbumId: favoriteAlbum.id || undefined,
        favoriteFileIds: favoriteAlbum.files,
      };
    },
    [refresh, serverUrl],
  );

  /**
   * Loads the album picker list and current file membership together.
   */
  const handleLoadPreviewAlbums = useCallback(
    async (file: FolderFileSummary) => {
      const options = getApiOptions();
      const [albums, albumIds] = await Promise.all([
        fetchFileAlbums(options),
        fetchFileAlbumIds(options, file.id),
      ]);

      return { albumIds, albums };
    },
    [refresh, serverUrl],
  );

  /**
   * Adds or removes the preview file from the selected album.
   */
  const handleTogglePreviewAlbum = useCallback(
    async (
      file: FolderFileSummary,
      album: FileAlbumSummary,
      included: boolean,
      currentAlbumIds: number[],
    ): Promise<number[]> => {
      if (included) {
        await removeFilesFromAlbum(getApiOptions(), album.id, [file.id]);
        return currentAlbumIds.filter((id) => id !== album.id);
      }

      await addFilesToAlbum(getApiOptions(), album.id, [file.id]);
      return Array.from(new Set([...currentAlbumIds, album.id]));
    },
    [refresh, serverUrl],
  );

  /**
   * Toggles the preview file inside the server favorites album.
   */
  const handleTogglePreviewFavorite = useCallback(
    async (
      file: FolderFileSummary,
      state: { favoriteAlbumId?: number; isFavorite: boolean },
    ): Promise<number | undefined> => {
      const favoriteAlbumId = state.favoriteAlbumId ?? (await checkFavoriteAlbum(getApiOptions())).id;

      if (!favoriteAlbumId) {
        throw new Error("收藏夹不可用");
      }

      if (state.isFavorite) {
        await removeFilesFromAlbum(getApiOptions(), favoriteAlbumId, [file.id]);
      } else {
        await addFilesToAlbum(getApiOptions(), favoriteAlbumId, [file.id]);
      }

      return favoriteAlbumId;
    },
    [refresh, serverUrl],
  );

  /**
   * Creates and copies a one-file share link from the preview toolbar.
   */
  const handleSharePreviewFile = useCallback(
    async (file: FolderFileSummary): Promise<void> => {
      const response = await createFileShareLink(getApiOptions(), {
        cover: file.md5,
        desc: file.name,
        fileIds: [file.id],
        linkEndTime: null,
        linkPwd: "",
        showDownload: true,
        showExif: true,
      });
      const shareUrl = createShareUrl(serverUrl, response.key, "");

      await copyTextToClipboard(shareUrl);
    },
    [refresh, serverUrl],
  );

  /**
   * Moves the preview file to recycle bin and refreshes the current folder.
   */
  const handleDeletePreviewFile = useCallback(
    async (file: FolderFileSummary): Promise<void> => {
      await deleteFiles(getApiOptions(), [file.id]);
      setPreviewFile(undefined);
      await loadDirectory(currentFolderId, { forceVisibleLoading: true });
    },
    [currentFolderId, loadDirectory, refresh, serverUrl],
  );

  /**
   * Refreshes server-generated thumbnails for the preview file.
   */
  const handleRefreshPreviewThumbs = useCallback(
    async (file: FolderFileSummary): Promise<void> => {
      await refreshFileThumbs({
        baseUrl: serverUrl,
        fileId: file.id,
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });
    },
    [refresh, serverUrl],
  );

  /**
   * Refreshes face recognition descriptors for the preview file.
   */
  const handleRefreshPreviewDescriptor = useCallback(
    async (file: FolderFileSummary): Promise<number | undefined> => {
      const result = await refreshFileDescriptor({
        baseUrl: serverUrl,
        fileId: file.id,
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });

      return result.n ?? undefined;
    },
    [refresh, serverUrl],
  );

  /**
   * Refreshes EXIF metadata and returns the updated detail panel payload.
   */
  const handleRefreshPreviewInfo = useCallback(
    async (file: FolderFileSummary): Promise<FileDetail> => {
      return refreshFileInfo({
        baseUrl: serverUrl,
        file: {
          id: file.id,
          md5: file.md5,
          name: file.name,
        },
        getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
        onUnauthorized: refresh,
      });
    },
    [refresh, serverUrl],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewFile(undefined);
  }, []);

  const handlePullRefresh = useCallback(() => {
    return loadDirectory(currentFolderId);
  }, [currentFolderId, loadDirectory]);

  const hasOpenOverlay = Boolean(
    previewFile ||
      coverDialogTarget ||
      createFolderOpen ||
      deleteDialogOpen ||
      moveDialogOpen ||
      renameFolderTarget ||
      shareDialogOpen,
  );

  const handleSwipeBack = useCallback((): void => {
    if (currentFolderId === undefined) {
      return;
    }

    if (folderHistoryIndexRef.current > 0) {
      window.history.back();
      return;
    }

    navigateFolder(getParentFolderId(directory));
  }, [currentFolderId, directory, navigateFolder]);

  const swipeBack = useFolderSwipeBack({
    enabled: !hasOpenOverlay && !selectionMode && currentFolderId !== undefined,
    onBack: handleSwipeBack,
  });

  useWorkspacePullToRefresh({
    disabled: hasOpenOverlay || selectionMode,
    loading,
    onRefresh: handlePullRefresh,
  });

  return (
    <section
      className="folders-page"
      onTouchCancel={() => {
        swipeBack.handlers.onTouchCancel();
      }}
      onTouchEnd={() => {
        swipeBack.handlers.onTouchEnd();
      }}
      onTouchMove={swipeBack.handlers.onTouchMove}
      onTouchStart={(event) => {
        swipeBack.handlers.onTouchStart(event);
      }}
    >
      <div className="folder-page-motion-frame">
        <AnimatePresence custom={folderMotionCustom} initial={false} mode="popLayout">
          <motion.div
            animate="center"
            className="folder-page-transition-surface"
            custom={folderMotionCustom}
            exit="exit"
            initial="enter"
            key={folderPageMotionKey}
            transition={FOLDER_PAGE_MOTION_TRANSITION}
            variants={FOLDER_PAGE_MOTION_VARIANTS}
          >
        <FoldersToolbar
          currentFolderId={currentFolderId}
          directory={toolbarDirectory}
          folderCardSize={folderCardSize}
          hasDirectoryContent={hasDirectoryContent}
          loading={loading}
          onChangeCardSize={setFolderCardSize}
          onChangeSortDirection={setSortDirection}
          onChangeSortField={setSortField}
          onNavigateFolder={(folderId, preview) => {
            navigateFolder(folderId, "push", preview);
          }}
          onOpenCreateFolder={() => setCreateFolderOpen(true)}
          onOpenUpload={onOpenUpload}
          onPinCurrentPath={() => {
            setPinnedPath(toolbarDirectory.path || "根目录");
            onShowToast("已置顶当前路径");
          }}
          onRefresh={() => void loadDirectory(currentFolderId, { forceVisibleLoading: true })}
          onToggleFolderCovers={() => setShowFolderCovers((current) => !current)}
          onToggleSelectionMode={handleToggleSelectionMode}
          onToggleViewMode={() =>
            setViewMode((current) => (current === "grid" ? "list" : "grid"))
          }
          selectionMode={selectionMode}
          showFolderCovers={showFolderCovers}
          sortDirection={sortDirection}
          sortField={sortField}
          viewMode={viewMode}
        />

        {pinnedPath ? (
          <div className="folder-pin">已置顶：{pinnedPath}</div>
        ) : null}

        {selectionMode && selectedItems.length > 0 ? (
          <FolderBatchActionBar
            allVisibleSelected={allVisibleSelected}
            fileCount={selectedFileCount}
            folderCount={selectedFolderCount}
            onAction={handleBatchAction}
            onClear={resetDirectorySelection}
            onToggleSelectAll={handleToggleSelectAllVisible}
            selectedCount={selectedItems.length}
            selectableCount={selectionItems.length}
            submittingAction={submittingBatchAction}
          />
        ) : null}

        <div className="folder-summary-grid">
          <FolderMetric
            label="子文件夹"
            value={String(toolbarDirectory.folders.length)}
          />
          <FolderMetric label="直接文件" value={String(directFileCount)} />
          <FolderMetric label="回收站" value={String(toolbarDirectory.trashCount)} />
          <FolderMetric label="扫描中" value={String(scanningCount)} />
        </div>

        {error ? (
          <div className="folder-state">
            <strong>文件夹加载失败</strong>
            <span>{error}</span>
            <button
              className="secondary-btn"
              onClick={() => void loadDirectory(currentFolderId)}
              type="button"
            >
              重试
            </button>
          </div>
        ) : null}

        <div
          className={loadingOverlayVisible ? "folder-content-region is-loading" : "folder-content-region"}
        >
          {showBlockingLoading ? <FolderSkeleton /> : null}

          {showEmptyDirectory ? (
            <div className="folder-state">
              <strong>当前目录没有内容</strong>
              <span>可以上传文件，或返回根目录继续浏览。</span>
              <button
                className="secondary-btn"
                onClick={() => navigateFolder(undefined)}
                type="button"
              >
                返回根目录
              </button>
            </div>
          ) : null}

          {showDirectoryContent ? (
            <div
              className={loading ? "folder-content-shell is-refreshing" : "folder-content-shell"}
            >
              <DirectoryContent
                authCode={authCode}
                cacheEnabled={cacheEnabled}
                cacheFolder={cacheFolder}
                directory={sortedDirectory}
                onOpenFolder={handleOpenFolder}
                onOpenFolderUpload={onOpenUpload}
                onPreviewFile={setPreviewFile}
                onRenameFolder={handleOpenRenameFolder}
                onSetFolderCover={(folder) => {
                  void handleOpenCoverDialog(folder);
                }}
                onToggleSelection={handleToggleSelection}
                folderCardSize={folderCardSize}
                selectedKeys={selectedKeys}
                selectionMode={selectionMode}
                serverUrl={serverUrl}
                showFolderCovers={showFolderCovers}
                viewMode={viewMode}
                loadingOverlayVisible={loadingOverlayVisible}
              />
            </div>
          ) : null}
        </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {loadingOverlayVisible ? (
        <div aria-live="polite" className="folder-loading-fixed-panel">
          <span aria-hidden="true" className="folder-loading-overlay__spinner" />
          <strong>正在加载当前文件夹</strong>
          <span>内容同步完成后会自动更新</span>
        </div>
      ) : null}

      <FilePreviewDialog
        authCode={authCode}
        cacheEnabled={cacheEnabled}
        cacheFolder={cacheFolder}
        file={previewFile}
        files={previewFiles}
        onClose={handleClosePreview}
        onDeleteFile={handleDeletePreviewFile}
        onDownloadFile={handleDownloadFile}
        onLoadFileDetail={handleLoadFileDetail}
        onLoadPreviewAlbums={handleLoadPreviewAlbums}
        onLoadPreviewMembership={handleLoadPreviewMembership}
        onPrepareVideoPreview={handlePrepareVideoPreview}
        onRefreshPreviewDescriptor={handleRefreshPreviewDescriptor}
        onRefreshPreviewInfo={handleRefreshPreviewInfo}
        onRefreshPreviewThumbs={handleRefreshPreviewThumbs}
        onSelectFile={setPreviewFile}
        onShareFile={handleSharePreviewFile}
        onShowToast={onShowToast}
        onTogglePreviewAlbum={handleTogglePreviewAlbum}
        onTogglePreviewFavorite={handleTogglePreviewFavorite}
        serverUrl={serverUrl}
      />

      <CreateFolderDialog
        currentPath={directory.path || "根目录"}
        error={createFolderError}
        name={createFolderName}
        onChangeName={(name) => {
          setCreateFolderName(name);
          setCreateFolderError("");
        }}
        onClose={() => {
          if (!creatingFolder) {
            setCreateFolderOpen(false);
            setCreateFolderError("");
          }
        }}
        onSubmit={handleCreateFolder}
        open={createFolderOpen}
        submitting={creatingFolder}
      />

      <FolderNameDialog
        currentPath={directory.path || "根目录"}
        error={renameFolderError}
        name={renameFolderName}
        onChangeName={(name) => {
          setRenameFolderName(name);
          setRenameFolderError("");
        }}
        onClose={() => {
          if (!renamingFolder) {
            setRenameFolderTarget(undefined);
            setRenameFolderError("");
          }
        }}
        onSubmit={handleRenameFolder}
        open={Boolean(renameFolderTarget)}
        submitLabel="保存"
        submitting={renamingFolder}
        submittingLabel="保存中..."
        title="重命名文件夹"
      />

      <FolderCoverDialog
        autoSubmitting={coverDialogAutoSubmitting}
        authCode={authCode}
        breadcrumbs={coverDialogDirectory.breadcrumbs}
        currentPath={
          coverDialogDirectory.path ||
          coverDialogTarget?.path ||
          coverDialogTarget?.name ||
          "当前文件夹"
        }
        error={coverDialogError}
        files={coverDialogFiles}
        folder={coverDialogTarget}
        folders={coverDialogDirectory.folders}
        loading={coverDialogLoading}
        onAutoSet={handleAutoSetFolderCover}
        onClose={handleCloseCoverDialog}
        onOpenFolder={(folder) => {
          void loadCoverDialogDirectory(folder.id);
        }}
        onOpenFolderId={(folderId) => {
          void loadCoverDialogDirectory(folderId);
        }}
        onSubmit={handleSaveFolderCover}
        onToggleFile={handleToggleCoverFile}
        selectedHashes={coverDialogSelectedHashes}
        serverUrl={serverUrl}
        submitting={coverDialogSubmitting}
      />
      <BatchMoveDialog
        currentDirectory={moveDialogDirectory}
        error={moveDialogError}
        loading={moveDialogLoading}
        onChangeOverwriteMode={setMoveDialogOverwriteMode}
        onClose={() => {
          if (!submittingBatchAction) {
            setMoveDialogOpen(false);
          }
        }}
        onOpenFolder={(folder) => {
          void loadMoveDialogDirectory(folder.id);
        }}
        onOpenFolderId={(folderId) => {
          void loadMoveDialogDirectory(folderId);
        }}
        onOpenRoot={() => {
          void loadMoveDialogDirectory();
        }}
        onSelectTarget={setMoveDialogTarget}
        onSubmit={handleSubmitBatchMove}
        open={moveDialogOpen}
        overwriteMode={moveDialogOverwriteMode}
        selectedSummary={formatSelectionSummary(
          selectedFolderCount,
          selectedFileCount,
        )}
        submitting={submittingBatchAction === "move"}
        target={moveDialogTarget}
      />
      <BatchShareDialog
        fileCount={selectedFileCount}
        onClose={() => {
          if (!submittingBatchAction) {
            setShareDialogOpen(false);
          }
        }}
        onSubmit={handleSubmitBatchShare}
        open={shareDialogOpen}
        submitting={submittingBatchAction === "share"}
      />
      <BatchDeleteConfirmDialog
        onClose={() => {
          if (!submittingBatchAction) {
            setDeleteDialogOpen(false);
          }
        }}
        onConfirm={handleConfirmBatchDelete}
        open={deleteDialogOpen}
        selectedSummary={formatSelectionSummary(
          selectedFolderCount,
          selectedFileCount,
        )}
        submitting={submittingBatchAction === "delete"}
      />
    </section>
  );
};

/**
 * Chooses the slide direction from folder hierarchy instead of raw history action.
 */
const getFolderPageMotionDirection = (
  directory: FolderDirectory,
  folderId: number | undefined,
  preview?: FolderNavigationPreview,
): FolderPageMotionDirection => {
  if (folderId === undefined) {
    return "backward";
  }

  const currentDepth = directory.breadcrumbs.length;
  const nextDepth = preview?.breadcrumbs.length;

  if (nextDepth !== undefined) {
    return nextDepth < currentDepth ? "backward" : "forward";
  }

  const targetIsAncestor = directory.breadcrumbs.some(
    (item) => getBreadcrumbItemId(item) === folderId,
  );

  return targetIsAncestor ? "backward" : "forward";
};

/**
 * Creates a temporary directory shell so breadcrumbs update before API data lands.
 */
const createOptimisticDirectory = (
  folderId: number | undefined,
  preview?: FolderNavigationPreview,
): FolderDirectory | undefined => {
  if (folderId === undefined) {
    return createEmptyDirectory();
  }

  if (!preview) {
    return undefined;
  }

  return {
    ...createEmptyDirectory(),
    breadcrumbs: preview.breadcrumbs.map(normalizeNavigationBreadcrumb),
    folderId,
    path: preview.path || createBreadcrumbPath(preview.breadcrumbs),
  };
};

/**
 * Builds a breadcrumb preview when entering a visible child folder.
 */
const createChildFolderNavigationPreview = (
  directory: FolderDirectory,
  folder: FolderSummary,
): FolderNavigationPreview => {
  const path = folder.path || joinFolderPath(directory.path, folder.name);
  const nextBreadcrumb: FolderBreadcrumbItem = {
    folderId: folder.id,
    id: folder.id,
    name: folder.name,
    path,
  };

  return {
    breadcrumbs: [...directory.breadcrumbs, nextBreadcrumb],
    folderId: folder.id,
    path,
  };
};

/**
 * Reuses the current breadcrumb chain for browser back/forward previews.
 */
const createBreadcrumbNavigationPreview = (
  directory: FolderDirectory,
  folderId: number | undefined,
): FolderNavigationPreview | undefined => {
  if (folderId === undefined) {
    return {
      breadcrumbs: [],
      path: '',
    };
  }

  const breadcrumbIndex = directory.breadcrumbs.findIndex(
    (item) => getBreadcrumbItemId(item) === folderId,
  );

  if (breadcrumbIndex < 0) {
    return undefined;
  }

  const breadcrumbs = directory.breadcrumbs.slice(0, breadcrumbIndex + 1);

  return {
    breadcrumbs,
    folderId,
    path: breadcrumbs[breadcrumbs.length - 1]?.path || createBreadcrumbPath(breadcrumbs),
  };
};

const normalizeNavigationBreadcrumb = (
  item: FolderBreadcrumbItem,
): FolderBreadcrumbItem => {
  const id = getBreadcrumbItemId(item);

  return {
    ...item,
    folderId: id,
    id,
  };
};

const getBreadcrumbItemId = (
  item: FolderBreadcrumbItem,
): number | undefined => {
  return item.id ?? item.folderId ?? item.galleryFolderId;
};

const createBreadcrumbPath = (breadcrumbs: FolderBreadcrumbItem[]): string => {
  return breadcrumbs.map((item) => item.name).filter(Boolean).join('/');
};

const joinFolderPath = (parentPath: string, folderName: string): string => {
  if (!parentPath) {
    return folderName;
  }

  return `${parentPath.replace(/\/$/, '')}/${folderName}`;
};

/**
 * Finds the parent folder id from the current breadcrumb chain.
 */
const getParentFolderId = (directory: FolderDirectory): number | undefined => {
  const parent = directory.breadcrumbs
    .slice(0, -1)
    .reverse()
    .find((item) => item.id !== undefined && item.id > 0);

  return parent?.id;
};
