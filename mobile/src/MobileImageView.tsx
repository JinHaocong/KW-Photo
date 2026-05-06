import type { ComponentType } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType, ModalProps } from 'react-native';

type ImageViewSource = ImageSourcePropType & { uri?: string };

interface MobileImageViewProps {
  animationType?: ModalProps['animationType'];
  backgroundColor?: string;
  doubleTapToZoomEnabled?: boolean;
  FooterComponent?: ComponentType<{ imageIndex: number }>;
  HeaderComponent?: ComponentType<{ imageIndex: number }>;
  imageIndex: number;
  images: ImageViewSource[];
  keyExtractor?: (imageSrc: ImageViewSource, index: number) => string;
  onImageIndexChange?: (imageIndex: number) => void;
  onLongPress?: (image: ImageViewSource) => void;
  onRequestClose: () => void;
  presentationStyle?: ModalProps['presentationStyle'];
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
  onRequestClose,
  presentationStyle,
  visible,
}: MobileImageViewProps) => {
  const currentImage = images[imageIndex];

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType={animationType}
      onRequestClose={onRequestClose}
      presentationStyle={presentationStyle}
      transparent={presentationStyle === 'overFullScreen'}
      visible={visible}
    >
      <View style={[styles.container, { backgroundColor }]}>
        {HeaderComponent ? <HeaderComponent imageIndex={imageIndex} /> : null}
        <Pressable onPress={onRequestClose} style={styles.imageFrame}>
          {currentImage ? <Image resizeMode="contain" source={currentImage} style={styles.image} /> : null}
        </Pressable>
        {FooterComponent ? <FooterComponent imageIndex={imageIndex} /> : null}
      </View>
    </Modal>
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
