import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import type { GestureResponderEvent, StyleProp, ViewStyle } from 'react-native';

import type {
  AdminDuplicateFileDeletePayload,
  AdminDuplicateFileRecord,
  AdminGallery,
  ApiClientOptions,
} from '@kwphoto/core';
import {
  createThumbnailUrl,
  deleteAdminDuplicateFile,
  findAdminDuplicateFiles,
  getApiErrorMessage,
} from '@kwphoto/core';

import { MobileBottomSheetModal } from '../../components/MobileDialog';
import { MOBILE_SAGE_SLATE, useMobileTheme } from '../../mobile-theme';
import type {
  MobileDuplicateFilesAutoSelectMode,
  MobileDuplicateFilesPageSize,
  MobilePreferences,
} from '../../mobile-storage';
import { mergeMobilePreferences, readMobilePreferences } from '../../mobile-storage';
import { formatFileSize } from '../adminFormatters';
import { styles } from '../adminStyles';
import type { AdminIconName } from '../adminTypes';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 500, 1000] as const;
const DELETE_QUEUE_CONCURRENCY = 5;
const AUTO_SELECT_RULES = [
  {
    description: '选中每项重复文件中的第 2-N 个文件',
    label: '按顺序选中',
    value: 'order',
  },
  {
    description: '保留最早修改的文件，选中其余的 2-N 个文件',
    label: '按修改时间选中',
    value: 'mtime',
  },
  {
    description: '保留最早拍摄的文件，选中其余的 2-N 个文件',
    label: '按拍摄时间选中',
    value: 'token_at',
  },
  {
    description: '选中包含关键字的文件',
    label: '按路径选中',
    value: 'path',
  },
] as const;
const AUTO_SELECT_PATH_EXAMPLE = 'IMG_\\d{4}\\.HEIC';
const DEFAULT_DUPLICATE_FILES_PAGE_SIZE: MobileDuplicateFilesPageSize = 1000;

type AutoSelectMode = (typeof AUTO_SELECT_RULES)[number]['value'];

interface MobileDuplicateFilesSheetProps {
  apiOptions: ApiClientOptions;
  authCode?: string;
  galleries: AdminGallery[];
  onClose: () => void;
  onEnsureAuthCode?: () => Promise<string | undefined>;
  onMessage: (message: string) => void;
  open: boolean;
}

interface DuplicateFileGroup {
  files: AdminDuplicateFileRecord[];
  key: string;
  md5: string;
}

interface AutoSelectOptions {
  mode: AutoSelectMode;
  pathKeyword: string;
  useRegex: boolean;
}

interface DeleteProgress {
  finished: number;
  total: number;
}

interface DuplicateDeleteQueueResult {
  file: AdminDuplicateFileRecord;
  reason?: unknown;
  status: 'fulfilled' | 'rejected';
}

/**
 * Renders duplicate-file scan results in a mobile bottom sheet.
 */
