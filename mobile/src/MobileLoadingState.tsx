import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps, StyleProp, ViewStyle } from 'react-native';

import {
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  type MobileThemeToken,
  useMobileTheme,
} from './mobile-theme';

type MobileLoadingIconName = ComponentProps<typeof Ionicons>['name'];

const MIN_PULL_REFRESH_VISIBLE_MS = 420;
const PULL_REFRESH_REVEAL_DISTANCE = 18;
const PULL_REFRESH_TRIGGER_DISTANCE = 72;

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

interface MobilePullRefreshIndicatorProps {
  active?: boolean;
  description?: string;
  icon?: MobileLoadingIconName;
  label?: string;
  style?: StyleProp<ViewStyle>;
  theme?: MobileThemeToken;
}

interface MobilePullRefreshScrollViewProps extends Omit<ScrollViewProps, 'refreshControl'> {
  onRefresh: () => void | Promise<void>;
  refreshing?: boolean;
  theme?: MobileThemeToken;
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

/**
 * Replaces native RefreshControl with a themeable pull-to-refresh ScrollView.
 */
export const MobilePullRefreshScrollView = ({
  children,
  onRefresh,
  onScroll,
  onScrollEndDrag,
  refreshing = false,
  scrollEventThrottle,
  theme,
  ...scrollViewProps
}: MobilePullRefreshScrollViewProps) => {
  const pullDistanceRef = useRef(0);
  const refreshLockedRef = useRef(false);
  const [pulling, setPulling] = useState(false);

  useEffect(() => {
    if (!refreshing) {
      refreshLockedRef.current = false;
    }
  }, [refreshing]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const pullDistance = Math.max(0, -event.nativeEvent.contentOffset.y);

      pullDistanceRef.current = pullDistance;

      setPulling((current) => {
        const next = pullDistance > PULL_REFRESH_REVEAL_DISTANCE && !refreshing;

        return current === next ? current : next;
      });
      onScroll?.(event);
    },
    [onScroll, refreshing],
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const pullDistance = Math.max(pullDistanceRef.current, Math.max(0, -event.nativeEvent.contentOffset.y));

      setPulling(false);

      if (pullDistance >= PULL_REFRESH_TRIGGER_DISTANCE && !refreshing && !refreshLockedRef.current) {
        refreshLockedRef.current = true;
        void onRefresh();
      }

      onScrollEndDrag?.(event);
    },
    [onRefresh, onScrollEndDrag, refreshing],
  );

  return (
    <ScrollView
      {...scrollViewProps}
      onScroll={handleScroll}
      onScrollEndDrag={handleScrollEndDrag}
      scrollEventThrottle={scrollEventThrottle ?? 16}
    >
      <MobilePullRefreshIndicator active={pulling || refreshing} theme={theme} />
      {children}
    </ScrollView>
  );
};

/**
 * Renders a themed in-content refresh indicator while native pull-to-refresh is active.
 */
export const MobilePullRefreshIndicator = ({
  active = true,
  style,
  theme,
}: MobilePullRefreshIndicatorProps) => {
  const contextTheme = useMobileTheme();
  const activeTheme = theme ?? contextTheme;
  const layoutValue = useRef(new Animated.Value(active ? 1 : 0)).current;
  const presenceValue = useRef(new Animated.Value(active ? 1 : 0)).current;
  const activeAnimationRef = useRef<Animated.CompositeAnimation | undefined>(undefined);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shownAtRef = useRef(active ? Date.now() : 0);

  useEffect(() => {
    const runPresenceAnimation = (toValue: number): Animated.CompositeAnimation => {
      return Animated.parallel([
        Animated.timing(layoutValue, {
          duration: toValue === 1 ? 220 : 190,
          easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
          toValue,
          useNativeDriver: false,
        }),
        toValue === 1
          ? Animated.spring(presenceValue, {
              damping: 19,
              mass: 0.78,
              stiffness: 165,
              toValue,
              useNativeDriver: true,
            })
          : Animated.timing(presenceValue, {
              duration: 180,
              easing: Easing.inOut(Easing.cubic),
              toValue,
              useNativeDriver: true,
            }),
      ]);
    };

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = undefined;
    }
    activeAnimationRef.current?.stop();

    if (active) {
      shownAtRef.current = Date.now();
      activeAnimationRef.current = runPresenceAnimation(1);
      activeAnimationRef.current.start();
    } else {
      const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : MIN_PULL_REFRESH_VISIBLE_MS;
      const exitDelay = Math.max(0, MIN_PULL_REFRESH_VISIBLE_MS - elapsed);

      exitTimerRef.current = setTimeout(() => {
        activeAnimationRef.current = runPresenceAnimation(0);
        activeAnimationRef.current.start();
      }, exitDelay);
    }

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = undefined;
      }
      activeAnimationRef.current?.stop();
    };
  }, [active, layoutValue, presenceValue]);

  const slotHeight = layoutValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 38],
  });
  const entranceTranslateY = presenceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  const entranceScale = presenceValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <Animated.View style={[styles.pullRefreshSlot, { height: slotHeight }, style]}>
      <Animated.View
        style={[
          styles.pullRefreshFrame,
          {
            opacity: presenceValue,
            transform: [{ translateY: entranceTranslateY }, { scale: entranceScale }],
          },
        ]}
      >
        <ActivityIndicator key={`pull-refresh-${activeTheme.hex}`} color={activeTheme.hex} size="large" />
      </Animated.View>
    </Animated.View>
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
  pullRefreshCard: {
    ...MOBILE_SAGE_SHADOWS.panel,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 340,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: '100%',
  },
  pullRefreshCopy: {
    flex: 1,
    gap: 1,
    minWidth: 0,
  },
  pullRefreshDescription: {
    color: MOBILE_SAGE_SLATE.subtle,
    fontSize: 10,
    fontWeight: '800',
  },
  pullRefreshFrame: {
    alignItems: 'center',
    minHeight: 34,
    justifyContent: 'center',
    paddingBottom: 4,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  pullRefreshIcon: {
    alignItems: 'center',
    borderRadius: 999,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pullRefreshPulse: {
    borderRadius: 999,
    bottom: -4,
    left: -4,
    position: 'absolute',
    right: -4,
    top: -4,
  },
  pullRefreshSpinner: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: 32,
  },
  pullRefreshSlot: {
    overflow: 'hidden',
    width: '100%',
  },
  pullRefreshTitle: {
    fontSize: 12,
    fontWeight: '900',
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
