import type { ComponentType } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import type { ImageSourcePropType, ModalProps } from 'react-native';

import { MobileFullscreenModal } from './components/MobileDialog';

type WebImageSource = ImageSourcePropType & { uri?: string };

interface MobileImageViewProps {
  animationType?: ModalProps['animationType'];
  backgroundColor?: string;
  doubleTapToZoomEnabled?: boolean;
  FooterComponent?: ComponentType<{ imageIndex: number }>;
  HeaderComponent?: ComponentType<{ imageIndex: number }>;
  imageIndex: number;
  images: WebImageSource[];
  keyExtractor?: (imageSrc: WebImageSource, index: number) => string;
  onImageIndexChange?: (imageIndex: number) => void;
  onLongPress?: (image: WebImageSource) => void;
  onRequestClose: () => void;
  onSwipeStart?: () => void;
  presentationStyle?: ModalProps['presentationStyle'];
  shouldRenderImageItem?: (imageIndex: number) => boolean;
  swipeToCloseEnabled?: boolean;
  visible: boolean;
}

/**
 * Provides a web-safe fallback for the native-only react-native-image-viewing package.
 */
const MobileImageView = ({
  animationType = 'fade',
  backgroundColor = '#000',
  FooterComponent,
  HeaderComponent,
  imageIndex,
  images,
  onRequestClose,
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
});

export default MobileImageView;