export const MobileDuplicateFilesSheet = ({
  apiOptions,
  authCode,
  galleries,
  onClose,
  onEnsureAuthCode,
  onMessage,
  open,
}: MobileDuplicateFilesSheetProps) => {
  const theme = useMobileTheme();
  const [actionLoading, setActionLoading] = useState('');
  const [autoSelectError, setAutoSelectError] = useState('');
  const [autoSelectMode, setAutoSelectMode] = useState<AutoSelectMode>('order');
  const [autoSelectOpen, setAutoSelectOpen] = useState(false);
  const [autoSelectPathKeyword, setAutoSelectPathKeyword] = useState('');
  const [autoSelectUseRegex, setAutoSelectUseRegex] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<DeleteProgress>({ finished: 0, total: 0 });
  const [error, setError] = useState('');
  const [files, setFiles] = useState<AdminDuplicateFileRecord[]>([]);
  const [galleryDraftIds, setGalleryDraftIds] = useState<number[]>([]);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [multiSelect, setMultiSelect] = useState(true);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(DEFAULT_DUPLICATE_FILES_PAGE_SIZE);
  const [resolvedAuthCode, setResolvedAuthCode] = useState(authCode);
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());
  const [showThumbnails, setShowThumbnails] = useState(true);
  const deferredSelectedKeys = useDeferredValue(selectedKeys);
  const [, startSelectionTransition] = useTransition();
  const autoLoadKeyRef = useRef('');
  const availableGalleryOptions = useMemo(() => createGalleryOptions(galleries), [galleries]);
  const groups = useMemo(() => createDuplicateFileGroups(files), [files]);
  const sortedGroups = useMemo(() => sortDuplicateFileGroupsBySelection(groups, deferredSelectedKeys), [deferredSelectedKeys, groups]);
  const totalPages = Math.max(1, Math.ceil(sortedGroups.length / pageSize));
  const safePageNo = Math.min(pageNo, totalPages);
  const pagedGroups = useMemo(() => {
    const startIndex = (safePageNo - 1) * pageSize;

    return sortedGroups.slice(startIndex, startIndex + pageSize);
  }, [pageSize, safePageNo, sortedGroups]);
  const hasAutoSelectCandidates = pagedGroups.some((group) => group.files.length > 1);
  const selectedFiles = useMemo(() => {
    return files.filter((file) => selectedKeys.has(createDuplicateFileKey(file)));
  }, [files, selectedKeys]);
  const allGallerySelected = availableGalleryOptions.length > 0 && selectedGalleryIds.length === availableGalleryOptions.length;
  const allDraftGalleriesSelected = availableGalleryOptions.length > 0 && galleryDraftIds.length === availableGalleryOptions.length;

  /**
   * Stores duplicate-file display preferences in the shared mobile preference bucket.
   */
  const persistDuplicateFilesPreferences = useCallback((
    preferences: Partial<Pick<MobilePreferences, 'duplicateFilesAutoSelectMode' | 'duplicateFilesPageSize' | 'duplicateFilesShowThumbnails'>>,
  ): void => {
    void mergeMobilePreferences(preferences);
  }, []);

  /**
   * Requests duplicate files for the selected gallery scope.
   */
  const loadDuplicateFiles = useCallback(async (targetGalleryIds: number[]): Promise<void> => {
    if (targetGalleryIds.length === 0) {
      setFiles([]);
      setHasChecked(false);
      setError('请先选择要检查的图库');
      return;
    }

    setError('');
    setHasChecked(false);
    setLoading(true);

    try {
      const duplicateFiles = await findAdminDuplicateFiles(apiOptions, targetGalleryIds);

      setFiles(duplicateFiles);
      setHasChecked(true);
      setPageNo(1);
      setSelectedKeys(new Set());
      onMessage(duplicateFiles.length > 0 ? `发现 ${duplicateFiles.length} 个重复文件` : '没有发现重复文件');
    } catch (requestError) {
      setFiles([]);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions, onMessage]);

  useEffect(() => {
    let ignore = false;

    void readMobilePreferences().then((preferences) => {
      if (ignore) {
        return;
      }

      setPageSize(normalizeDuplicateFilesPageSize(preferences.duplicateFilesPageSize));
      setShowThumbnails(preferences.duplicateFilesShowThumbnails ?? true);

      if (isDuplicateFilesAutoSelectMode(preferences.duplicateFilesAutoSelectMode)) {
        setAutoSelectMode(preferences.duplicateFilesAutoSelectMode);
      }
    });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      autoLoadKeyRef.current = '';
      setActionLoading('');
      setAutoSelectError('');
      setAutoSelectOpen(false);
      setError('');
      setFiles([]);
      setGalleryDraftIds([]);
      setGalleryPickerOpen(false);
      setHasChecked(false);
      setDeleteProgress({ finished: 0, total: 0 });
      setPageNo(1);
      setResolvedAuthCode(authCode);
      setSelectedGalleryIds([]);
      setSelectedKeys(new Set());
      return;
    }

    const defaultGalleryIds = availableGalleryOptions.map((gallery) => gallery.id);
    const autoLoadKey = defaultGalleryIds.join(',');

    // React 开发模式和父组件重渲染都可能让 effect 再跑一次，同一图库范围只自动扫描一次。
    if (autoLoadKeyRef.current === autoLoadKey) {
      return;
    }

    autoLoadKeyRef.current = autoLoadKey;
    setSelectedGalleryIds(defaultGalleryIds);
    void loadDuplicateFiles(defaultGalleryIds);
  }, [availableGalleryOptions, loadDuplicateFiles, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (authCode) {
      setResolvedAuthCode(authCode);
      return;
    }

    if (!onEnsureAuthCode) {
      return;
    }

    let ignore = false;

    void onEnsureAuthCode().then((nextAuthCode) => {
      if (!ignore && nextAuthCode) {
        setResolvedAuthCode(nextAuthCode);
      }
    }).catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [authCode, onEnsureAuthCode, open]);

  useEffect(() => {
    if (pageNo > totalPages) {
      setPageNo(totalPages);
    }
  }, [pageNo, totalPages]);

  /**
   * Opens the gallery picker with a draft copy so cancel does not alter the active scan scope.
   */
  const handleOpenGalleryPicker = (): void => {
    setGalleryDraftIds(selectedGalleryIds);
    setGalleryPickerOpen(true);
  };

  /**
   * Selects all galleries in the picker draft, or clears the draft when everything is selected.
   */
  const handleToggleAllGalleryDrafts = (): void => {
    setGalleryDraftIds(allDraftGalleriesSelected ? [] : availableGalleryOptions.map((gallery) => gallery.id));
  };

  /**
   * Toggles one gallery id in the picker draft list.
   */
  const handleToggleGalleryDraft = (galleryId: number): void => {
    setGalleryDraftIds((current) => {
      const next = current.includes(galleryId)
        ? current.filter((id) => id !== galleryId)
        : [...current, galleryId];

      return next.sort((first, second) => first - second);
    });
  };

  /**
   * Applies the selected gallery scope and immediately refreshes duplicate results.
   */
  const handleConfirmGalleryPicker = (): void => {
    const nextGalleryIds = [...galleryDraftIds].sort((first, second) => first - second);

    setSelectedGalleryIds(nextGalleryIds);
    setGalleryPickerOpen(false);
    resetResultAfterScopeChange();
    void loadDuplicateFiles(nextGalleryIds);
  };

  /**
   * Toggles one duplicate row by stable key.
   */
  const handleToggleFile = useCallback((file: AdminDuplicateFileRecord): void => {
    const fileKey = createDuplicateFileKey(file);
    const wasSelected = selectedKeys.has(fileKey);

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(fileKey)) {
        next.delete(fileKey);
      } else {
        next.add(fileKey);
      }

      return next;
    });

    if (!wasSelected) {
      startSelectionTransition(() => setPageNo(1));
    }
  }, [selectedKeys, startSelectionTransition]);

  /**
   * Updates the page size and persists it for future duplicate-file checks.
   */
  const handleChangePageSize = (nextPageSize: (typeof PAGE_SIZE_OPTIONS)[number]): void => {
    setPageSize(nextPageSize);
    setPageNo(1);
    persistDuplicateFilesPreferences({ duplicateFilesPageSize: nextPageSize });
  };

  /**
   * Toggles thumbnail visibility and persists the display choice.
   */
  const handleToggleThumbnails = (): void => {
    setShowThumbnails((current) => {
      const nextValue = !current;

      persistDuplicateFilesPreferences({ duplicateFilesShowThumbnails: nextValue });
      return nextValue;
    });
  };

  /**
   * Keeps the selected one-click rule in storage as soon as it changes.
   */
  const handleChangeAutoSelectMode = (mode: AutoSelectMode): void => {
    setAutoSelectMode(mode);
    persistDuplicateFilesPreferences({ duplicateFilesAutoSelectMode: mode });
  };

  /**
   * Opens one-click selection and keeps unavailable-state feedback inside the sheet.
   */
  const handleOpenAutoSelect = (): void => {
    setAutoSelectError(hasAutoSelectCandidates ? '' : '当前页没有可一键选中的重复组。');
    setAutoSelectOpen(true);
  };

  /**
   * Applies the selected one-click rule to the current page of duplicate groups.
   */
  const handleApplyAutoSelect = (): void => {
    const result = createAutoSelectedFiles(pagedGroups, {
      mode: autoSelectMode,
      pathKeyword: autoSelectPathKeyword,
      useRegex: autoSelectUseRegex,
    });

    if (result.error) {
      setAutoSelectError(result.error);
      return;
    }

    setSelectedKeys((current) => {
      const next = new Set(current);

      result.files.forEach((file) => next.add(createDuplicateFileKey(file)));

      return next;
    });
    startSelectionTransition(() => setPageNo(1));
    setAutoSelectError('');
    setAutoSelectOpen(false);
    onMessage(`已选中 ${result.files.length} 个重复文件`);
  };

  /**
   * Calls the server cleanup endpoint and removes successfully deleted rows.
   */
  const submitDeleteFiles = useCallback(async (targets: AdminDuplicateFileRecord[]): Promise<void> => {
    setActionLoading('delete');
    setDeleteProgress({ finished: 0, total: targets.length });
    setError('');

    try {
      const results = await runDuplicateFileDeleteQueue({
        apiOptions,
        files: targets,
        galleryIds: selectedGalleryIds,
        onProgress: (finished) => setDeleteProgress({ finished, total: targets.length }),
      });
      const deletedKeys = new Set<string>();

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          deletedKeys.add(createDuplicateFileKey(result.file));
        }
      });

      setFiles((current) => current.filter((file) => !deletedKeys.has(createDuplicateFileKey(file))));
      setSelectedKeys((current) => new Set([...current].filter((key) => !deletedKeys.has(key))));

      const failedCount = results.length - deletedKeys.size;

      if (failedCount > 0) {
        setError(`已删除 ${deletedKeys.size} 个，${failedCount} 个删除失败，请刷新后重试。`);
      }

      onMessage(failedCount > 0 ? `已删除 ${deletedKeys.size} 个，${failedCount} 个失败` : `已删除 ${deletedKeys.size} 个重复文件`);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
      setDeleteProgress({ finished: 0, total: 0 });
    }
  }, [apiOptions, selectedGalleryIds, onMessage]);

  /**
   * Deletes duplicate files after the native destructive confirmation.
   */
  const handleConfirmDeleteFiles = useCallback((targets: AdminDuplicateFileRecord[]): void => {
    const deletableTargets = targets.filter((file) => getDuplicateFileDeletePayload(file, selectedGalleryIds));

    if (deletableTargets.length === 0) {
      onMessage('缺少重复文件 ID 或 MD5，无法删除');
      return;
    }

    Alert.alert(
      '删除重复文件',
      `确定删除 ${deletableTargets.length} 个重复文件吗？文件会直接从服务端删除。`,
      [
        { style: 'cancel', text: '取消' },
        {
          onPress: () => void submitDeleteFiles(deletableTargets),
          style: 'destructive',
          text: '删除',
        },
      ],
    );
  }, [selectedGalleryIds, onMessage, submitDeleteFiles]);

  /**
   * Clears stale results after the gallery scope changes.
   */
  const resetResultAfterScopeChange = (): void => {
    setFiles([]);
    setHasChecked(false);
    setError('');
    setPageNo(1);
    setSelectedKeys(new Set());
  };

  const renderDuplicateGroup = useCallback((rowInfo: ListRenderItemInfo<DuplicateFileGroup>) => {
    const { item } = rowInfo;
    const selectedCount = countSelectedFilesInGroup(item, selectedKeys);
    const thumbnailUrl = showThumbnails ? createDuplicateFileThumbnailUrl({
      authCode: resolvedAuthCode,
      baseUrl: apiOptions.baseUrl,
      file: item.files[0],
    }) : undefined;

    return (
      <View style={[styles.duplicateFilesGroupCard, selectedCount > 0 ? { borderColor: theme.light } : null]}>
        <View style={[styles.duplicateFilesGroupHeader, selectedCount > 0 ? { backgroundColor: theme.selection } : null]}>
          <View style={styles.duplicateFilesGroupHeaderTitle}>
            <Text numberOfLines={1} style={[styles.duplicateFilesGroupHeaderName, selectedCount > 0 ? { color: theme.hex } : null]}>
              重复组 · {item.files.length} 个文件
            </Text>
            <Text numberOfLines={1} style={styles.duplicateFilesGroupHeaderMd5}>MD5:{item.md5}</Text>
          </View>
          {selectedCount > 0 ? (
            <Text style={[styles.duplicateFilesGroupSelectedBadge, { color: theme.hex, borderColor: theme.light }]}>
              已选 {selectedCount}
            </Text>
          ) : null}
        </View>
        <View style={styles.duplicateFilesGroupBody}>
          <View style={[styles.duplicateFilesPreviewColumn, !showThumbnails ? styles.duplicateFilesPreviewColumnCompact : null]}>
            <View style={[styles.duplicateFilesPreview, !showThumbnails ? styles.duplicateFilesPreviewCompact : null]}>
              {showThumbnails && thumbnailUrl ? (
                <Image resizeMode="cover" source={{ uri: thumbnailUrl }} style={styles.duplicateFilesPreviewImage} />
              ) : (
                <Ionicons color={theme.hex} name={showThumbnails ? 'image-outline' : 'albums-outline'} size={showThumbnails ? 24 : 20} />
              )}
              <Text style={styles.duplicateFilesPreviewBadge}>{item.files.length}</Text>
            </View>
          </View>

          <View style={styles.duplicateFilesGroupRows}>
            {item.files.map((file, index) => {
              const fileKey = createDuplicateFileKey(file);
              const checked = selectedKeys.has(fileKey);
              const canDelete = Boolean(getDuplicateFileDeletePayload(file, selectedGalleryIds));

              return (
                <Pressable
                  key={fileKey}
                  onPress={multiSelect ? () => handleToggleFile(file) : undefined}
                  style={[
                    styles.duplicateFilesRow,
                    checked ? { borderColor: theme.light, backgroundColor: theme.selection } : null,
                  ]}
                >
                  {multiSelect ? (
                    <View style={styles.duplicateFilesRowIcon}>
                      <Ionicons
                        color={checked ? theme.hex : MOBILE_SAGE_SLATE.subtle}
                        name={checked ? 'checkbox-outline' : 'square-outline'}
                        size={20}
                      />
                    </View>
                  ) : null}
                  <View style={styles.duplicateFilesRowCopy}>
                    <Text numberOfLines={2} style={styles.duplicateFilesRowTitle}>{formatDuplicateFilePath(file)}</Text>
                    <Text numberOfLines={1} style={styles.duplicateFilesRowMeta}>{index === 0 ? '保留参考' : '重复项'} · {formatDuplicateFileTime(file)}</Text>
                    <View style={styles.duplicateFilesRowPills}>
                      <Text numberOfLines={1} style={styles.duplicateFilesPill}>{formatFileSize(file.size)}</Text>
                      <Text numberOfLines={1} style={styles.duplicateFilesPill}>图库 {file.galleryIds.join(',') || '-'}</Text>
                    </View>
                  </View>
                  <Pressable
                    disabled={!canDelete || actionLoading === 'delete'}
                    onPress={(event) => {
                      event.stopPropagation();
                      handleConfirmDeleteFiles([file]);
                    }}
                    style={[
                      styles.duplicateFilesDeleteButton,
                      !canDelete || actionLoading === 'delete' ? styles.disabledButton : null,
                    ]}
                  >
                    <Ionicons color="#b91c1c" name="trash-outline" size={15} />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    );
  }, [actionLoading, apiOptions.baseUrl, handleConfirmDeleteFiles, handleToggleFile, multiSelect, resolvedAuthCode, selectedGalleryIds, selectedKeys, showThumbnails, theme.hex, theme.light, theme.selection]);

  return (
    <>
      <MobileBottomSheetModal
        avoidKeyboard
        backdropStyle={styles.modalOverlay}
        closeOnBackdrop={!galleryPickerOpen && !autoSelectOpen}
        contentStyle={[styles.editorSheet, styles.duplicateFilesSheet]}
        onClose={onClose}
        visible={open}
      >
      <View style={styles.modalHeader}>
        <View style={styles.modalTitleWrap}>
          <Text style={styles.modalTitle}>检查重复文件</Text>
          <Text style={styles.modalSubtitle}>按 MD5 分组展示，默认保留每组第一条。</Text>
        </View>
        <View style={styles.duplicateFilesHeaderActions}>
          <Pressable
            disabled={loading || selectedGalleryIds.length === 0}
            onPress={() => void loadDuplicateFiles(selectedGalleryIds)}
            style={[styles.editorSmallButton, loading || selectedGalleryIds.length === 0 ? styles.disabledButton : null]}
          >
            {loading ? <ActivityIndicator color={theme.hex} size="small" /> : <Ionicons color={theme.hex} name="refresh-outline" size={18} />}
          </Pressable>
          <Pressable onPress={onClose} style={styles.editorSmallButton}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.duplicateFilesSummary}>
        <DuplicateFilesMetric label={loading ? '正在读取' : '重复组'} value={loading ? '-' : String(groups.length)} />
        <DuplicateFilesMetric label="文件" value={String(files.length)} />
        <DuplicateFilesMetric label="已选择" value={String(selectedFiles.length)} />
      </View>

      <View style={styles.duplicateFilesWarning}>
        <Ionicons color="#b45309" name="warning-outline" size={16} />
        <Text style={styles.duplicateFilesWarningText}>删除会直接清理服务端文件，请先确认备份。</Text>
      </View>

      <View style={styles.duplicateFilesScopeBar}>
        <Pressable onPress={handleOpenGalleryPicker} style={styles.duplicateFilesScopeButton}>
          <Ionicons color={theme.hex} name="albums-outline" size={16} />
          <Text numberOfLines={1} style={styles.duplicateFilesScopeButtonText}>
            {allGallerySelected ? '全部图库' : `图库 ${selectedGalleryIds.length}/${availableGalleryOptions.length}`}
          </Text>
        </Pressable>
        <Pressable
          disabled={loading || selectedGalleryIds.length === 0}
          onPress={() => void loadDuplicateFiles(selectedGalleryIds)}
          style={[styles.duplicateFilesScopeButton, loading || selectedGalleryIds.length === 0 ? styles.disabledButton : null]}
        >
          {loading ? <ActivityIndicator color={theme.hex} size="small" /> : <Ionicons color={theme.hex} name="refresh-outline" size={16} />}
          <Text numberOfLines={1} style={styles.duplicateFilesScopeButtonText}>按所选检查</Text>
        </Pressable>
      </View>

      <View style={styles.duplicateFilesActions}>
        <DuplicateFilesAction
          icon="checkmark-done-outline"
          label="一键选中"
          disabled={!multiSelect}
          onPress={handleOpenAutoSelect}
        />
        <DuplicateFilesAction
          danger
          icon="trash-outline"
          label={actionLoading === 'delete' ? formatDeleteProgress(deleteProgress) : `批量删除 (${selectedFiles.length})`}
          disabled={!multiSelect || selectedFiles.length === 0 || actionLoading === 'delete'}
          onPress={() => handleConfirmDeleteFiles(selectedFiles)}
        />
        <DuplicateFilesAction
          icon={multiSelect ? 'checkbox-outline' : 'square-outline'}
          label="多选模式"
          onPress={() => setMultiSelect((current) => !current)}
        />
        <DuplicateFilesAction
          icon={showThumbnails ? 'image-outline' : 'albums-outline'}
          label={showThumbnails ? '隐藏缩略图' : '显示缩略图'}
          onPress={handleToggleThumbnails}
        />
      </View>

      <View style={styles.duplicateFilesPager}>
        <Pressable disabled={safePageNo <= 1} onPress={() => setPageNo((current) => Math.max(1, current - 1))} style={styles.threadStepButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="chevron-back-outline" size={16} />
        </Pressable>
        <Text style={styles.duplicateFilesPagerText}>{safePageNo} / {totalPages}</Text>
        <Pressable disabled={safePageNo >= totalPages} onPress={() => setPageNo((current) => Math.min(totalPages, current + 1))} style={styles.threadStepButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="chevron-forward-outline" size={16} />
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.duplicateFilesPageSizeList}>
            {PAGE_SIZE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  handleChangePageSize(option);
                }}
                style={[
                  styles.duplicateFilesPageSizeChip,
                  pageSize === option ? { borderColor: theme.light, backgroundColor: theme.selection } : null,
                ]}
              >
                <Text style={[styles.duplicateFilesPageSizeText, pageSize === option ? { color: theme.hex } : null]}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {error ? <Text style={styles.deletedFilesError}>{error}</Text> : null}
      {loading ? <Text style={styles.deletedFilesStateText}>正在检查重复文件...</Text> : null}
      {!loading && !error && !hasChecked ? <Text style={styles.emptyText}>选择图库后，点击“按所选检查”获取重复文件</Text> : null}
      {!loading && !error && hasChecked && groups.length === 0 ? <Text style={styles.emptyText}>无重复文件</Text> : null}

      {pagedGroups.length > 0 ? (
        <FlatList
          contentContainerStyle={styles.duplicateFilesList}
          data={pagedGroups}
          extraData={selectedKeys}
          initialNumToRender={8}
          keyExtractor={(group) => group.key}
          keyboardShouldPersistTaps="handled"
          maxToRenderPerBatch={8}
          nestedScrollEnabled
          renderItem={renderDuplicateGroup}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          style={styles.duplicateFilesListFrame}
          updateCellsBatchingPeriod={40}
          windowSize={7}
        />
      ) : null}

      <DuplicateFilesSheetDialog
        contentStyle={styles.duplicateFilesGalleryDialog}
        onClose={() => setGalleryPickerOpen(false)}
        visible={galleryPickerOpen}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle}>选择图库</Text>
            <Text style={styles.modalSubtitle}>按所选图库范围重新检查重复文件。</Text>
          </View>
          <Pressable onPress={() => setGalleryPickerOpen(false)} style={styles.editorSmallButton}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={18} />
          </Pressable>
        </View>

        <View style={styles.duplicateFilesGalleryDialogTools}>
          <Pressable onPress={handleToggleAllGalleryDrafts} style={[styles.duplicateFilesGalleryDialogTool, { borderColor: theme.light, backgroundColor: theme.selection }]}>
            <Text style={[styles.duplicateFilesGalleryAllText, { color: theme.hex }]}>{allDraftGalleriesSelected ? '取消全选' : '全选'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const draftSet = new Set(galleryDraftIds);
              setGalleryDraftIds(availableGalleryOptions
                .filter((gallery) => !draftSet.has(gallery.id))
                .map((gallery) => gallery.id)
                .sort((first, second) => first - second));
            }}
            style={styles.duplicateFilesGalleryDialogTool}
          >
            <Text style={styles.duplicateFilesGalleryDialogToolText}>反选</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.duplicateFilesGalleryDialogCount}>
            已选 {galleryDraftIds.length}/{availableGalleryOptions.length}
          </Text>
        </View>

        <ScrollView style={styles.duplicateFilesGalleryDialogList}>
          <View style={styles.duplicateFilesGalleryDialogGrid}>
            {availableGalleryOptions.map((gallery) => {
              const selected = galleryDraftIds.includes(gallery.id);

              return (
                <Pressable
                  key={gallery.id}
                  onPress={() => handleToggleGalleryDraft(gallery.id)}
                  style={[
                    styles.duplicateFilesGalleryChip,
                    selected ? { borderColor: theme.light, backgroundColor: theme.selection } : null,
                  ]}
                >
                  <Ionicons
                    color={selected ? theme.hex : MOBILE_SAGE_SLATE.subtle}
                    name={selected ? 'checkbox-outline' : 'square-outline'}
                    size={16}
                  />
                  <Text numberOfLines={1} style={[styles.duplicateFilesGalleryChipText, selected ? { color: theme.hex } : null]}>{gallery.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.dialogActions}>
          <Pressable
            disabled={galleryDraftIds.length === 0}
            onPress={handleConfirmGalleryPicker}
            style={[
              styles.dialogPrimaryButton,
              { backgroundColor: theme.hex },
              galleryDraftIds.length === 0 ? styles.disabledButton : null,
            ]}
          >
            <Text style={styles.dialogPrimaryText}>确定并检查</Text>
          </Pressable>
        </View>
      </DuplicateFilesSheetDialog>

      <DuplicateFilesSheetDialog
        contentStyle={styles.duplicateFilesSelectDialog}
        onClose={() => {
          setAutoSelectError('');
          setAutoSelectOpen(false);
        }}
        visible={autoSelectOpen}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleWrap}>
            <Text style={styles.modalTitle}>一键选中</Text>
            <Text style={styles.modalSubtitle}>按所选规则勾选当前分页内的重复文件。</Text>
          </View>
          <Pressable
            onPress={() => {
              setAutoSelectError('');
              setAutoSelectOpen(false);
            }}
            style={styles.editorSmallButton}
          >
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={18} />
          </Pressable>
        </View>

        <View style={styles.duplicateFilesSelectRules}>
          {AUTO_SELECT_RULES.map((rule) => {
            const active = autoSelectMode === rule.value;

            return (
              <Pressable
                key={rule.value}
                onPress={() => {
                  setAutoSelectError('');
                  handleChangeAutoSelectMode(rule.value);
                }}
                style={[
                  styles.duplicateFilesSelectRule,
                  active ? { borderColor: theme.light, backgroundColor: theme.selection } : null,
                ]}
              >
                <Ionicons
                  color={active ? theme.hex : MOBILE_SAGE_SLATE.subtle}
                  name={active ? 'radio-button-on-outline' : 'radio-button-off-outline'}
                  size={19}
                />
                <View style={styles.duplicateFilesSelectRuleCopy}>
                  <Text style={[styles.duplicateFilesSelectRuleTitle, active ? { color: theme.hex } : null]}>{rule.label}</Text>
                  <Text style={[styles.duplicateFilesSelectRuleDesc, active ? { color: theme.hex } : null]}>{rule.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {autoSelectMode === 'path' ? (
          <View style={styles.duplicateFilesPathRule}>
            <Text style={styles.formLabel}>关键字</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(value) => {
                setAutoSelectError('');
                setAutoSelectPathKeyword(value);
              }}
              placeholder="输入文件路径或文件名关键字"
              placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
              style={styles.input}
              value={autoSelectPathKeyword}
            />
            <Pressable
              onPress={() => {
                setAutoSelectError('');
                setAutoSelectUseRegex((current) => !current);
              }}
              style={styles.duplicateFilesRegexSwitch}
            >
              <Ionicons
                color={autoSelectUseRegex ? theme.hex : MOBILE_SAGE_SLATE.subtle}
                name={autoSelectUseRegex ? 'checkbox-outline' : 'square-outline'}
                size={18}
              />
              <Text style={[styles.duplicateFilesRegexText, autoSelectUseRegex ? { color: theme.hex } : null]}>开启正则匹配</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAutoSelectPathKeyword(AUTO_SELECT_PATH_EXAMPLE);
                setAutoSelectUseRegex(true);
                setAutoSelectError('');
              }}
              style={styles.duplicateFilesExampleButton}
            >
              <Text style={styles.duplicateFilesExampleText}>举例：如果要匹配 IMG_0131.HEIC，那么可以输入 {AUTO_SELECT_PATH_EXAMPLE}</Text>
            </Pressable>
          </View>
        ) : null}

        {autoSelectError ? <Text style={styles.deletedFilesError}>{autoSelectError}</Text> : null}

        <View style={styles.dialogActions}>
          <Pressable onPress={handleApplyAutoSelect} style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}>
            <Text style={styles.dialogPrimaryText}>确定</Text>
          </Pressable>
        </View>
      </DuplicateFilesSheetDialog>
      </MobileBottomSheetModal>
    </>
  );
};

interface DuplicateFilesSheetDialogProps {
  children: ReactNode;
  contentStyle: StyleProp<ViewStyle>;
  onClose: () => void;
  visible: boolean;
}

/**
 * Renders secondary duplicate-file dialogs inside the existing bottom-sheet Modal.
 */
const DuplicateFilesSheetDialog = ({
  children,
  contentStyle,
  onClose,
  visible,
}: DuplicateFilesSheetDialogProps) => {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.duplicateFilesSheetDialogLayer}>
      <Pressable onPress={onClose} style={styles.duplicateFilesSheetDialogBackdrop}>
        <Pressable onPress={stopDuplicateFilesSheetDialogPress} style={[styles.duplicateFilesSheetDialogContent, contentStyle]}>
          {children}
        </Pressable>
      </Pressable>
    </View>
  );
};

/**
 * Prevents taps inside an inline dialog from closing its backdrop.
 */
const stopDuplicateFilesSheetDialogPress = (event: GestureResponderEvent): void => {
  event.stopPropagation();
};

const DuplicateFilesMetric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.duplicateFilesMetric}>
    <Text numberOfLines={1} style={styles.duplicateFilesMetricValue}>{value}</Text>
    <Text numberOfLines={1} style={styles.duplicateFilesMetricLabel}>{label}</Text>
  </View>
);

