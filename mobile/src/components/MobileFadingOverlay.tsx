import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

interface MobileFadingOverlayProps {
  children: ReactNode;
  enterDurationMs?: number;
  exitDurationMs?: number;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
  visibleOpacity?: number;
}

/**
 * Keeps an overlay mounted while opacity changes, then removes it after fade-out finishes.
 */
export const MobileFadingOverlay = ({
  children,
  enterDurationMs = 120,
  exitDurationMs = 240,
  style,
  visible,
  visibleOpacity = 1,
}: MobileFadingOverlayProps) => {
  const opacity = useRef(new Animated.Value(visible ? visibleOpacity : 0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
    }

    const animation = Animated.timing(opacity, {
      duration: visible ? enterDurationMs : exitDurationMs,
      easing: visible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
      toValue: visible ? visibleOpacity : 0,
      useNativeDriver: Platform.OS !== 'web',
    });

    animation.start(({ finished }) => {
      if (finished && !visible) {
        setMounted(false);
      }
    });

    return () => {
      animation.stop();
    };
  }, [enterDurationMs, exitDurationMs, opacity, visible, visibleOpacity]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View pointerEvents={visible ? 'auto' : 'none'} style={[style, { opacity }]}>
      {children}
    </Animated.View>
  );
};
