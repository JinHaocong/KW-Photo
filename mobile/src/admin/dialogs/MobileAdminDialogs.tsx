import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import type {
  AdminDeletedFileGroup,
  AdminDeletedFileRecord,
  AdminDeletedFilesResult,
  AdminFileDeleteLogPage,
  AdminGallery,
  AdminGalleryMutationPayload,
  AdminGalleryScanSettings,
  AdminGalleryStat,
  AdminGalleryStatsOverview,
  AdminGalleryStatRow,
  AdminGalleryUserLink,
  AdminUserRecord,
  ApiClientOptions,
  CurrentUser,
} from '@kwphoto/core';
import {
  createAdminMaintenanceTask,
  exportAdminDeletedFiles,
  fetchAdminDeletedFiles,
  fetchAdminGalleryRootDirs,
  fetchAdminGalleryScanSettings,
  fetchAdminGalleryStatsOverview,
  fetchAdminGallerySubDirs,
  getApiErrorMessage,
  updateAdminGalleryAutoScanSkipIds,
  updateAdminGalleryScanSettings,
} from '@kwphoto/core';

import { MOBILE_SAGE_SLATE, useMobileTheme } from '../../mobile-theme';
import { MobileBottomSheetModal } from '../../components/MobileDialog';
import { EMPTY_SCAN_SETTINGS, RECOGNITION_TASKS, SCAN_SETTING_SWITCHES } from '../adminConfig';
import {
  formatAdminCount,
  formatAdminDateTime,
  formatFileSize,
  getFolderName,
  getParentPath,
  normalizeFileType,
  toggleListValue,
} from '../adminFormatters';
import { readMobileExportTargetFolderPath } from '../adminPageUtils';
import { styles } from '../adminStyles';
import type { AdminIconName, GalleryEditorState } from '../adminTypes';
import { createInitialEditorState, mergeCurrentUser } from '../galleryEditorUtils';
import {
  CheckTile,
  EditorSection,
  EmptyLine,
  FormField,
} from '../components/AdminPrimitives';

type DeletedFilesVirtualRow =
  | {
      group: AdminDeletedFileGroup;
      key: string;
      type: 'group';
    }
  | {
      file: AdminDeletedFileRecord;
      key: string;
      type: 'file';
    };

interface DeletedFilesDateShortcut {
  count: number;
  date: string;
  label: string;
  rowIndex: number;
  year: string;
}

interface DeletedFilesDateShortcutGroup {
  count: number;
  firstRowIndex: number;
  shortcuts: DeletedFilesDateShortcut[];
  year: string;
}

const DELETED_FILES_LIST_HEIGHT_RATIO = {
  collapsedHelp: 0.54,
  expandedHelp: 0.4,
} as const;
const DELETED_FILES_LIST_MIN_HEIGHT = 220;

/**
 * Renders the mobile gallery create/edit form and directory browser.
 */