const DuplicateFilesAction = ({
  danger = false,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) => {
  const theme = useMobileTheme();
  const color = danger ? '#b91c1c' : theme.hex;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.duplicateFilesActionButton,
        { backgroundColor: danger ? '#fff1f2' : theme.selection, borderColor: danger ? '#fecaca' : theme.light },
        disabled || loading ? styles.disabledButton : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons color={color} name={icon} size={15} />}
      <Text numberOfLines={1} style={[styles.duplicateFilesActionText, { color }]}>{label}</Text>
    </Pressable>
  );
};

const createDuplicateFileKey = (file: AdminDuplicateFileRecord): string => {
  return `${file.id}-${file.md5}-${file.filePath}`;
};

const createDuplicateFileGroups = (files: AdminDuplicateFileRecord[]): DuplicateFileGroup[] => {
  const groupMap = new Map<string, AdminDuplicateFileRecord[]>();

  files.forEach((file) => {
    const groupKey = file.md5 || `file-${file.id}`;
    const current = groupMap.get(groupKey) ?? [];

    current.push(file);
    groupMap.set(groupKey, current);
  });

  return [...groupMap.entries()].map(([md5, groupFiles]) => ({
    files: groupFiles,
    key: md5,
    md5,
  }));
};

/**
 * Keeps selected duplicate groups before unselected groups without changing the original order inside each bucket.
 */
