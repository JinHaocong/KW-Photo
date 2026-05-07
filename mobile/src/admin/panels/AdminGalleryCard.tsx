import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AdminGallery, AdminTask } from '@kwphoto/core';
import { isAdminGalleryTask } from '@kwphoto/core';

import { MobileCenterDialog } from '../../components/MobileDialog';
import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from '../../mobile-theme';
import type { AdminIconName } from '../adminTypes';

interface AdminGalleryCardProps {
  actionLoading: string;
  activeTasks: AdminTask[];
  gallery: AdminGallery;
  onDeleteGallery: (gallery: AdminGallery) => void;
  onOpenEditor: (gallery?: AdminGallery) => Promise<void>;
  onScanGallery: (gallery: AdminGallery, scanType?: 'check') => Promise<void>;
  onWeightGallery: (gallery: AdminGallery) => void;
}

/**
 * Renders one mobile gallery card with a Web-aligned action dialog.
 */
export const AdminGalleryCard = ({
  actionLoading,
  activeTasks,
  gallery,
  onDeleteGallery,
  onOpenEditor,
  onScanGallery,
  onWeightGallery,
}: AdminGalleryCardProps) => {
  const theme = useMobileTheme();
  const [actionsOpen, setActionsOpen] = useState(false);
  const galleryTask = findGalleryTask(activeTasks, gallery);
  const statusLabel = galleryTask ? '扫描中' : gallery.hidden ? '隐藏' : '可见';

  return (
    <Pressable onPress={() => setActionsOpen(true)} style={styles.galleryCard}>
      <View style={[styles.galleryCover, { backgroundColor: theme.selection }]}>
        <View style={[styles.galleryCoverBackground, { backgroundColor: theme.hex }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15, 23, 42, 0.18)' }]} />
        </View>
        <View style={[styles.galleryCoverPicture, { backgroundColor: theme.hex }]}>
          <View style={styles.galleryCoverTriangle} />
          <View style={[styles.galleryCoverCircle, { backgroundColor: theme.selection }]} />
        </View>
        {galleryTask ? (
          <View style={styles.galleryTaskOverlay}>
            <View style={[StyleSheet.absoluteFill, styles.galleryTaskOverlayBackground, { backgroundColor: theme.hex }]} />
            <View style={styles.galleryTaskOverlayInner}>
              <ActivityIndicator color="#fff" size="small" style={styles.galleryTaskSpinner} />
              <Text numberOfLines={1} style={styles.galleryTaskText}>{galleryTask.name}</Text>
              {galleryTask.progressLabel !== '无进度' ? (
                <Text style={styles.galleryTaskProgress}>{galleryTask.progressLabel}</Text>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.galleryBody}>
        <View style={styles.galleryTitleContainer}>
          <Text numberOfLines={1} style={styles.galleryCardTitle}>{gallery.name}</Text>
          <Text numberOfLines={1} style={styles.galleryCardPath}>{gallery.path}</Text>
        </View>
        <View style={styles.galleryCardMetaWrap}>
          <Text style={styles.galleryCardBadge}>{statusLabel}</Text>
          <Text style={styles.galleryCardBadge}>排序:{gallery.weights ?? '-'}</Text>
        </View>
      </View>
      <View style={styles.galleryMoreIcon}>
        <Ionicons color={MOBILE_SAGE_SLATE.muted} name="ellipsis-vertical" size={16} />
      </View>

      <MobileCenterDialog
        backdropStyle={styles.gallerySheetOverlay}
        contentStyle={styles.gallerySheet}
        onClose={() => setActionsOpen(false)}
        visible={actionsOpen}
      >
        <View style={styles.gallerySheetHeader}>
          <View style={[styles.gallerySheetIcon, { backgroundColor: theme.selection }]}>
            <Ionicons color={theme.hex} name="images-outline" size={18} />
          </View>
          <View style={styles.gallerySheetTitleWrap}>
            <Text numberOfLines={1} style={styles.gallerySheetTitle}>{gallery.name}</Text>
            <Text numberOfLines={1} style={styles.gallerySheetPath}>{gallery.path}</Text>
          </View>
          <Pressable onPress={() => setActionsOpen(false)} style={styles.gallerySheetClose}>
            <Ionicons color={MOBILE_SAGE_SLATE.muted} name="close-outline" size={20} />
          </Pressable>
        </View>
        <GallerySheetAction icon="folder-open-outline" label="管理图库" loading={actionLoading === `detail-${gallery.id}`} onPress={() => { setActionsOpen(false); void onOpenEditor(gallery); }} />
        <GallerySheetAction icon="refresh-outline" label="扫描图库" loading={actionLoading === `scan-${gallery.id}-normal`} onPress={() => { setActionsOpen(false); void onScanGallery(gallery); }} />
        <GallerySheetAction icon="scan-outline" label="扫描-检查模式" loading={actionLoading === `scan-${gallery.id}-check`} onPress={() => { setActionsOpen(false); void onScanGallery(gallery, 'check'); }} />
        <GallerySheetAction icon="options-outline" label="修改排序权重" onPress={() => { setActionsOpen(false); onWeightGallery(gallery); }} />
        <GallerySheetAction danger icon="trash-outline" label="删除图库" onPress={() => { setActionsOpen(false); onDeleteGallery(gallery); }} />
      </MobileCenterDialog>
    </Pressable>
  );
};

const GallerySheetAction = ({
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
  <Pressable disabled={loading} onPress={onPress} style={[styles.gallerySheetButton, danger ? styles.gallerySheetButtonDanger : null]}>
    {loading ? <ActivityIndicator color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} size="small" /> : (
      <Ionicons color={danger ? '#b91c1c' : MOBILE_SAGE_SLATE.muted} name={icon} size={18} />
    )}
    <Text style={[styles.gallerySheetButtonText, danger ? { color: '#b91c1c' } : null]}>{label}</Text>
  </Pressable>
);

const findGalleryTask = (tasks: AdminTask[], gallery: AdminGallery): AdminTask | undefined => {
  return tasks.find((task) => {
    if (!isAdminGalleryTask(task)) {
      return false;
    }

    if (task.galleryId === undefined || String(task.galleryId) === 'all') {
      return true;
    }

    return gallery.id !== undefined && String(task.galleryId) === String(gallery.id);
  });
};

const styles = StyleSheet.create({
  galleryBody: {
    gap: 6,
    minWidth: 0,
    paddingRight: 24,
  },
  galleryCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexBasis: '48%',
    gap: 8,
    maxWidth: '49%',
    minHeight: 126,
    padding: 7,
  },
  galleryCardBadge: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.control,
    borderRadius: 999,
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  galleryCardMetaWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  galleryCardPath: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  galleryCardTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 13,
    fontWeight: '900',
  },
  galleryCover: {
    borderRadius: 11,
    height: 86,
    opacity: 0.96,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  galleryCoverBackground: {
    borderTopRightRadius: 11,
    bottom: 0,
    height: '72%',
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    width: '84%',
  },
  galleryCoverCircle: {
    borderRadius: 12,
    bottom: 16,
    height: 24,
    position: 'absolute',
    right: 20,
    width: 24,
  },
  galleryCoverPicture: {
    borderBottomRightRadius: 11,
    bottom: 10,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 16,
    top: 0,
  },
  galleryCoverTriangle: {
    borderBottomColor: 'rgba(15, 23, 42, 0.25)',
    borderBottomWidth: 44,
    borderLeftColor: 'transparent',
    borderLeftWidth: 28,
    borderRightColor: 'transparent',
    borderRightWidth: 28,
    bottom: 16,
    left: 20,
    position: 'absolute',
  },
  galleryMoreIcon: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 118,
    width: 24,
  },
  gallerySheet: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(226, 232, 240, 0.96)',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 8,
    gap: 6,
    marginHorizontal: 20,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    width: '86%',
  },
  gallerySheetButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  gallerySheetButtonDanger: {
    backgroundColor: '#fffafa',
    borderColor: '#fecaca',
  },
  gallerySheetButtonText: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 13,
    fontWeight: '900',
  },
  gallerySheetClose: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  gallerySheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
    paddingLeft: 2,
  },
  gallerySheetIcon: {
    alignItems: 'center',
    borderRadius: 12,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  gallerySheetOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    flex: 1,
    justifyContent: 'center',
  },
  gallerySheetPath: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 11,
    fontWeight: '800',
  },
  gallerySheetTitle: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 14,
    fontWeight: '900',
  },
  gallerySheetTitleWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  galleryTaskOverlay: {
    height: 28,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  galleryTaskOverlayBackground: {
    opacity: 0.85,
  },
  galleryTaskOverlayInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    flexDirection: 'row',
    gap: 4,
    height: 28,
    paddingHorizontal: 8,
  },
  galleryTaskProgress: {
    color: 'rgba(255, 255, 255, 0.85)',
    flexShrink: 0,
    fontSize: 9,
    fontWeight: '900',
  },
  galleryTaskSpinner: {
    marginLeft: -2,
    transform: [{ scale: 0.75 }],
  },
  galleryTaskText: {
    color: '#fff',
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
  },
  galleryTitleContainer: {
    gap: 3,
    minWidth: 0,
  },
});