export const GalleryEditorModal = ({
  apiOptions,
  currentUser,
  gallery,
  open,
  submitting,
  userLinks,
  users,
  onClose,
  onSubmit,
}: {
  apiOptions: ApiClientOptions;
  currentUser?: CurrentUser;
  gallery?: AdminGallery;
  open: boolean;
  submitting: boolean;
  userLinks: AdminGalleryUserLink[];
  users: AdminUserRecord[];
  onClose: () => void;
  onSubmit: (payload: AdminGalleryMutationPayload, gallery?: AdminGallery) => Promise<void>;
}) => {
  const theme = useMobileTheme();
  const [availableDirs, setAvailableDirs] = useState<string[]>([]);
  const [dirError, setDirError] = useState('');
  const [dirLoading, setDirLoading] = useState(false);
  const [dirPath, setDirPath] = useState('');
  const [formError, setFormError] = useState('');
  const [state, setState] = useState<GalleryEditorState>(() => createInitialEditorState(gallery, users, userLinks, currentUser));
  const visibleUsers = useMemo(() => mergeCurrentUser(users, currentUser), [currentUser, users]);

  const loadDirectories = useCallback(async (path?: string): Promise<void> => {
    setDirError('');
    setDirLoading(true);

    try {
      const dirs = path
        ? await fetchAdminGallerySubDirs(apiOptions, path)
        : await fetchAdminGalleryRootDirs(apiOptions);

      setAvailableDirs(dirs);
      setDirPath(path ?? '');
    } catch (requestError) {
      setAvailableDirs([]);
      setDirError(getApiErrorMessage(requestError));
    } finally {
      setDirLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError('');
    setState(createInitialEditorState(gallery, users, userLinks, currentUser));
    void loadDirectories();
  }, [currentUser, gallery, loadDirectories, open, userLinks, users]);

  /**
   * Appends one folder path and keeps duplicate taps idempotent.
   */
  const addFolder = (folderPath: string): void => {
    const nextPath = folderPath.trim();

    if (!nextPath) {
      return;
    }

    setState((current) => ({
      ...current,
      folderInput: '',
      folders: current.folders.includes(nextPath) ? current.folders : [...current.folders, nextPath],
    }));
  };

  /**
   * Validates the editor state and submits the same DTO shape as Web.
   */
  const handleSubmit = async (): Promise<void> => {
    const name = state.name.trim();
    const folders = state.folders.map((folder) => folder.trim()).filter(Boolean);
    const weights = state.weights.trim() ? Number(state.weights) : undefined;
    const selectedUserIds = state.selectedUserIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!name) {
      setFormError('请填写图库显示名称。');
      return;
    }

    if (folders.length === 0) {
      setFormError('请至少添加一个图库文件夹。');
      return;
    }

    if (weights !== undefined && !Number.isFinite(weights)) {
      setFormError('排序权重必须是数字。');
      return;
    }

    setFormError('');
    await onSubmit({
      fileDeleteOnlyAdmin: state.adminOnly,
      folders,
      func_exclude: state.funcExclude,
      hide: state.hidden,
      name,
      userIds: selectedUserIds.length === 1 ? selectedUserIds[0] : selectedUserIds,
      weights,
    }, gallery);
  };

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.editorSheet}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{gallery ? '管理图库' : '添加图库'}</Text>
              <Text style={styles.modalSubtitle}>{gallery ? `${gallery.name} · 调整文件夹、用户和识别任务` : '创建图库入口并绑定文件夹。'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGrid}>
              <FormField label="显示名称" value={state.name} onChangeText={(value) => setState((current) => ({ ...current, name: value }))} placeholder="例如 Luolcy-2604" />
              <FormField keyboardType="numeric" label="排序权重" value={state.weights} onChangeText={(value) => setState((current) => ({ ...current, weights: value }))} placeholder="数字越大越靠前" />
            </View>

            <View style={styles.checkGrid}>
              <CheckTile active={state.adminOnly} label="仅管理员可修改或删除照片" onPress={() => setState((current) => ({ ...current, adminOnly: !current.adminOnly }))} />
              <CheckTile active={state.hidden} label="在普通图库列表中隐藏" onPress={() => setState((current) => ({ ...current, hidden: !current.hidden }))} />
            </View>

            <EditorSection meta={`${state.folders.length} 个目录`} title="图库包含的文件夹">
              <View style={styles.folderInputRow}>
                <TextInput
                  onChangeText={(value) => setState((current) => ({ ...current, folderInput: value }))}
                  placeholder="/photos/2604"
                  placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
                  style={[styles.input, { flex: 1 }]}
                  value={state.folderInput}
                />
                <Pressable onPress={() => addFolder(state.folderInput)} style={[styles.editorSmallButton, { backgroundColor: theme.selection, borderColor: theme.light }]}>
                  <Ionicons color={theme.hex} name="add-outline" size={17} />
                </Pressable>
              </View>
              <View style={styles.folderChips}>
                {state.folders.length === 0 ? <Text style={styles.emptyText}>还没有添加文件夹。</Text> : null}
                {state.folders.map((folder) => (
                  <Pressable
                    key={folder}
                    onPress={() => setState((current) => ({
                      ...current,
                      folders: current.folders.filter((item) => item !== folder),
                    }))}
                    style={styles.folderChip}
                  >
                    <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-outline" size={14} />
                    <Text numberOfLines={1} style={styles.folderChipText}>{folder}</Text>
                    <Ionicons color={MOBILE_SAGE_SLATE.subtle} name="close-outline" size={14} />
                  </Pressable>
                ))}
              </View>
              <View style={styles.dirBrowser}>
                <View style={styles.dirBar}>
                  <Pressable disabled={!dirPath || dirLoading} onPress={() => void loadDirectories(getParentPath(dirPath))} style={styles.editorSmallButton}>
                    <Ionicons color={MOBILE_SAGE_SLATE.muted} name="chevron-up-outline" size={16} />
                  </Pressable>
                  <Text numberOfLines={1} style={styles.dirPath}>{dirPath || '根目录'}</Text>
                </View>
                {dirError ? <Text style={styles.error}>{dirError}</Text> : null}
                {dirLoading ? <Text style={styles.emptyText}>正在读取目录...</Text> : null}
                {!dirLoading && availableDirs.length === 0 ? <Text style={styles.emptyText}>暂无可选目录。</Text> : null}
                {availableDirs.slice(0, 18).map((folderPath) => (
                  <View key={folderPath} style={styles.dirRow}>
                    <Pressable onPress={() => void loadDirectories(folderPath)} style={styles.dirMain}>
                      <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-outline" size={16} />
                      <Text numberOfLines={1} style={styles.dirName}>{getFolderName(folderPath)}</Text>
                    </Pressable>
                    <Pressable onPress={() => addFolder(folderPath)} style={styles.editorSmallButton}>
                      <Ionicons color={MOBILE_SAGE_SLATE.muted} name="folder-open-outline" size={16} />
                    </Pressable>
                  </View>
                ))}
              </View>
            </EditorSection>

            <EditorSection meta={`${state.selectedUserIds.length}/${visibleUsers.length}`} title="可使用该图库的用户">
              <View style={styles.checkGrid}>
                {visibleUsers.map((user) => {
                  const userKey = String(user.id ?? user.username);
                  const disabled = !Number.isFinite(Number(user.id));

                  return (
                    <CheckTile
                      active={state.selectedUserIds.includes(userKey)}
                      disabled={disabled}
                      key={userKey}
                      label={user.username}
                      meta={user.roleLabel}
                      onPress={() => setState((current) => ({
                        ...current,
                        selectedUserIds: toggleListValue(current.selectedUserIds, userKey),
                      }))}
                    />
                  );
                })}
              </View>
            </EditorSection>

            <EditorSection meta="处理对应任务时会跳过该图库" title="排除的识别任务">
              <View style={styles.checkGrid}>
                {RECOGNITION_TASKS.map((task) => (
                  <CheckTile
                    active={state.funcExclude.includes(task.value)}
                    key={task.value}
                    label={task.label}
                    onPress={() => setState((current) => ({
                      ...current,
                      funcExclude: toggleListValue(current.funcExclude, task.value),
                    }))}
                  />
                ))}
              </View>
            </EditorSection>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}
          </ScrollView>

          <View style={styles.dialogActions}>
            <Pressable disabled={submitting} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable disabled={submitting} onPress={() => void handleSubmit()} style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}>
              <Text style={styles.dialogPrimaryText}>{submitting ? '保存中' : '确定'}</Text>
            </Pressable>
          </View>
    </MobileBottomSheetModal>
  );
};

