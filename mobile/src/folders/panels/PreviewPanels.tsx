import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactElement } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FileDetail, FolderFileSummary } from '@kwphoto/core';

import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from '../../mobile-theme';
import type { FolderFabIconName } from '../folderConstants';
import type {
  PreviewImageSource,
} from '../folderTypes';
import { createPreviewDetailRows } from '../folderUtils';

interface PreviewToolbarButtonProps {
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  icon: FolderFabIconName;
  iconElement?: ReactElement;
  iconOpacity?: number;
  label: string;
  onPress: () => void;
}

interface PreviewMorePanelProps {
  busy: boolean;
  onRefreshDescriptor: () => void;
  onRefreshInfo: () => void;
  onRefreshThumbs: () => void;
}

interface PreviewSettingsPanelProps {
  actionDisabled: boolean;
  actionLabel: string;
  cacheLabel: string;
  hdReady: boolean;
  imageSource: PreviewImageSource;
  isVideo: boolean;
  onClose: () => void;
  onToggleMode: () => void;
  videoUsesTranscode: boolean;
}

interface PreviewSettingRowProps {
  active: boolean;
  disabled?: boolean;
  icon: FolderFabIconName;
  label: string;
  meta: string;
  onPress?: () => void;
}

interface PreviewDetailPanelProps {
  detail?: FileDetail;
  error: string;
  file?: FolderFileSummary;
  loading: boolean;
}

export const PreviewToolbarButton = ({
  active = false,
  busy = false,
  disabled = false,
  icon,
  iconElement,
  iconOpacity = 1,
  label,
  onPress,
}: PreviewToolbarButtonProps) => {
  const iconOpacityStyle = iconOpacity < 1 ? { opacity: iconOpacity } : null;

  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.previewToolButton,
        active ? styles.previewToolButtonActive : null,
        disabled || busy ? styles.previewToolButtonDisabled : null,
      ]}
    >
      {busy ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : iconElement ? (
        <View style={iconOpacityStyle}>{iconElement}</View>
      ) : (
        <Ionicons color="#fff" name={icon} size={20} style={iconOpacityStyle} />
      )}
    </Pressable>
  );
};

/**
 * Renders the preview more menu as an in-app floating panel instead of a native alert.
 */
export const PreviewMorePanel = ({
  busy,
  onRefreshDescriptor,
  onRefreshInfo,
  onRefreshThumbs,
}: PreviewMorePanelProps) => {
  return (
    <View style={styles.previewMorePanel}>
      <PreviewMoreButton
        disabled={busy}
        icon="scan-outline"
        label="刷新人脸识别"
        onPress={onRefreshDescriptor}
      />
      <PreviewMoreButton
        disabled={busy}
        icon="images-outline"
        label="刷新缩略图"
        onPress={onRefreshThumbs}
      />
      <PreviewMoreButton
        disabled={busy}
        icon="information-circle-outline"
        label="刷新 EXIF 信息"
        onPress={onRefreshInfo}
      />
    </View>
  );
};

export const PreviewSettingsPanel = ({
  actionDisabled,
  actionLabel,
  cacheLabel,
  hdReady,
  imageSource,
  isVideo,
  onClose,
  onToggleMode,
  videoUsesTranscode,
}: PreviewSettingsPanelProps) => {
  const theme = useMobileTheme();

  return (
    <View style={[styles.previewSettingsPanel, { borderColor: theme.selection }, MOBILE_SAGE_SHADOWS.floating]}>
      <View style={styles.previewSettingsHeader}>
        <View>
          <Text style={styles.previewSettingsTitle}>显示设置</Text>
          <Text style={styles.previewSettingsMeta}>当前来源：{cacheLabel}</Text>
        </View>
        <Pressable onPress={onClose} style={styles.previewSettingsClose}>
          <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close" size={18} />
        </Pressable>
      </View>
      <PreviewSettingRow
        active={!isVideo}
        icon="sparkles-outline"
        label="图片 - 优先加载高清图："
        meta={hdReady ? '高清预览图已显示' : '先显示列表缩略图，高清图获取到后自动切换'}
      />
      <PreviewSettingRow
        active={!isVideo && imageSource === 'original'}
        disabled={isVideo || actionDisabled}
        icon="image-outline"
        label="图片 - 优先加载原图："
        meta={isVideo ? '当前文件为视频，不使用图片原图设置' : (imageSource === 'original' ? '当前优先使用原图缓存' : actionLabel)}
        onPress={!isVideo ? onToggleMode : undefined}
      />
      <PreviewSettingRow
        active={!isVideo}
        icon="resize-outline"
        label="图片 - 优化长图显示："
        meta="保持完整比例，不裁切长图"
      />
      <PreviewSettingRow
        active={isVideo}
        disabled={!isVideo}
        icon="play-circle-outline"
        label="视频 - 播放控件："
        meta={!isVideo ? '当前文件为图片，不使用视频设置' : '默认只显示封面，点击封面播放后使用系统播放条'}
      />
      <PreviewSettingRow
        active={isVideo && videoUsesTranscode}
        icon="film-outline"
        label="视频 - 优先使用转码版本："
        meta={videoUsesTranscode ? '当前格式使用转码预览' : '仅直连不支持时使用转码预览'}
      />
      <PreviewSettingRow
        active={false}
        icon="open-outline"
        label="视频 - 外部播放器："
        meta="不显示，所有媒体保持应用内预览"
      />
    </View>
  );
};

