import type { ComponentType } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  View,
  VirtualizedList,
} from 'react-native';
import type { ImageSourcePropType, ModalProps } from 'react-native';
import ImageDefaultHeader from 'react-native-image-viewing/dist/components/ImageDefaultHeader';
// @ts-expect-error react-native-image-viewing resolves ImageItem by platform suffix at runtime.
import ImageItem from 'react-native-image-viewing/dist/components/ImageItem/ImageItem';
import StatusBarManager from 'react-native-image-viewing/dist/components/StatusBarManager';
import useImageIndexChange from 'react-native-image-viewing/dist/hooks/useImageIndexChange';
import useRequestClose from 'react-native-image-viewing/dist/hooks/useRequestClose';

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
  OverlayComponent?: ComponentType<{ imageIndex: number }>;
  presentationStyle?: ModalProps['presentationStyle'];
  swipeToCloseEnabled?: boolean;
  visible: boolean;
}

const DEFAULT_ANIMATION_TYPE: ModalProps['animationType'] = 'fade';
const DEFAULT_BG_COLOR = '#000';
const DEFAULT_DELAY_LONG_PRESS = 800;
const SCREEN = Dimensions.get('screen');
const SCREEN_WIDTH = SCREEN.width;

/**
 * Native image viewer based on react-native-image-viewing with a box-none overlay slot.
 */
const MobileImageView = ({
  animationType = DEFAULT_ANIMATION_TYPE,
  backgroundColor = DEFAULT_BG_COLOR,
  doubleTapToZoomEnabled,
  FooterComponent,
  HeaderComponent,
  imageIndex,
  images,
  ItemOverlayComponent,
  keyExtractor,
  onImageIndexChange,
  onLongPress = () => undefined,
  onRequestClose,
  OverlayComponent,
  presentationStyle,
  swipeToCloseEnabled,
  visible,
}: MobileImageViewProps) => {
  const imageListRef = useRef<VirtualizedList<ImageViewSource> | null>(null);
  const [opacity, onRequestCloseEnhanced] = useRequestClose(onRequestClose);
  const [currentImageIndex, onScroll] = useImageIndexChange(imageIndex, SCREEN);

  useEffect(() => {
    onImageIndexChange?.(currentImageIndex);
  }, [currentImageIndex, onImageIndexChange]);

  const handleZoom = useCallback((isScaled: boolean): void => {
    const listRef = imageListRef.current as unknown as { setNativeProps?: (props: Record<string, unknown>) => void } | null;

    listRef?.setNativeProps?.({ scrollEnabled: !isScaled });
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType={animationType}
      hardwareAccelerated
      onRequestClose={onRequestCloseEnhanced}
      presentationStyle={presentationStyle}
      supportedOrientations={['portrait']}
      transparent={presentationStyle === 'overFullScreen'}
      visible={visible}
    >
      <StatusBarManager presentationStyle={presentationStyle} />
      <View style={[styles.container, { opacity, backgroundColor }]}>
        <View style={styles.header}>
          {HeaderComponent ? (
            <HeaderComponent imageIndex={currentImageIndex} />
          ) : (
            <ImageDefaultHeader onRequestClose={onRequestCloseEnhanced} />
          )}
        </View>
        <VirtualizedList
          data={images}
          getItem={(_, index) => images[index]}
          getItemCount={() => images.length}
          getItemLayout={(_, index) => ({
            index,
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
          })}
          horizontal
          initialNumToRender={1}
          initialScrollIndex={imageIndex}
          keyExtractor={(imageSrc, index) => (
            keyExtractor
              ? keyExtractor(imageSrc, index)
              : typeof imageSrc === 'number'
                ? `${imageSrc}`
                : imageSrc.uri ?? `${index}`
          )}
          maxToRenderPerBatch={1}
          onMomentumScrollEnd={onScroll}
          pagingEnabled
          ref={imageListRef}
          renderItem={({ item, index }) => (
            <View style={styles.itemFrame}>
              <ImageItem
                delayLongPress={DEFAULT_DELAY_LONG_PRESS}
                doubleTapToZoomEnabled={doubleTapToZoomEnabled}
                imageSrc={item}
                onLongPress={onLongPress}
                onRequestClose={onRequestCloseEnhanced}
                onZoom={handleZoom}
                swipeToCloseEnabled={swipeToCloseEnabled}
              />
              {ItemOverlayComponent ? (
                <View pointerEvents="box-none" style={styles.itemOverlay}>
                  <ItemOverlayComponent imageIndex={index} />
                </View>
              ) : null}
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          windowSize={2}
        />
        {OverlayComponent ? (
          <View pointerEvents="box-none" style={styles.overlay}>
            <OverlayComponent imageIndex={currentImageIndex} />
          </View>
        ) : null}
        {FooterComponent ? (
          <View style={styles.footer}>
            <FooterComponent imageIndex={currentImageIndex} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const EnhancedMobileImageView = (props: MobileImageViewProps) => (
  <MobileImageView key={props.imageIndex} {...props} />
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    flex: 1,
  },
  footer: {
    bottom: 0,
    position: 'absolute',
    width: '100%',
    zIndex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 1,
  },
  itemFrame: {
    height: SCREEN.height,
    width: SCREEN_WIDTH,
  },
  itemOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});

export default EnhancedMobileImageView;
