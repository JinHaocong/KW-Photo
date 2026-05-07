import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SLATE,
} from '../mobile-theme';

interface SectionCardProps {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  meta?: string;
  title: string;
}

interface AddressInputProps {
  label: string;
  onChangeText: (value: string) => void;
  onTest: () => void;
  placeholder: string;
  testing: boolean;
  testResult?: string;
  value: string;
}

interface RadioPillProps {
  active: boolean;
  label: string;
  onPress: () => void;
  themeColor: string;
}

interface MenuChipProps {
  disabled: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  selected: boolean;
  themeColor: string;
}

/**
 * Shared visual shell for one settings group.
 */
export const SectionCard = ({ action, children, description, meta, title }: SectionCardProps) => {
  return (
    <View style={styles.card}>
      <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          {description ? <Text style={styles.cardDescription}>{description}</Text> : null}
        </View>
        {action ?? (meta ? <Text style={styles.countPill}>{meta}</Text> : null)}
      </View>
      {children}
    </View>
  );
};

export const AddressInput = ({
  label,
  onChangeText,
  onTest,
  placeholder,
  testing,
  testResult,
  value,
}: AddressInputProps) => {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputActionRow}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
          style={styles.input}
          value={value}
        />
        <Pressable disabled={testing} onPress={onTest} style={[styles.testButton, testing ? styles.disabledButton : null]}>
          <Text style={styles.testButtonText}>{testing ? '检测中' : '测试'}</Text>
        </Pressable>
      </View>
      {testResult ? <Text style={styles.fieldHint}>{testResult}</Text> : null}
    </View>
  );
};

export const RadioPill = ({ active, label, onPress, themeColor }: RadioPillProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.radioPill, active ? styles.activePill : null, active ? { borderColor: themeColor } : null]}
    >
      <Text style={[styles.radioPillText, active ? { color: themeColor } : null]}>{label}</Text>
    </Pressable>
  );
};

export const MenuChip = ({
  disabled,
  icon,
  label,
  onPress,
  selected,
  themeColor,
}: MenuChipProps) => {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.menuChip,
        selected ? styles.activePill : null,
        selected ? { borderColor: themeColor } : null,
        disabled ? styles.lockedChip : null,
      ]}
    >
      <Ionicons
        color={selected ? themeColor : MOBILE_SAGE_SLATE.muted}
        name={icon as ComponentProps<typeof Ionicons>['name']}
        size={17}
      />
      <Text numberOfLines={1} style={[styles.menuChipText, selected ? { color: themeColor } : null]}>
        {label}
      </Text>
      {selected ? <Text style={[styles.menuChipCheck, { color: themeColor }]}>✓</Text> : null}
    </Pressable>
  );
};

export const SmallActionButton = ({ label, onPress }: { label: string; onPress: () => void }) => {
  return (
    <Pressable onPress={onPress} style={styles.smallActionButton}>
      <Text style={styles.smallActionText}>{label}</Text>
    </Pressable>
  );
};

export const InfoRow = ({ label, value }: { label: string; value: string }) => {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  activePill: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
  },
  card: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 11,
    padding: 13,
  },
  cardDescription: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  cardTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 15,
    fontWeight: '900',
  },
  countPill: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.48,
  },
  field: {
    gap: 7,
  },
  fieldHint: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 12,
    fontWeight: '800',
  },
  fieldLabel: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  infoLabel: {
    color: MOBILE_SAGE_SLATE.muted,
    flex: 0.38,
    fontSize: 12,
    fontWeight: '800',
  },
  infoRow: {
    borderTopColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  infoValue: {
    color: MOBILE_SAGE_SLATE.strong,
    flex: 0.62,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  input: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    flex: 1,
    fontSize: 13,
    minHeight: 40,
    paddingHorizontal: 11,
  },
  inputActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  lockedChip: {
    opacity: 0.78,
  },
  menuChip: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10,
  },
  menuChipCheck: {
    fontSize: 12,
    fontWeight: '900',
  },
  menuChipText: {
    color: MOBILE_SAGE_SLATE.body,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
  },
  radioPill: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  radioPillText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '900',
  },
  sectionTitleCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  smallActionButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  smallActionText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 11,
    fontWeight: '900',
  },
  testButton: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  testButtonText: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
});