/**
 * Renders global gallery scan settings for exclusions and scan switches.
 */
export const ScanSettingsModal = ({
  apiOptions,
  onClose,
  onSaved,
  open,
}: {
  apiOptions: ApiClientOptions;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) => {
  const theme = useMobileTheme();
  const [error, setError] = useState('');
  const [fileTypeInput, setFileTypeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [settings, setSettings] = useState<AdminGalleryScanSettings>(EMPTY_SCAN_SETTINGS);
  const [submitting, setSubmitting] = useState(false);

  const loadSettings = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      setSettings(await fetchAdminGalleryScanSettings(apiOptions));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [loadSettings, open]);

  /**
   * Adds an exclusion token while keeping repeated taps idempotent.
   */
  const addListValue = (
    field: 'excludeFileNamePrefixes' | 'excludeFileTypes',
    value: string,
  ): void => {
    const nextValue = field === 'excludeFileTypes' ? normalizeFileType(value) : value.trim();

    if (!nextValue) {
      return;
    }

    setSettings((current) => ({
      ...current,
      [field]: current[field].includes(nextValue) ? current[field] : [...current[field], nextValue],
    }));
  };

  /**
   * Saves the batch scan settings through the shared core service.
   */
  const handleSave = async (): Promise<void> => {
    setSubmitting(true);
    setError('');

    try {
      await updateAdminGalleryScanSettings(apiOptions, settings);
      onSaved('图库扫描设置已保存');
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.editorSheet}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>图库扫描与设置</Text>
              <Text style={styles.modalSubtitle}>{loading ? '正在读取服务端配置' : '全局扫描、xmp、raw 与视频预览规则'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <EditorSection meta={`${settings.excludeFileTypes.length} 个扩展名`} title="排除文件类型">
              <ScanListEditor
                icon="document-outline"
                inputValue={fileTypeInput}
                items={settings.excludeFileTypes}
                placeholder=".IIQ"
                onAdd={(value) => {
                  addListValue('excludeFileTypes', value);
                  setFileTypeInput('');
                }}
                onChangeInput={setFileTypeInput}
                onRemove={(value) => setSettings((current) => ({
                  ...current,
                  excludeFileTypes: current.excludeFileTypes.filter((item) => item !== value),
                }))}
              />
            </EditorSection>

            <EditorSection meta={`${settings.excludeFileNamePrefixes.length} 个规则`} title="排除文件名规则">
              <ScanListEditor
                icon="pricetag-outline"
                inputValue={prefixInput}
                items={settings.excludeFileNamePrefixes}
                placeholder="@ 或 ."
                renderItem={(value) => `${value} 开头的文件名`}
                onAdd={(value) => {
                  addListValue('excludeFileNamePrefixes', value);
                  setPrefixInput('');
                }}
                onChangeInput={setPrefixInput}
                onRemove={(value) => setSettings((current) => ({
                  ...current,
                  excludeFileNamePrefixes: current.excludeFileNamePrefixes.filter((item) => item !== value),
                }))}
              />
            </EditorSection>

            <EditorSection meta="保存后影响后续扫描任务" title="xmp、raw 与视频预览">
              <View style={styles.checkGrid}>
                {SCAN_SETTING_SWITCHES.map((item) => (
                  <CheckTile
                    active={settings[item.key]}
                    key={item.key}
                    label={item.label}
                    meta={item.description}
                    onPress={() => setSettings((current) => ({
                      ...current,
                      [item.key]: !current[item.key],
                    }))}
                  />
                ))}
              </View>
            </EditorSection>
          </ScrollView>

          <View style={styles.dialogActions}>
            <Pressable disabled={submitting} onPress={onClose} style={styles.dialogSecondaryButton}>
              <Text style={styles.dialogSecondaryText}>取消</Text>
            </Pressable>
            <Pressable
              disabled={loading || submitting}
              onPress={() => void handleSave()}
              style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}
            >
              <Text style={styles.dialogPrimaryText}>{submitting ? '保存中' : '保存'}</Text>
            </Pressable>
          </View>
    </MobileBottomSheetModal>
  );
};

/**
 * Renders per-gallery statistics and automatic scan toggles.
 */
export const GalleryStatsModal = ({
  apiOptions,
  galleries,
  onClose,
  onSaved,
  onStatsLoaded,
  open,
}: {
  apiOptions: ApiClientOptions;
  galleries: AdminGallery[];
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
  onStatsLoaded: (stat: AdminGalleryStat) => void;
}) => {
  const theme = useMobileTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<AdminGalleryStatsOverview>();
  const [updatingGalleryId, setUpdatingGalleryId] = useState<number>();
  const disabledAutoScanCount = overview?.rows.filter((row) => !row.autoScan).length ?? 0;
  const galleryStatsRows = overview?.rows ?? [];

  const loadStats = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const nextOverview = await fetchAdminGalleryStatsOverview(apiOptions, galleries);

      setOverview(nextOverview);
      onStatsLoaded(nextOverview.all);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions, galleries, onStatsLoaded]);

  useEffect(() => {
    if (open) {
      void loadStats();
    }
  }, [loadStats, open]);

  /**
   * Persists one gallery's automatic-scan flag through the shared system config.
   */
  const handleToggleAutoScan = useCallback(async (row: AdminGalleryStatRow): Promise<void> => {
    if (!overview) {
      return;
    }

    const galleryId = Number(row.galleryId);

    if (!Number.isFinite(galleryId)) {
      onSaved('当前图库没有可用 ID，无法设置自动扫描');
      return;
    }

    const previousOverview = overview;
    const nextAutoScan = !row.autoScan;
    const nextSkipIds = nextAutoScan
      ? overview.autoScanSkipIds.filter((id) => id !== galleryId)
      : Array.from(new Set([...overview.autoScanSkipIds, galleryId]));

    setUpdatingGalleryId(galleryId);
    setOverview({
      ...overview,
      autoScanSkipIds: nextSkipIds,
      rows: overview.rows.map((item) => (
        Number(item.galleryId) === galleryId ? { ...item, autoScan: nextAutoScan } : item
      )),
    });

    try {
      await updateAdminGalleryAutoScanSkipIds(apiOptions, nextSkipIds);
      onSaved(`${row.name} 已${nextAutoScan ? '开启' : '关闭'}自动扫描`);
    } catch (requestError) {
      setOverview(previousOverview);
      setError(getApiErrorMessage(requestError));
    } finally {
      setUpdatingGalleryId(undefined);
    }
  }, [apiOptions, onSaved, overview]);

  const renderGalleryStatsRow = useCallback((rowInfo: ListRenderItemInfo<AdminGalleryStatRow>) => {
    const { item: row } = rowInfo;

    return (
      <View style={styles.galleryStatsCard}>
        <View style={styles.galleryStatsCardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text numberOfLines={1} style={styles.cardTitle}>{row.name}</Text>
            <Text numberOfLines={1} style={styles.cardSubtitle}>
              {row.gallery.hidden ? '隐藏图库 · ' : ''}
              {row.path}
            </Text>
          </View>
          <Pressable
            disabled={updatingGalleryId === Number(row.galleryId)}
            onPress={() => void handleToggleAutoScan(row)}
            style={[
              styles.autoScanSwitch,
              row.autoScan ? { backgroundColor: theme.selection, borderColor: theme.light } : styles.autoScanSwitchOff,
            ]}
          >
            {updatingGalleryId === Number(row.galleryId) ? (
              <ActivityIndicator color={row.autoScan ? theme.hex : MOBILE_SAGE_SLATE.muted} size="small" />
            ) : (
              <Ionicons
                color={row.autoScan ? theme.hex : MOBILE_SAGE_SLATE.muted}
                name={row.autoScan ? 'checkmark-circle-outline' : 'remove-circle-outline'}
                size={15}
              />
            )}
            <Text numberOfLines={1} style={[styles.autoScanSwitchText, row.autoScan ? { color: theme.hex } : null]}>
              {row.autoScan ? '自动扫描' : '已跳过'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.galleryStatsInlineMetrics}>
          <GalleryStatsInlineMetric label="照片" value={formatAdminCount(row.photo)} />
          <GalleryStatsInlineMetric label="视频" value={formatAdminCount(row.video)} />
          <GalleryStatsInlineMetric label="空间" value={formatFileSize(row.totalSize)} />
        </View>
        {row.statError ? <Text style={styles.error}>{row.statError}</Text> : null}
      </View>
    );
  }, [handleToggleAutoScan, theme.hex, theme.light, theme.selection, updatingGalleryId]);

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={[styles.editorSheet, styles.statsSheet]}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTitle}>图库信息统计&自动扫描</Text>
              <Text style={styles.modalSubtitle}>{loading ? '正在读取每个图库的统计' : `${overview?.rows.length ?? galleries.length} 个图库 · ${disabledAutoScanCount} 个跳过自动扫描`}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <View style={styles.statsContent}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.galleryStatsHero}>
              <View style={styles.galleryStatsHeroHeader}>
                <View style={[styles.galleryStatsHeroIcon, { backgroundColor: theme.selection }]}>
                  <Ionicons color={theme.hex} name="bar-chart-outline" size={17} />
                </View>
                <View style={styles.galleryStatsHeroCopy}>
                  <Text style={styles.galleryStatsHeroTitle}>全部图库</Text>
                  <Text style={styles.galleryStatsHeroMeta}>同一文件夹只计算一次</Text>
                </View>
                <Pressable
                  disabled={loading}
                  onPress={() => void loadStats()}
                  style={[
                    styles.editorSmallButton,
                    styles.galleryStatsRefreshButton,
                    { backgroundColor: theme.selection, borderColor: theme.light },
                  ]}
                >
                  {loading ? <ActivityIndicator color={theme.hex} size="small" /> : <Ionicons color={theme.hex} name="refresh-outline" size={15} />}
                </Pressable>
              </View>
              <View style={styles.galleryStatsMetricGrid}>
                <GalleryStatsMetric label="照片数量" value={formatAdminCount(overview?.all.photo ?? 0)} />
                <GalleryStatsMetric label="视频数量" value={formatAdminCount(overview?.all.video ?? 0)} />
                <GalleryStatsMetric label="占用空间" value={formatFileSize(overview?.all.totalSize ?? 0)} />
                <GalleryStatsMetric label="跳过扫描" value={formatAdminCount(disabledAutoScanCount)} />
              </View>
            </View>

            <View style={styles.galleryStatsSection}>
              <View style={styles.galleryStatsSectionHeader}>
                <Text style={styles.cardTitle}>图库统计</Text>
                <Text style={styles.cardMeta}>{overview?.rows.length ?? 0} 个图库</Text>
              </View>
              {loading ? <Text style={styles.emptyText}>正在读取图库统计...</Text> : null}
              {!loading && galleryStatsRows.length === 0 ? <EmptyLine text="暂无图库统计" /> : null}
              {galleryStatsRows.length > 0 ? (
                <View style={styles.galleryStatsListFrame}>
                  <FlatList
                    contentContainerStyle={styles.galleryStatsList}
                    data={galleryStatsRows}
                    initialNumToRender={12}
                    keyExtractor={(row) => String(row.galleryId)}
                    keyboardShouldPersistTaps="handled"
                    maxToRenderPerBatch={12}
                    nestedScrollEnabled
                    renderItem={renderGalleryStatsRow}
                    showsVerticalScrollIndicator={false}
                    style={styles.galleryStatsListScroll}
                    windowSize={7}
                  />
                </View>
              ) : null}
            </View>
          </View>
    </MobileBottomSheetModal>
  );
};

