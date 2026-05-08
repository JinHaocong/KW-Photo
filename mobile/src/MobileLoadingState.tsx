import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  type MobileThemeToken,
  useMobileTheme,
} from './mobile-theme';

type MobileLoadingIconName = ComponentProps<typeof Ionicons>['name'];

interface MobileLoadingStateProps {
  compact?: boolean;
  description?: string;
  icon?: MobileLoadingIconName;
  style?: StyleProp<ViewStyle>;
  theme?: MobileThemeToken;
  title: string;
}

interface MobileRefreshPillProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Renders a polished mobile loading state shared by folders, admin, settings and boot screens.
 */
export const MobileLoadingState = ({
  compact = false,
  description,
  icon = 'sparkles-outline',
  style,
  theme,
  title,
}: MobileLoadingStateProps) => {
  const contextTheme = useMobileTheme();
  const activeTheme = theme ?? contextTheme;

  return (
    <View style={[styles.loadingFrame, compact ? styles.compactLoadingFrame : null, style]}>
      <View style={[styles.loadingCard, compact ? styles.compactLoadingCard : null]}>
        <View
          style={[
            styles.loadingVisual,
            compact ? styles.compactLoadingVisual : null,
            { backgroundColor: activeTheme.selection, borderColor: activeTheme.light },
          ]}
        >
          <ActivityIndicator color={activeTheme.hex} size={compact ? 'small' : 'large'} />
          <View style={styles.loadingIconBadge}>
            <Ionicons color={activeTheme.hex} name={icon} size={compact ? 14 : 17} />
          </View>
        </View>
        <View style={[styles.loadingCopy, compact ? styles.compactLoadingCopy : null]}>
          <Text style={styles.loadingTitle}>{title}</Text>
          {description ? <Text style={styles.loadingDescription}>{description}</Text> : null}
        </View>
      </View>
    </View>
  );
};

/**
 * Shows a small in-page refresh status pill while native pull-to-refresh is active.
 */
export const MobileRefreshPill = ({ label = '正在刷新', style }: MobileRefreshPillProps) => {
  const theme = useMobileTheme();

  return (
    <View style={[styles.refreshPill, { borderColor: theme.selection }, style]}>
      <ActivityIndicator color={theme.hex} size="small" />
      <Text style={[styles.refreshPillText, { color: theme.hex }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compactLoadingCard: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '100%',
    minHeight: 74,
    padding: 12,
  },
  compactLoadingCopy: {
    alignItems: 'flex-start',
  },
  compactLoadingFrame: {
    minHeight: 82,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  compactLoadingVisual: {
    height: 44,
    width: 44,
  },
  loadingCard: {
    ...MOBILE_SAGE_SHADOWS.panel,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    maxWidth: 290,
    padding: 18,
    width: '100%',
  },
  loadingCopy: {
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  loadingDescription: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'center',
  },
  loadingFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  loadingIconBadge: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    borderRadius: 999,
    borderWidth: 1,
    bottom: -2,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 24,
  },
  loadingTitle: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 15,
    fontWeight: '900',
  },
  loadingVisual: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 58,
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative',
    width: 58,
  },
  refreshPill: {
    ...MOBILE_SAGE_SHADOWS.panel,
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    minHeight: 32,
    paddingHorizontal: 11,
  },
  refreshPillText: {
    fontSize: 11,
    fontWeight: '900',
  },
});
