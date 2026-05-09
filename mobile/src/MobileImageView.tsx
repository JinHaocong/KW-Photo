import type { ComponentType } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, ModalProps } from 'react-native';

import { MobileFullscreenModal } from './components/MobileDialog';

type ImageViewSource = ImageSourcePropType & { uri?: string };

interface MobileImageViewProps {
  animationType?: ModalProps['animationType'];
  backgroundColor?: string;
  doubleTapToZoomEnabled?: boolean;
  FooterComponent?: ComponentType<{ imageIndex: number }>;
  HeaderComponent?: ComponentType<{ imageIndex: number }>;
  imageIndex: number;
  images: ImageViewSource[];
  ItemOverlayComponent?: ComponentType<{ imageIndex: number }>;
  keyExtractor?: (imageSrc: ImageViewSource, index: number) => string;
  onImageIndexChange?: (imageIndex: number) => void;
  onLongPress?: (image: ImageViewSource) => void;
  onRequestClose: () => void;
  onSwipeStart?: () => void;
  OverlayComponent?: ComponentType<{ imageIndex: number }>;
  presentationStyle?: ModalProps['presentationStyle'];
  shouldRenderImageItem?: (imageIndex: number) => boolean;
  swipeToCloseEnabled?: boolean;
  visible: boolean;
}

/**
 * TypeScript fallback for platform-specific image preview implementations.
 */
const MobileImageView = ({
  animationType = 'fade',
  backgroundColor = '#000',
  FooterComponent,
  HeaderComponent,
  imageIndex,
  images,
  ItemOverlayComponent,
  onRequestClose,
  OverlayComponent,
  shouldRenderImageItem,
  visible,
}: MobileImageViewProps) => {
  const currentImage = images[imageIndex];
  const renderImageItem = shouldRenderImageItem?.(imageIndex) ?? true;

  if (!visible) {
    return null;
  }

  return (
    <MobileFullscreenModal
      animationType={animationType}
      contentStyle={[styles.container, { backgroundColor }]}
      onClose={onRequestClose}
      visible={visible}
    >
      {HeaderComponent ? <HeaderComponent imageIndex={imageIndex} /> : null}
      <Pressable onPress={onRequestClose} style={styles.imageFrame}>
        {currentImage && renderImageItem ? (
          <Image resizeMode="contain" source={currentImage} style={styles.image} />
        ) : null}
      </Pressable>
      {OverlayComponent ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <OverlayComponent imageIndex={imageIndex} />
        </View>
      ) : null}
      {ItemOverlayComponent ? (
        <View pointerEvents="box-none" style={styles.overlay}>
          <ItemOverlayComponent imageIndex={imageIndex} />
        </View>
      ) : null}
      {FooterComponent ? <FooterComponent imageIndex={imageIndex} /> : null}
    </MobileFullscreenModal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFrame: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MobileImageView;