const GalleryStatsMetric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.galleryStatsMetric}>
    <Text numberOfLines={1} style={styles.galleryStatsMetricLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.galleryStatsMetricValue}>{value}</Text>
  </View>
);

const GalleryStatsInlineMetric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.galleryStatsInlineMetric}>
    <Text style={styles.galleryStatsInlineLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.galleryStatsInlineValue}>{value}</Text>
  </View>
);

const ScanListEditor = ({
  icon,
  inputValue,
  items,
  placeholder,
  renderItem = (value: string) => value,
  onAdd,
  onChangeInput,
  onRemove,
}: {
  icon: AdminIconName;
  inputValue: string;
  items: string[];
  placeholder: string;
  renderItem?: (value: string) => string;
  onAdd: (value: string) => void;
  onChangeInput: (value: string) => void;
  onRemove: (value: string) => void;
}) => {
  const theme = useMobileTheme();

  return (
    <View style={styles.scanListEditor}>
      <View style={styles.folderInputRow}>
        <TextInput
          onChangeText={onChangeInput}
          placeholder={placeholder}
          placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
          style={[styles.input, { flex: 1 }]}
          value={inputValue}
        />
        <Pressable onPress={() => onAdd(inputValue)} style={[styles.editorSmallButton, { backgroundColor: theme.selection, borderColor: theme.light }]}>
          <Ionicons color={theme.hex} name="add-outline" size={17} />
        </Pressable>
      </View>
      <View style={styles.folderChips}>
        {items.length === 0 ? <Text style={styles.emptyText}>未配置排除项。</Text> : null}
        {items.map((item) => (
          <Pressable key={item} onPress={() => onRemove(item)} style={styles.folderChip}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={14} />
            <Text numberOfLines={1} style={styles.folderChipText}>{renderItem(item)}</Text>
            <Ionicons color={MOBILE_SAGE_SLATE.subtle} name="close-outline" size={14} />
          </Pressable>
        ))}
      </View>
    </View>
  );
};