const sortDuplicateFileGroupsBySelection = (
  groups: DuplicateFileGroup[],
  selectedKeys: Set<string>,
): DuplicateFileGroup[] => {
  if (selectedKeys.size === 0) {
    return groups;
  }

  return groups
    .map((group, index) => ({
      group,
      index,
      selected: group.files.some((file) => selectedKeys.has(createDuplicateFileKey(file))),
    }))
    .sort((first, second) => Number(second.selected) - Number(first.selected) || first.index - second.index)
    .map((entry) => entry.group);
};

/**
 * Counts selected rows in a group for badges and selected group styling.
 */
const countSelectedFilesInGroup = (group: DuplicateFileGroup, selectedKeys: Set<string>): number => {
  return group.files.reduce((total, file) => total + (selectedKeys.has(createDuplicateFileKey(file)) ? 1 : 0), 0);
};

/**
 * Restores persisted page size only when it is one of the supported options.
 */
const normalizeDuplicateFilesPageSize = (value: unknown): (typeof PAGE_SIZE_OPTIONS)[number] => {
  return typeof value === 'number' && PAGE_SIZE_OPTIONS.includes(value as MobileDuplicateFilesPageSize)
    ? value as (typeof PAGE_SIZE_OPTIONS)[number]
    : DEFAULT_DUPLICATE_FILES_PAGE_SIZE;
};

