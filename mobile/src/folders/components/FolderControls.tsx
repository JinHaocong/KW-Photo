import Ionicons from "@expo/vector-icons/Ionicons";
import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import type {
  MobileFolderCardSize,
  MobileFolderSortDirection,
  MobileFolderSortField,
  MobileFolderViewMode,
} from "../../mobile-storage";
import { MOBILE_SAGE_SLATE, useMobileTheme } from "../../mobile-theme";
import { MobileBottomSheetModal } from "../../components/MobileDialog";
import {
  CARD_SIZE_OPTIONS,
  SORT_DIRECTION_ICON,
  SORT_DIRECTION_LABEL,
  SORT_DIRECTION_OPTIONS,
  SORT_FIELD_ICON,
  SORT_FIELD_LABEL,
  SORT_FIELD_OPTIONS,
  VIEW_MODE_OPTIONS,
} from "../folderConstants";
import type { FolderFabIconName } from "../folderConstants";
import { styles } from "../folderStyles";

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
export const FolderFloatingMenu = ({
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
  const hiddenCoverIcon: FolderFabIconName = showCovers
    ? "image-outline"
    : "eye-off-outline";

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
            style={[
              styles.folderFabMenuButton,
              !canCreateFolder ? styles.disabledButton : null,
            ]}
          >
            <Ionicons
              color={canCreateFolder ? theme.hex : MOBILE_SAGE_SLATE.subtle}
              name="folder-open-outline"
              size={18}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={showCovers ? "隐藏封面图" : "显示封面图"}
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

/**
 * Displays folder view, cover, and sort preferences in the mobile bottom sheet.
 */
export const FolderConfigSheet = ({
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
  const activePanelStyle = {
    backgroundColor: theme.selection,
    borderColor: theme.light,
  };

  return (
    <MobileBottomSheetModal
      backdropStyle={styles.configOverlay}
      contentStyle={styles.configSheet}
      onClose={onClose}
      visible={open}
    >
      <View style={styles.configSheetHandle} />
      <View style={styles.configHeader}>
        <View
          style={[
            styles.configHeaderIcon,
            { backgroundColor: theme.selection },
          ]}
        >
          <Ionicons color={theme.hex} name="options-outline" size={18} />
        </View>
        <View style={styles.configHeaderCopy}>
          <Text style={styles.configTitle}>文件夹配置</Text>
          <Text style={styles.configSummaryText}>
            {viewMode === "list" ? "列表" : "宫格"} ·{" "}
            {SORT_FIELD_LABEL[sortField]} ·{" "}
            {SORT_DIRECTION_LABEL[sortDirection]}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.configCloseButton}>
          <Ionicons
            color={MOBILE_SAGE_SLATE.muted}
            name="close-outline"
            size={20}
          />
        </Pressable>
      </View>

      <View style={styles.configQuickGrid}>
        <Pressable
          disabled={!canCreateFolder}
          onPress={onOpenCreateFolder}
          style={[
            styles.configQuickButton,
            !canCreateFolder ? styles.disabledButton : null,
          ]}
        >
          <View
            style={[
              styles.configQuickIcon,
              { backgroundColor: theme.selection },
            ]}
          >
            <Ionicons color={theme.hex} name="add-circle-outline" size={18} />
          </View>
          <View style={styles.configQuickCopy}>
            <Text style={styles.configQuickTitle}>新建文件夹</Text>
            <Text style={styles.configQuickMeta}>当前目录</Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onToggleCovers}
          style={[
            styles.configQuickButton,
            showCovers ? activePanelStyle : null,
          ]}
        >
          <View
            style={[
              styles.configQuickIcon,
              showCovers ? { backgroundColor: theme.hex } : null,
            ]}
          >
            <Ionicons
              color={showCovers ? "#fff" : theme.hex}
              name={showCovers ? "image-outline" : "eye-off-outline"}
              size={18}
            />
          </View>
          <View style={styles.configQuickCopy}>
            <Text
              style={[
                styles.configQuickTitle,
                showCovers ? { color: theme.hex } : null,
              ]}
            >
              封面图
            </Text>
            <Text
              style={[
                styles.configQuickMeta,
                showCovers ? { color: theme.hex } : null,
              ]}
            >
              {showCovers ? "显示中" : "已隐藏"}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.configControlPanel}>
        <ConfigSectionTitle
          icon="apps-outline"
          meta={viewMode === "grid" ? "封面优先" : "信息优先"}
          title="展示方式"
        />
        <ConfigIconGrid
          activeValue={viewMode}
          items={VIEW_MODE_OPTIONS}
          onChange={onChangeViewMode}
        />
        <ConfigSectionTitle
          icon="scan-outline"
          meta={
            CARD_SIZE_OPTIONS.find((item) => item.value === cardSize)?.meta ??
            ""
          }
          title="卡片大小"
        />
        <ConfigIconGrid
          activeValue={cardSize}
          items={CARD_SIZE_OPTIONS}
          onChange={onChangeCardSize}
        />
      </View>

      <View style={styles.configControlPanel}>
        <ConfigSectionTitle
          icon="funnel-outline"
          meta={SORT_DIRECTION_LABEL[sortDirection]}
          title="排序字段"
        />
        <View style={styles.configSortGrid}>
          {SORT_FIELD_OPTIONS.map((field) => (
            <Pressable
              key={field}
              onPress={() => onChangeSortField(field)}
              style={[
                styles.configOptionPill,
                sortField === field ? activePanelStyle : null,
              ]}
            >
              <Ionicons
                color={
                  sortField === field ? theme.hex : MOBILE_SAGE_SLATE.muted
                }
                name={SORT_FIELD_ICON[field]}
                size={14}
              />
              <Text
                style={[
                  styles.configOptionText,
                  sortField === field ? { color: theme.hex } : null,
                ]}
              >
                {SORT_FIELD_LABEL[field]}
              </Text>
            </Pressable>
          ))}
        </View>
        <ConfigSectionTitle
          icon="swap-vertical-outline"
          meta="方向"
          title="排序方向"
        />
        <View style={styles.configSortGrid}>
          {SORT_DIRECTION_OPTIONS.map((direction) => (
            <Pressable
              key={direction}
              onPress={() => onChangeSortDirection(direction)}
              style={[
                styles.configOptionPill,
                sortDirection === direction ? activePanelStyle : null,
              ]}
            >
              <Ionicons
                color={
                  sortDirection === direction
                    ? theme.hex
                    : MOBILE_SAGE_SLATE.muted
                }
                name={SORT_DIRECTION_ICON[direction]}
                size={14}
              />
              <Text
                style={[
                  styles.configOptionText,
                  sortDirection === direction ? { color: theme.hex } : null,
                ]}
              >
                {SORT_DIRECTION_LABEL[direction]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </MobileBottomSheetModal>
  );
};

/**
 * Renders one labeled option group inside the folder config sheet.
 */
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

/**
 * Renders icon-first segmented choices for folder view and card-size settings.
 */
const ConfigIconGrid = <TValue extends string>({
  activeValue,
  items,
  onChange,
}: {
  activeValue: TValue;
  items: Array<{
    icon: FolderFabIconName;
    label: string;
    meta: string;
    value: TValue;
  }>;
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
              active
                ? { backgroundColor: theme.selection, borderColor: theme.light }
                : null,
            ]}
          >
            <Ionicons
              color={active ? theme.hex : MOBILE_SAGE_SLATE.muted}
              name={item.icon}
              size={17}
            />
            <View style={styles.configIconOptionCopy}>
              <Text
                style={[
                  styles.configIconOptionTitle,
                  active ? { color: theme.hex } : null,
                ]}
              >
                {item.label}
              </Text>
              <Text
                style={[
                  styles.configIconOptionMeta,
                  active ? { color: theme.hex } : null,
                ]}
              >
                {item.meta}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

/**
 * Renders a compact text segmented control for simple string choices.
 */
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
            activeValue === item.value
              ? { backgroundColor: theme.selection }
              : null,
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

/**
 * Shows a folder or file group heading with an optional trailing control.
 */
export const SectionHeading = ({
  count,
  title,
  trailing,
}: {
  count: number;
  title: string;
  trailing?: ReactNode;
}) => {
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

/**
 * Renders batch-selection actions for the current folder directory.
 */
export const SelectionBar = ({
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
  submittingAction?: "delete" | "move";
}) => {
  const theme = useMobileTheme();

  return (
    <View style={[styles.selectionBar, { borderColor: theme.light }]}>
      <View style={styles.selectionSummary}>
        <Text style={styles.selectionTitle}>已选择 {selectedCount} 项</Text>
        <Text numberOfLines={1} style={styles.selectionMeta}>
          {folderCount} 个文件夹，{fileCount} 个文件 · 当前可选{" "}
          {selectableCount} 项
        </Text>
      </View>
      <View style={styles.selectionActions}>
        <Pressable
          onPress={onToggleSelectAll}
          style={styles.selectionActionButton}
        >
          <Text style={styles.selectionActionText}>
            {allSelected ? "取消全选" : "全选"}
          </Text>
        </Pressable>
        <Pressable
          disabled={Boolean(submittingAction)}
          onPress={onMove}
          style={[
            styles.selectionActionButton,
            submittingAction ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.selectionActionText}>
            {submittingAction === "move" ? "移动中" : "移动"}
          </Text>
        </Pressable>
        <Pressable
          disabled={Boolean(submittingAction)}
          onPress={onDelete}
          style={[
            styles.selectionDangerButton,
            submittingAction ? styles.disabledButton : null,
          ]}
        >
          <Text style={styles.selectionDangerText}>
            {submittingAction === "delete" ? "删除中" : "删除"}
          </Text>
        </Pressable>
        <Pressable onPress={onClear} style={styles.selectionIconButton}>
          <Text style={styles.selectionActionText}>×</Text>
        </Pressable>
      </View>
    </View>
  );
};
