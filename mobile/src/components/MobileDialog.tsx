import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type { GestureResponderEvent, ModalProps, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface MobileDialogProps {
  animationType?: ModalProps['animationType'];
  avoidKeyboard?: boolean;
  backdropStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  visible: boolean;
}

interface MobileFullscreenModalProps {
  animationType?: ModalProps['animationType'];
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  visible: boolean;
}

/**
 * Stops a dialog body tap from bubbling to the backdrop close handler.
 */
const stopDialogPress = (event: GestureResponderEvent): void => {
  event.stopPropagation();
};

/**
 * Renders a safe-area aware center dialog for confirmation and compact forms.
 */
export const MobileCenterDialog = ({
  animationType = 'fade',
  avoidKeyboard = false,
  backdropStyle,
  children,
  closeOnBackdrop = true,
  contentStyle,
  onClose,
  visible,
}: MobileDialogProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType={animationType} onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={avoidKeyboard && Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          styles.centerOverlay,
          backdropStyle,
          {
            paddingBottom: Math.max(insets.bottom + 18, 24),
            paddingTop: Math.max(insets.top + 18, 24),
          },
        ]}
      >
        <Pressable onPress={closeOnBackdrop ? onClose : undefined} style={styles.centerPressableFill}>
          <Pressable onPress={stopDialogPress} style={[styles.centerContent, contentStyle]}>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/**
 * Renders a bottom sheet with top and bottom safe-area padding already applied.
 */
export const MobileBottomSheetModal = ({
  animationType = 'slide',
  avoidKeyboard = false,
  backdropStyle,
  children,
  closeOnBackdrop = true,
  contentStyle,
  onClose,
  visible,
}: MobileDialogProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType={animationType} onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={avoidKeyboard && Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.overlay,
          styles.bottomOverlay,
          backdropStyle,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            paddingTop: Math.max(insets.top + 12, 24),
          },
        ]}
      >
        <Pressable onPress={closeOnBackdrop ? onClose : undefined} style={styles.bottomPressableFill}>
          <Pressable onPress={stopDialogPress} style={[styles.bottomContent, contentStyle]}>
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/**
 * Wraps full-screen preview surfaces without changing their internal layout.
 */
export const MobileFullscreenModal = ({
  animationType = 'fade',
  children,
  contentStyle,
  onClose,
  visible,
}: MobileFullscreenModalProps) => {
  return (
    <Modal animationType={animationType} onRequestClose={onClose} transparent visible={visible}>
      <View style={[styles.fullscreenContent, contentStyle]}>{children}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomContent: {
    maxHeight: '94%',
    width: '100%',
  },
  bottomOverlay: {
    justifyContent: 'flex-end',
  },
  bottomPressableFill: {
    flex: 1,
    justifyContent: 'flex-end',
    width: '100%',
  },
  centerContent: {
    maxHeight: '92%',
    width: '100%',
  },
  centerOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  centerPressableFill: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    width: '100%',
  },
  fullscreenContent: {
    flex: 1,
  },
  overlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    flex: 1,
  },
});