/**
 * Guards persisted one-click rule names before they are used by the UI.
 */
const isDuplicateFilesAutoSelectMode = (value: unknown): value is MobileDuplicateFilesAutoSelectMode => {
  return typeof value === 'string' && AUTO_SELECT_RULES.some((rule) => rule.value === value);
};

const createGalleryOptions = (galleries: AdminGallery[]): Array<{ id: number; name: string; path: string }> => {
  return galleries
    .map((gallery) => {
      const id = Number(gallery.id);

      if (!Number.isFinite(id) || id <= 0) {
        return undefined;
      }

      return {
        id,
        name: gallery.name,
        path: gallery.path,
      };
    })
    .filter((gallery): gallery is { id: number; name: string; path: string } => Boolean(gallery));
};

/**
 * Builds the row selection for the current one-click rule.
 */
const createAutoSelectedFiles = (
  groups: DuplicateFileGroup[],
  options: AutoSelectOptions,
): { error?: string; files: AdminDuplicateFileRecord[] } => {
  if (options.mode === 'path') {
    return createPathMatchedFiles(groups, options.pathKeyword, options.useRegex);
  }

  const files = groups.flatMap((group) => {
    if (group.files.length <= 1) {
      return [];
    }

    if (options.mode === 'order') {
      return group.files.slice(1);
    }

    const dateField = options.mode === 'mtime' ? 'modifiedAt' : 'takenAt';

    // 先稳定排序，再跳过最早时间项，避免接口顺序变化导致保留对象不一致。
    return sortDuplicateFilesByDate(group.files, dateField).slice(1);
  });

  return files.length > 0 ? { files } : { error: '当前页没有可选中的重复文件。', files: [] };
};