/**
 * Renders abnormal deleted-file groups and cleanup/export actions.
 */
export const DeletedFilesSheet = ({
  apiOptions,
  onClose,
  onMessage,
  open,
}: {
  apiOptions: ApiClientOptions;
  open: boolean;
  onClose: () => void;
  onMessage: (message: string) => void;
}) => {
  const theme = useMobileTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');
  const [expandedDateYears, setExpandedDateYears] = useState<Set<string>>(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdminDeletedFilesResult>();
  const deletedFilesListRef = useRef<FlatList<DeletedFilesVirtualRow>>(null);

  /**
   * Reads abnormal files from the same /gallery/findDeletedFiles endpoint used by Web.
   */
  const loadDeletedFiles = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      setResult(await fetchAdminDeletedFiles(apiOptions));
    } catch (requestError) {
      setResult(undefined);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (!open) {
      setExpandedDateYears(new Set());
      setHelpOpen(false);
      return;
    }

    void loadDeletedFiles();
  }, [loadDeletedFiles, open]);

  /**
   * Submits the server export task for abnormal-file preview images.
   */
  const handleExportDeletedFiles = async (): Promise<void> => {
    setActionLoading('export');

    try {
      const payload = await exportAdminDeletedFiles(apiOptions);
      const targetFolderPath = readMobileExportTargetFolderPath(payload);

      onMessage(targetFolderPath ? `导出任务已提交：${targetFolderPath}` : '导出任务已提交');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
    }
  };

  /**
   * Runs the cleanup task after the destructive native confirmation.
   */
  const submitCleanDeletedFiles = async (): Promise<void> => {
    setActionLoading('clean');

    try {
      await createAdminMaintenanceTask(apiOptions, 'cleanGarbageData');
      onMessage('清理任务提交成功，请关注后台任务信息');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setActionLoading('');
    }
  };

  /**
   * Confirms abnormal-file cleanup before scheduling the destructive maintenance task.
   */
  const handleCleanDeletedFiles = (): void => {
    Alert.alert('清理这些异常文件', '确定删除这些文件的缩略图及相关数据吗？', [
      { text: '取消', style: 'cancel' },
      {
        onPress: () => void submitCleanDeletedFiles(),
        style: 'destructive',
        text: '清理',
      },
    ]);
  };

  const groups = result?.groups ?? [];
  const totalCount = result?.totalCount ?? 0;
  const empty = !loading && !error && totalCount === 0;
  const virtualRows = useMemo(() => createDeletedFilesVirtualRows(groups), [groups]);
  const dateShortcutGroups = useMemo(() => createDeletedFileDateShortcutGroups(groups), [groups]);
  const hasDateShortcutRail = dateShortcutGroups.some((group) => group.shortcuts.length > 0);
  const listHeight = getDeletedFilesListHeight(windowHeight, helpOpen);

  useEffect(() => {
    setExpandedDateYears(new Set());
  }, [result]);

  const renderDeletedFilesHeader = (): ReactNode => (
    <>
      {helpOpen ? (
        <View style={styles.deletedFilesHelp}>
          <Text style={styles.cardMeta}>扫描图库过程中，如果照片文件已经不存在，MT Photos 会把这个文件标记为异常文件。</Text>
          <Text style={styles.cardMeta}>系统不会立即删除缩略图和数据，是为了兼顾目录挂载失败、目录未映射、位置变更等临时异常。</Text>
          <Text style={styles.cardMeta}>确认这些文件确实已删除后，再执行清理任务删除对应缩略图及相关数据。</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.deletedFilesError}>{error}</Text> : null}
      {loading ? <Text style={styles.deletedFilesStateText}>正在读取状态异常文件...</Text> : null}
      {empty ? <EmptyLine text="当前没有状态异常文件" /> : null}
    </>
  );

  const renderDeletedFilesVirtualRow = useCallback((rowInfo: ListRenderItemInfo<DeletedFilesVirtualRow>) => {
    const { item } = rowInfo;

    if (item.type === 'group') {
      return <DeletedFilesGroupHeader group={item.group} />;
    }

    return <DeletedFileVirtualRow file={item.file} />;
  }, []);

  /**
   * Jumps the mobile virtualized list to one abnormal-file date group.
   */
  const handleJumpToDeletedFileDate = useCallback((shortcut: DeletedFilesDateShortcut): void => {
    deletedFilesListRef.current?.scrollToIndex({
      animated: true,
      index: shortcut.rowIndex,
      viewPosition: 0,
    });
  }, []);

  /**
   * Expands or collapses one year in the compact date rail.
   */
  const handleToggleDeletedFileYear = useCallback((year: string): void => {
    setExpandedDateYears((current) => {
      const next = new Set(current);

      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }

      return next;
    });
  }, []);

  /**
   * Falls back to an estimated offset when the target row has not been measured yet.
   */
  const handleDeletedFilesScrollToIndexFailed = useCallback((info: { averageItemLength: number; index: number }): void => {
    deletedFilesListRef.current?.scrollToOffset({
      animated: true,
      offset: Math.max(0, info.averageItemLength * info.index),
    });
  }, []);

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={[styles.editorSheet, styles.deletedFilesSheet]}
      onClose={onClose}
      visible={open}
    >
      <View style={styles.modalHeader}>
        <View style={styles.modalTitleWrap}>
          <Text style={styles.modalTitle}>状态异常文件</Text>
          <Text style={styles.modalSubtitle}>
            {loading ? '正在读取状态异常文件' : `${totalCount} 个文件`}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.iconCloseButton}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
        </Pressable>
      </View>

      <View style={styles.deletedFilesCompactPanel}>
        <View style={styles.deletedFilesSummaryCard}>
          <View style={[styles.deletedFilesSummaryIcon, { backgroundColor: theme.selection, borderColor: theme.light }]}>
            <Ionicons color={theme.hex} name="alert-circle-outline" size={15} />
          </View>
          <View style={styles.deletedFilesSummaryCopy}>
            <Text style={styles.deletedFilesSummaryTitle}>异常文件概览</Text>
            <Text numberOfLines={1} style={styles.deletedFilesSummaryMeta}>原始文件不存在，数据库仍保留记录。</Text>
          </View>
          <View style={styles.deletedFilesCountPill}>
            <Text style={styles.deletedFilesCountValue}>{loading ? '-' : totalCount}</Text>
            <Text style={styles.deletedFilesCountLabel}>{loading ? '读取中' : '个文件'}</Text>
          </View>
        </View>

        <View style={styles.deletedFilesActionGrid}>
          <DeletedFilesActionButton
            disabled={loading}
            icon="refresh-outline"
            label={loading ? '读取中' : '刷新'}
            onPress={() => void loadDeletedFiles()}
          />
          <DeletedFilesActionButton
            disabled={actionLoading === 'export' || totalCount === 0}
            icon="download-outline"
            label={actionLoading === 'export' ? '提交中' : '导出预览图'}
            loading={actionLoading === 'export'}
            onPress={() => void handleExportDeletedFiles()}
          />
          <DeletedFilesActionButton
            icon="help-circle-outline"
            label={helpOpen ? '收起说明' : '说明'}
            onPress={() => setHelpOpen((current) => !current)}
            primary={helpOpen}
          />
          <DeletedFilesActionButton
            danger
            disabled={actionLoading === 'clean' || totalCount === 0}
            icon="trash-outline"
            label={actionLoading === 'clean' ? '提交中' : '清理异常文件'}
            loading={actionLoading === 'clean'}
            onPress={handleCleanDeletedFiles}
          />
        </View>
      </View>

      {renderDeletedFilesHeader()}
      {virtualRows.length > 0 ? (
        <View style={[styles.deletedFilesVirtualFrame, { height: listHeight }]}>
          <FlatList
            contentContainerStyle={[
              styles.deletedFilesVirtualContent,
              hasDateShortcutRail ? styles.deletedFilesVirtualContentWithRail : null,
            ]}
            data={virtualRows}
            initialNumToRender={18}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            maxToRenderPerBatch={18}
            nestedScrollEnabled
            onScrollToIndexFailed={handleDeletedFilesScrollToIndexFailed}
            ref={deletedFilesListRef}
            removeClippedSubviews
            renderItem={renderDeletedFilesVirtualRow}
            showsVerticalScrollIndicator={false}
            style={styles.deletedFilesVirtualList}
            windowSize={9}
          />
          {hasDateShortcutRail ? (
            <DeletedFilesDateRail
              expandedYears={expandedDateYears}
              groups={dateShortcutGroups}
              onJump={handleJumpToDeletedFileDate}
              onToggleYear={handleToggleDeletedFileYear}
            />
          ) : null}
        </View>
      ) : null}
    </MobileBottomSheetModal>
  );
};

