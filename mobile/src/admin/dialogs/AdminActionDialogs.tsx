import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
  useMobileTheme,
} from '../../mobile-theme';
import { MobileCenterDialog } from '../../components/MobileDialog';

interface AdminWeightDialogProps {
  actionLoading: string;
  galleryName?: string;
  onChangeValue: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  value: string;
  visible: boolean;
}

interface AdminConfirmDialogProps {
  danger?: boolean;
  loading: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
}

export const AdminWeightDialog = ({
  actionLoading,
  galleryName,
  onChangeValue,
  onClose,
  onSubmit,
  value,
  visible,
}: AdminWeightDialogProps) => {
  const theme = useMobileTheme();

  return (
    <MobileCenterDialog
      avoidKeyboard
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.weightSheet}
      onClose={onClose}
      visible={visible}
    >
      <View style={styles.weightSheetHeader}>
        <Text style={styles.modalTitle}>修改排序权重</Text>
        <Text style={styles.modalSubtitle}>{galleryName}</Text>
      </View>
      <TextInput
        keyboardType="numeric"
        onChangeText={onChangeValue}
        placeholder="例如 92604"
        placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
        style={styles.input}
        value={value}
      />
      <View style={styles.dialogActions}>
        <Pressable disabled={actionLoading === 'weight'} onPress={onClose} style={styles.dialogSecondaryButton}>
          <Text style={styles.dialogSecondaryText}>取消</Text>
        </Pressable>
        <Pressable disabled={actionLoading === 'weight'} onPress={onSubmit} style={[styles.dialogPrimaryButton, { backgroundColor: theme.hex }]}>
          <Text style={styles.dialogPrimaryText}>保存</Text>
        </Pressable>
      </View>
    </MobileCenterDialog>
  );
};

export const AdminConfirmDialog = ({
  danger = false,
  loading,
  message,
  onCancel,
  onConfirm,
  title,
  visible,
}: AdminConfirmDialogProps) => {
  const theme = useMobileTheme();

  return (
    <MobileCenterDialog
      backdropStyle={styles.modalOverlay}
      contentStyle={styles.confirmSheet}
      onClose={onCancel}
      visible={visible}
    >
      <Text style={styles.modalTitle}>{title}</Text>
      <Text style={styles.modalSubtitle}>{message}</Text>
      <View style={styles.dialogActions}>
        <Pressable disabled={loading} onPress={onCancel} style={styles.dialogSecondaryButton}>
          <Text style={styles.dialogSecondaryText}>取消</Text>
        </Pressable>
        <Pressable disabled={loading} onPress={onConfirm} style={[styles.dialogPrimaryButton, { backgroundColor: danger ? '#dc2626' : theme.hex }]}>
          <Text style={styles.dialogPrimaryText}>{danger ? '删除' : '确定'}</Text>
        </Pressable>
      </View>
    </MobileCenterDialog>
  );
};

const styles = StyleSheet.create({
  confirmSheet: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderRadius: 20,
    gap: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
  },
  dialogPrimaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  dialogPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  dialogSecondaryButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  dialogSecondaryText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '900',
  },
  input: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 14,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  modalOverlay: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.sheetOverlay,
  },
  modalSubtitle: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  modalTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 18,
    fontWeight: '900',
  },
  weightSheet: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderRadius: 22,
    gap: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  weightSheetHeader: {
    gap: 8,
  },
});