/**
 * Filters duplicate rows by a keyword or regular expression against path and filename.
 */
const createPathMatchedFiles = (
  groups: DuplicateFileGroup[],
  keyword: string,
  useRegex: boolean,
): { error?: string; files: AdminDuplicateFileRecord[] } => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return { error: '请输入路径关键字。', files: [] };
  }

  let matcher: (value: string) => boolean;

  if (useRegex) {
    try {
      const expression = new RegExp(trimmedKeyword);

      matcher = (value) => expression.test(value);
    } catch {
      return { error: '正则表达式格式不正确。', files: [] };
    }
  } else {
    matcher = (value) => value.includes(trimmedKeyword);
  }

  const files = groups
    .flatMap((group) => group.files)
    .filter((file) => matcher(`${file.filePath} ${file.fileName}`));

  return files.length > 0 ? { files } : { error: '当前页没有匹配关键字的重复文件。', files: [] };
};

/**
 * Sorts rows by the requested date field and keeps invalid dates at the end.
 */
const sortDuplicateFilesByDate = (
  files: AdminDuplicateFileRecord[],
  field: 'modifiedAt' | 'takenAt',
): AdminDuplicateFileRecord[] => {
  return files
    .map((file, index) => ({
      file,
      index,
      timestamp: parseDuplicateFileTimestamp(file[field]),
    }))
    .sort((first, second) => first.timestamp - second.timestamp || first.index - second.index)
    .map((entry) => entry.file);
};

