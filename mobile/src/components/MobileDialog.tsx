import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import type {
  GestureResponderEvent,
  ModalProps,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MOBILE_SAGE_NEUTRALS } from "../mobile-theme";

const BOTTOM_SHEET_SAFE_AREA_FILLER_HEIGHT = 8;
const BOTTOM_SHEET_DEFAULT_HEIGHT = "52%";

interface MobileDialogProps {
  animationType?: ModalProps["animationType"];
  avoidKeyboard?: boolean;
  backdropStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  onClose: () => void;
  visible: boolean;
}

interface MobileFullscreenModalProps {
  animationType?: ModalProps["animationType"];
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
 * Reads the bottom-sheet surface color so the safe-area filler does not expose the transparent backdrop.
 */
const getBottomSheetSafeAreaBackground = (
  contentStyle?: StyleProp<ViewStyle>,
): ViewStyle["backgroundColor"] => {
  return (
    StyleSheet.flatten(contentStyle)?.backgroundColor ??
    MOBILE_SAGE_NEUTRALS.panel
  );
};

/**
 * Renders a safe-area aware center dialog for confirmation and compact forms.
 */
export const MobileCenterDialog = ({
  animationType = "fade",
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
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={
          avoidKeyboard && Platform.OS === "ios" ? "padding" : undefined
        }
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
        <Pressable
          onPress={closeOnBackdrop ? onClose : undefined}
          style={styles.centerPressableFill}
        >
          <Pressable
            onPress={stopDialogPress}
            style={[styles.centerContent, contentStyle]}
          >
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
  animationType = "slide",
  avoidKeyboard = false,
  backdropStyle,
  children,
  closeOnBackdrop = true,
  contentStyle,
  onClose,
  visible,
}: MobileDialogProps) => {
  const insets = useSafeAreaInsets();
  const bottomInset = BOTTOM_SHEET_SAFE_AREA_FILLER_HEIGHT;
  const safeAreaBackground = getBottomSheetSafeAreaBackground(contentStyle);

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={
          avoidKeyboard && Platform.OS === "ios" ? "padding" : undefined
        }
        style={[
          styles.overlay,
          styles.bottomOverlay,
          backdropStyle,
          {
            paddingTop: Math.max(insets.top + 12, 24),
          },
        ]}
      >
        <View style={styles.bottomPressableFill}>
          {closeOnBackdrop ? (
            <Pressable onPress={onClose} style={styles.bottomBackdropPressable} />
          ) : null}
          <View
            style={[
              styles.bottomContent,
              { backgroundColor: safeAreaBackground },
              contentStyle,
            ]}
          >
            {children}
            <View
              pointerEvents="none"
              style={[
                styles.bottomSafeAreaInset,
                { backgroundColor: safeAreaBackground, height: bottomInset },
              ]}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/**
 * Wraps full-screen preview surfaces without changing their internal layout.
 */
export const MobileFullscreenModal = ({
  animationType = "fade",
  children,
  contentStyle,
  onClose,
  visible,
}: MobileFullscreenModalProps) => {
  return (
    <Modal
      animationType={animationType}
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={[styles.fullscreenContent, contentStyle]}>{children}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomContent: {
    maxHeight: "94%",
    minHeight: BOTTOM_SHEET_DEFAULT_HEIGHT,
    width: "100%",
  },
  bottomOverlay: {
    justifyContent: "flex-end",
  },
  bottomPressableFill: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  bottomSafeAreaInset: {
    flexShrink: 0,
    marginBottom: -1,
  },
  centerContent: {
    maxHeight: "92%",
    width: "100%",
  },
  centerOverlay: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  centerPressableFill: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  fullscreenContent: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(15, 23, 42, 0.24)",
    flex: 1,
  },
});