/**
 * Renders one action in the abnormal-files sheet with icon, loading, and danger state.
 */
const DeletedFilesActionButton = ({
  danger = false,
  disabled = false,
  icon,
  label,
  loading = false,
  onPress,
  primary = false,
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}) => {
  const theme = useMobileTheme();
  const color = primary ? '#fff' : danger ? '#b91c1c' : theme.hex;
  const buttonStyle = primary
    ? { backgroundColor: theme.hex, borderColor: theme.hex }
    : { backgroundColor: theme.selection, borderColor: theme.light };

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.deletedFilesActionButton,
        buttonStyle,
        danger ? styles.deletedFilesDangerButton : null,
        disabled || loading ? styles.disabledButton : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons color={color} name={icon} size={12} />}
      <Text numberOfLines={1} style={[styles.deletedFilesActionText, { color }]}>{label}</Text>
    </Pressable>
  );
};

const DeletedFilesDateRail = ({
  expandedYears,
  groups,
  onJump,
  onToggleYear,
}: {
  expandedYears: Set<string>;
  groups: DeletedFilesDateShortcutGroup[];
  onJump: (shortcut: DeletedFilesDateShortcut) => void;
  onToggleYear: (year: string) => void;
}) => {
  return (
    <View style={styles.deletedFilesDateRail}>
      <ScrollView
        contentContainerStyle={styles.deletedFilesDateRailContent}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.deletedFilesDateRailScroller}
      >
        {groups.map((group) => {
          const expanded = expandedYears.has(group.year);

          return (
            <View key={group.year} style={styles.deletedFilesDateRailGroup}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => onToggleYear(group.year)}
                style={[
                  styles.deletedFilesDateRailYearButton,
                  expanded ? styles.deletedFilesDateRailYearButtonExpanded : null,
                ]}
              >
                <Text numberOfLines={1} style={styles.deletedFilesDateRailYear}>{group.year}</Text>
                <Ionicons
                  color={MOBILE_SAGE_SLATE.subtle}
                  name={expanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={8}
                />
              </Pressable>

              {expanded ? group.shortcuts.map((shortcut) => (
                <Pressable
                  key={`${shortcut.date}-${shortcut.rowIndex}`}
                  onPress={() => onJump(shortcut)}
                  style={styles.deletedFilesDateRailItem}
                >
                  <View style={styles.deletedFilesDateRailDot} />
                  <Text numberOfLines={1} style={styles.deletedFilesDateRailLabel}>{shortcut.label}</Text>
                </Pressable>
              )) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

/**
 * Gives the abnormal-file list a concrete height so the list owns vertical scrolling inside the bottom sheet.
 */
const getDeletedFilesListHeight = (windowHeight: number, helpOpen: boolean): number => {
  const ratio = helpOpen
    ? DELETED_FILES_LIST_HEIGHT_RATIO.expandedHelp
    : DELETED_FILES_LIST_HEIGHT_RATIO.collapsedHelp;

  return Math.max(DELETED_FILES_LIST_MIN_HEIGHT, Math.floor(windowHeight * ratio));
};

/**
 * Builds date jump targets that match the flattened virtual-row indexes.
 */
function createDeletedFileDateShortcutGroups(groups: AdminDeletedFileGroup[]): DeletedFilesDateShortcutGroup[] {
  const groupMap = new Map<string, DeletedFilesDateShortcutGroup>();
  let rowIndex = 0;

  groups.forEach((group) => {
    const year = readDeletedFileDateYear(group.day);
    const shortcut: DeletedFilesDateShortcut = {
      count: group.list.length,
      date: group.day,
      label: formatDeletedFileDateShortcutLabel(group.day),
      rowIndex,
      year,
    };
    const shortcutGroup = groupMap.get(year) ?? {
      count: 0,
      firstRowIndex: rowIndex,
      shortcuts: [],
      year,
    };

    shortcutGroup.count += group.list.length;
    shortcutGroup.shortcuts.push(shortcut);
    groupMap.set(year, shortcutGroup);

    rowIndex += group.list.length + 1;
  });

  return Array.from(groupMap.values());
}

function readDeletedFileDateYear(date: string): string {
  return date.match(/^\d{4}/)?.[0] ?? date;
}

function formatDeletedFileDateShortcutLabel(date: string): string {
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);

  return match ? `${match[1]}-${match[2]}` : date;
}

/**
 * Flattens grouped abnormal files so the virtualized list can recycle every visible file row independently.
 */
const createDeletedFilesVirtualRows = (groups: AdminDeletedFileGroup[]): DeletedFilesVirtualRow[] => {
  const rows: DeletedFilesVirtualRow[] = [];

  groups.forEach((group, groupIndex) => {
    const groupKey = `${group.day}-${group.addr ?? ''}-${groupIndex}`;

    rows.push({ group, key: `${groupKey}-header`, type: 'group' });
    group.list.forEach((file, fileIndex) => {
      rows.push({
        file,
        key: `${groupKey}-${file.id}-${file.md5}-${fileIndex}`,
        type: 'file',
      });
    });
  });

  return rows;
};

const DeletedFilesGroupHeader = ({ group }: { group: AdminDeletedFileGroup }) => (
  <View style={styles.deletedFilesGroupHeader}>
    <View style={styles.deletedFilesGroupMark} />
    <Text numberOfLines={1} style={styles.deletedFilesGroupDate}>{group.day}</Text>
    <Text numberOfLines={1} style={styles.deletedFilesGroupCount}>
      {group.list.length} 个文件{group.addr ? ` · ${group.addr}` : ''}
    </Text>
  </View>
);

const DeletedFileVirtualRow = ({ file }: { file: AdminDeletedFileRecord }) => {
  const filePath = getVisibleDeletedFilePath(file.filePath);

  return (
    <View style={styles.deletedFileVirtualRow}>
      <View style={styles.deletedFileNameRow}>
        <Ionicons color="#b91c1c" name="warning-outline" size={15} />
        <Text numberOfLines={1} style={styles.deletedFileName}>{file.fileName}</Text>
      </View>
      {filePath ? <Text numberOfLines={2} style={styles.deletedFilePath}>{filePath}</Text> : null}
      <Text numberOfLines={1} style={styles.deletedFileMeta}>
        ID {file.id || '-'} · {file.md5 || '-'}
      </Text>
    </View>
  );
};

/**
 * Hides placeholder paths returned by the abnormal-file endpoint.
 */
const getVisibleDeletedFilePath = (filePath: string): string => {
  const normalizedPath = filePath.trim();

  return normalizedPath && normalizedPath !== '-' ? normalizedPath : '';
};

/**
 * Renders paged file-delete logs and destructive log maintenance actions.
 */
export const DeletedLogModal = ({
  actionLoading,
  onClearLogs,
  onClose,
  onExportDeletedFiles,
  onLoadPage,
  open,
  page,
}: {
  actionLoading: string;
  open: boolean;
  page?: AdminFileDeleteLogPage;
  onClearLogs: () => Promise<void>;
  onClose: () => void;
  onExportDeletedFiles: () => Promise<void>;
  onLoadPage: (pageNo?: number) => Promise<void>;
}) => {
  const theme = useMobileTheme();
  const hasPrevious = Boolean(page && page.pageNo > 1);
  const hasNext = Boolean(page && page.pageNo * page.pageSize < page.count);

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.editorSheet}
      onClose={onClose}
      visible={open}
    >
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>文件删除记录</Text>
              <Text style={styles.modalSubtitle}>{page ? `${page.count} 条记录` : '读取服务端删除日志'}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconCloseButton}>
              <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.editorContent} showsVerticalScrollIndicator={false}>
            {actionLoading === 'deleted-logs' ? <Text style={styles.emptyText}>正在读取文件删除记录...</Text> : null}
            {page && page.list.length === 0 ? <EmptyLine text="无文件删除记录" /> : null}
            {page?.list.map((log) => (
              <View key={log.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleWrap}>
                    <Text numberOfLines={1} style={styles.cardTitle}>{log.operator}</Text>
                    <Text numberOfLines={1} style={styles.cardMeta}>{formatAdminDateTime(log.deleteTime)} · {log.deleteType}</Text>
                  </View>
                  <Ionicons color={MOBILE_SAGE_SLATE.muted} name="trash-outline" size={17} />
                </View>
                <Text numberOfLines={2} style={styles.cardSubtitle}>{log.filePath}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.deletedLogActions}>
            <Pressable
              disabled={actionLoading === 'deleted'}
              onPress={() => void onExportDeletedFiles()}
              style={styles.dialogSecondaryButton}
            >
              <Text style={styles.dialogSecondaryText}>导出预览图</Text>
            </Pressable>
            <Pressable
              disabled={actionLoading === 'clear-deleted-logs'}
              onPress={() => void onClearLogs()}
              style={[styles.dialogPrimaryButton, { backgroundColor: '#dc2626' }]}
            >
              <Text style={styles.dialogPrimaryText}>清空记录</Text>
            </Pressable>
          </View>
          <View style={styles.dialogActions}>
            <Pressable
              disabled={!hasPrevious || actionLoading === 'deleted-logs'}
              onPress={() => void onLoadPage((page?.pageNo ?? 2) - 1)}
              style={styles.dialogSecondaryButton}
            >
              <Text style={styles.dialogSecondaryText}>上一页</Text>
            </Pressable>
            <Pressable
              disabled={!hasNext || actionLoading === 'deleted-logs'}
              onPress={() => void onLoadPage((page?.pageNo ?? 0) + 1)}
              style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}
            >
              <Text style={styles.dialogPrimaryText}>下一页</Text>
            </Pressable>
          </View>
    </MobileBottomSheetModal>
  );
};