/**
 * Parses backend date strings for stable one-click sorting.
 */
const parseDuplicateFileTimestamp = (value?: string): number => {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const normalizedValue = value.includes('T') ? value : value.replace(' ', 'T');
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
};

/**
 * Deletes files with limited concurrency to avoid flooding the cleanup endpoint.
 */
const runDuplicateFileDeleteQueue = async ({
  apiOptions,
  files,
  galleryIds,
  onProgress,
}: {
  apiOptions: ApiClientOptions;
  files: AdminDuplicateFileRecord[];
  galleryIds: number[];
  onProgress?: (finished: number) => void;
}): Promise<DuplicateDeleteQueueResult[]> => {
  const results: DuplicateDeleteQueueResult[] = new Array(files.length);
  let cursor = 0;
  let finished = 0;

  const runWorker = async (): Promise<void> => {
    while (cursor < files.length) {
      const index = cursor;
      const file = files[index];

      cursor += 1;

      try {
        const payload = getDuplicateFileDeletePayload(file, galleryIds);

        if (!payload) {
          throw new Error('缺少重复文件删除参数');
        }

        await deleteAdminDuplicateFile(apiOptions, payload);
        results[index] = { file, status: 'fulfilled' };
      } catch (reason) {
        results[index] = { file, reason, status: 'rejected' };
      } finally {
        finished += 1;
        onProgress?.(finished);
      }
    }
  };

  await Promise.all(Array.from(
    { length: Math.min(DELETE_QUEUE_CONCURRENCY, files.length) },
    () => runWorker(),
  ));

  return results;
};