export const PreviewDetailPanel = ({
  detail,
  error,
  file,
  loading,
}: PreviewDetailPanelProps) => {
  const theme = useMobileTheme();

  if (!file) {
    return null;
  }

  const rows = createPreviewDetailRows(file, detail);

  return (
    <View style={styles.previewInfoPanel}>
      <View style={styles.previewInfoHeader}>
        <Text style={styles.previewInfoTitle}>文件信息</Text>
        {loading ? <ActivityIndicator color={theme.light} size="small" /> : null}
      </View>
      {error ? <Text style={styles.previewInfoError}>{error}</Text> : null}
      <View style={styles.previewInfoRows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.previewInfoRow}>
            <Text style={styles.previewInfoLabel}>{row.label}</Text>
            <Text numberOfLines={1} style={styles.previewInfoValue}>{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PreviewMoreButton = ({
  disabled = false,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: FolderFabIconName;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={label}
    disabled={disabled}
    onPress={onPress}
    style={[styles.previewMoreButton, disabled ? styles.previewToolButtonDisabled : null]}
  >
    <Ionicons color={MOBILE_SAGE_SLATE.muted} name={icon} size={18} />
    <Text style={styles.previewMoreButtonText}>{label}</Text>
  </Pressable>
);

/**
 * Renders one official-style preview setting row with a compact status switch.
 */
const PreviewSettingRow = ({
  active,
  disabled = false,
  icon,
  label,
  meta,
  onPress,
}: PreviewSettingRowProps) => {
  const theme = useMobileTheme();
  const content = (
    <>
      <View style={[
        styles.previewSettingIcon,
        active ? styles.previewSettingIconActive : null,
        active ? { backgroundColor: theme.hex } : null,
      ]}>
        <Ionicons color={active ? '#fff' : MOBILE_SAGE_SLATE.subtle} name={icon} size={17} />
      </View>
      <View style={styles.previewSettingCopy}>
        <Text style={styles.previewSettingTitle}>{label}</Text>
        <Text style={styles.previewSettingMeta}>{meta}</Text>
      </View>
      <View style={[
        styles.previewSettingSwitch,
        active ? styles.previewSettingSwitchActive : null,
        active ? { backgroundColor: theme.hex } : null,
      ]}>
        <View style={[styles.previewSettingSwitchThumb, active ? styles.previewSettingSwitchThumbActive : null]} />
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.previewSettingRow, active ? styles.previewSettingRowActive : null]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.previewSettingRow,
        active ? styles.previewSettingRowActive : null,
        disabled ? styles.previewSettingRowDisabled : null,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  previewInfoError: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '800',
  },
  previewInfoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewInfoLabel: {
    color: MOBILE_SAGE_SLATE.subtle,
    flex: 0.34,
    fontSize: 11,
    fontWeight: '800',
  },
  previewInfoPanel: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: 'rgba(226, 232, 240, 0.88)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 12,
    ...MOBILE_SAGE_SHADOWS.floating,
  },
  previewInfoRow: {
    borderBottomColor: 'rgba(226, 232, 240, 0.72)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
  },
  previewInfoRows: {
    gap: 4,
  },
  previewInfoTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 12,
    fontWeight: '900',
  },
  previewInfoValue: {
    color: MOBILE_SAGE_SLATE.strong,
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'right',
  },
  previewMoreButton: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 9,
    minHeight: 38,
    paddingHorizontal: 10,
  },
  previewMoreButtonText: {
    color: MOBILE_SAGE_SLATE.body,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  previewMorePanel: {
    backgroundColor: '#fff',
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderRadius: 14,
    borderWidth: 1,
    gap: 2,
    padding: 8,
    position: 'absolute',
    right: 10,
    top: 124,
    width: 190,
    zIndex: 7,
    ...MOBILE_SAGE_SHADOWS.floating,
  },
  previewSettingCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewSettingIcon: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  previewSettingIconActive: {
    backgroundColor: '#16b741',
  },
  previewSettingMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    marginTop: 2,
  },
  previewSettingRow: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  previewSettingRowActive: {
    backgroundColor: '#f8fafc',
    borderColor: 'rgba(203, 213, 225, 0.92)',
  },
  previewSettingRowDisabled: {
    opacity: 0.5,
  },
  previewSettingSwitch: {
    backgroundColor: 'rgba(148, 163, 184, 0.32)',
    borderRadius: 999,
    height: 18,
    padding: 2,
    width: 34,
  },
  previewSettingSwitchActive: {
    backgroundColor: '#16b741',
  },
  previewSettingSwitchThumb: {
    alignSelf: 'flex-start',
    backgroundColor: '#cbd5e1',
    borderRadius: 999,
    height: 14,
    width: 14,
  },
  previewSettingSwitchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: '#fff',
  },
  previewSettingTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 13,
    fontWeight: '900',
  },
  previewSettingsClose: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  previewSettingsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  previewSettingsMeta: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  previewSettingsPanel: {
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    left: 10,
    padding: 14,
    position: 'absolute',
    right: 10,
    top: 124,
    zIndex: 7,
  },
  previewSettingsTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 14,
    fontWeight: '900',
  },
  previewToolButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.34)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  previewToolButtonActive: {
    backgroundColor: 'rgba(22, 183, 65, 0.78)',
    borderColor: 'rgba(255, 255, 255, 0.34)',
  },
  previewToolButtonDisabled: {
    opacity: 0.42,
  },
});
