import Ionicons from '@expo/vector-icons/Ionicons';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import type { AdminInfoItem } from '@kwphoto/core';

import { MobileLoadingState } from '../../MobileLoadingState';
import { MOBILE_SAGE_SLATE, useMobileTheme } from '../../mobile-theme';
import { formatAdminInfoValue } from '../adminFormatters';
import { getAdminTabLabel } from '../adminTabs';
import { ADMIN_TABS } from '../adminConfig';
import type { AdminIconName, AdminTab } from '../adminTypes';
import { styles } from '../adminStyles';

/**
 * Renders the active admin tab title, description, and current metadata.
 */
export const AdminSectionHeader = ({ meta, tab, themeColor }: {
  meta: string;
  tab: (typeof ADMIN_TABS)[number];
  themeColor: string;
}) => {
  return (
    <View style={styles.sectionIntro}>
      <View style={styles.sectionIntroIcon}>
        <Ionicons color={themeColor} name={tab.icon} size={19} />
      </View>
      <View style={styles.sectionIntroCopy}>
        <Text style={styles.sectionIntroTitle}>{tab.label}</Text>
        <Text style={styles.sectionIntroMeta}>{tab.description} · {meta}</Text>
      </View>
    </View>
  );
};

/**
 * Shows tab-aware skeleton rows while the first mobile admin request is loading.
 */
export const AdminLoadingState = ({ tab }: { tab: AdminTab }) => {
  const rows = tab === 'overview' ? 2 : tab === 'gallery' || tab === 'cache' ? 3 : 4;

  return (
    <View style={styles.loadingStack}>
      <MobileLoadingState
        compact
        description="同步服务端数据和本地缓存状态"
        icon="analytics-outline"
        title={`正在加载${getAdminTabLabel(tab)}`}
      />
      <View style={styles.loadingMetricGrid}>
        {Array.from({ length: tab === 'overview' ? 6 : 4 }).map((_, index) => (
          <View key={index} style={styles.skeletonMetric}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonValue} />
          </View>
        ))}
      </View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonCardTitle} />
          <View style={styles.skeletonCardLine} />
          <View style={[styles.skeletonCardLine, styles.skeletonCardLineShort]} />
        </View>
      ))}
    </View>
  );
};

/**
 * Renders the standard full-width admin action button with optional loading state.
 */
export const AdminActionButton = ({
  danger = false,
  icon,
  label,
  loading = false,
  onPress,
  primary = false,
}: {
  danger?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}) => {
  const theme = useMobileTheme();
  const color = primary ? '#fff' : danger ? '#b91c1c' : theme.hex;

  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      style={[
        styles.actionButton,
        primary ? { backgroundColor: theme.hex, borderColor: theme.hex } : { backgroundColor: theme.selection, borderColor: theme.light },
        danger ? styles.dangerSoftButton : null,
        loading ? styles.disabledButton : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : <Ionicons color={color} name={icon} size={16} />}
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
};

/**
 * Renders a compact action button used in card headers.
 */
export const SmallAction = ({
  danger = false,
  icon,
  label,
  loading = false,
  onPress,
}: {
  danger?: boolean;
  icon: AdminIconName;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) => (
  <Pressable disabled={loading} onPress={onPress} style={[styles.smallAction, danger ? styles.smallActionDanger : null]}>
    {loading ? <ActivityIndicator color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} size="small" /> : (
      <Ionicons color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} name={icon} size={14} />
    )}
    <Text style={[styles.smallActionText, danger ? styles.smallActionTextDanger : null]}>{label}</Text>
  </Pressable>
);

/**
 * Renders one task-status filter chip.
 */
export const StatusChip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => {
  const theme = useMobileTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.statusTab, active ? { backgroundColor: theme.selection, borderColor: theme.light } : null]}
    >
      <Text style={[styles.statusTabText, active ? { color: theme.hex } : null]}>{label}</Text>
    </Pressable>
  );
};

/**
 * Displays one compact metric in admin overview grids.
 */
export const Metric = ({
  icon,
  label,
  meta,
  value,
}: {
  icon: AdminIconName;
  label: string;
  meta: string;
  value: string;
}) => (
  <View style={styles.metric}>
    <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={17} />
    <Text style={styles.metricLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
    <Text numberOfLines={1} style={styles.metricMeta}>{meta}</Text>
  </View>
);

/**
 * Displays one system information value with shared formatting.
 */
export const InfoItem = ({ label, value }: { label: string; value: unknown }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text numberOfLines={2} style={styles.infoValue}>{formatAdminInfoValue(value)}</Text>
  </View>
);

/**
 * Renders a titled list of backend information items.
 */
export const InfoSection = ({ items, title }: { items: AdminInfoItem[]; title: string }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {items.length > 0 ? items.slice(0, 16).map((item) => (
      <View key={`${title}-${item.label}`} style={styles.infoRow}>
        <Text numberOfLines={1} style={styles.infoLabel}>{item.label}</Text>
        <Text numberOfLines={2} style={styles.infoValue}>{formatAdminInfoValue(item.value)}</Text>
      </View>
    )) : <EmptyLine text="当前接口未返回可展示数据" />}
  </View>
);

/**
 * Wraps a gallery editor section with a title and meta label.
 */
export const EditorSection = ({ children, meta, title }: { children: ReactNode; meta: string; title: string }) => (
  <View style={styles.editorSection}>
    <View style={styles.editorSectionTitle}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardMeta}>{meta}</Text>
    </View>
    {children}
  </View>
);

/**
 * Renders one text input field in admin mobile forms.
 */
export const FormField = ({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'numeric';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) => (
  <View style={styles.formField}>
    <Text style={styles.formLabel}>{label}</Text>
    <TextInput
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
      style={styles.input}
      value={value}
    />
  </View>
);

/**
 * Renders a tappable boolean tile for editor and settings forms.
 */
export const CheckTile = ({
  active,
  disabled = false,
  label,
  meta,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  meta?: string;
  onPress: () => void;
}) => {
  const theme = useMobileTheme();

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.checkTile,
        active ? { backgroundColor: theme.selection, borderColor: theme.light } : null,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Ionicons
        color={active ? theme.hex : MOBILE_SAGE_SLATE.subtle}
        name={active ? 'checkmark-circle-outline' : 'ellipse-outline'}
        size={16}
      />
      <View style={styles.checkTileCopy}>
        <Text numberOfLines={1} style={[styles.checkTileText, active ? { color: theme.hex } : null]}>{label}</Text>
        {meta ? <Text numberOfLines={1} style={[styles.checkTileMeta, active ? { color: theme.hex } : null]}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
};

/**
 * Renders a muted one-line empty state across admin panels.
 */
export const EmptyLine = ({ text }: { text: string }) => {
  return <Text style={styles.emptyText}>{text}</Text>;
};