/**
 * Builds the cleanup payload with the current selected gallery scope.
 */
const getDuplicateFileDeletePayload = (
  file: AdminDuplicateFileRecord,
  selectedGalleryIds: number[],
): AdminDuplicateFileDeletePayload | undefined => {
  const galleryIds = selectedGalleryIds;

  if (file.id <= 0 || !file.md5 || galleryIds.length === 0) {
    return undefined;
  }

  return {
    galleryIds,
    id: file.id,
    md5: file.md5,
  };
};

/**
 * Formats queue progress for the destructive batch action.
 */
const formatDeleteProgress = (progress: DeleteProgress): string => {
  if (progress.total <= 0) {
    return '删除中';
  }

  return `删除中 ${progress.finished}/${progress.total}`;
};

const formatDuplicateFilePath = (file: AdminDuplicateFileRecord): string => {
  return file.filePath || file.fileName || '-';
};

const formatDuplicateFileTime = (file: AdminDuplicateFileRecord): string => {
  const value = file.takenAt || file.modifiedAt;

  return value ? value.replace('T', ' ').slice(0, 10) : '-';
};

/**
 * Builds the duplicate-group thumbnail URL from the group's first file.
 */
const createDuplicateFileThumbnailUrl = ({
  authCode,
  baseUrl,
  file,
}: {
  authCode?: string;
  baseUrl: string;
  file?: AdminDuplicateFileRecord;
}): string | undefined => {
  if (!file) {
    return undefined;
  }

  return createThumbnailUrl({
    authCode,
    baseUrl,
    md5: file.md5,
    type: 'h220',
  });
};
