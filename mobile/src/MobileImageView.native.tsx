import type { ComponentType, ReactNode, RefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  VirtualizedList,
} from 'react-native';
import type {
  GestureResponderHandlers,
  ImageLoadEvent,
  ImageSourcePropType,
  ModalProps,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewProps,
} from 'react-native';
import ImageDefaultHeader from 'react-native-image-viewing/dist/components/ImageDefaultHeader';
import { ImageLoading } from 'react-native-image-viewing/dist/components/ImageItem/ImageLoading';
import StatusBarManager from 'react-native-image-viewing/dist/components/StatusBarManager';
import useDoubleTapToZoom from 'react-native-image-viewing/dist/hooks/useDoubleTapToZoom';
import useImageDimensions from 'react-native-image-viewing/dist/hooks/useImageDimensions';
import useImageIndexChange from 'react-native-image-viewing/dist/hooks/useImageIndexChange';
import usePanResponder from 'react-native-image-viewing/dist/hooks/usePanResponder';
import useRequestClose from 'react-native-image-viewing/dist/hooks/useRequestClose';
import { getImageStyles, getImageTransform } from 'react-native-image-viewing/dist/utils';
import type {
  Dimensions as ImageViewingDimensions,
  ImageSource,
  Position,
} from 'react-native-image-viewing/dist/@types';

type ImageViewSource = ImageSourcePropType & { uri?: string };
type ImageViewOverlayRenderer = (props: { imageIndex: number }) => ReactNode;

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
  onImageSourceCommit?: (imageIndex: number, imageSrc: ImageViewSource) => void;
  onImageSourceError?: (imageIndex: number, imageSrc: ImageViewSource) => void;
  onLongPress?: (image: ImageViewSource) => void;
  onRequestClose: () => void;
  onSwipeStart?: () => void;
  OverlayComponent?: ImageViewOverlayRenderer;
  presentationStyle?: ModalProps['presentationStyle'];
  shouldRenderImageItem?: (imageIndex: number) => boolean;
  swipeToCloseEnabled?: boolean;
  visible: boolean;
}

const DEFAULT_ANIMATION_TYPE: ModalProps['animationType'] = 'fade';
const DEFAULT_BG_COLOR = '#000';
const DEFAULT_DELAY_LONG_PRESS = 800;
const IMAGE_SOURCE_FADE_DURATION_MS = 160;
const SWIPE_CLOSE_OFFSET = 75;
const SWIPE_CLOSE_VELOCITY_ANDROID = 1.75;
const SWIPE_CLOSE_VELOCITY_IOS = 1.55;
const SCREEN = Dimensions.get('screen');
const ANDROID_SCREEN = Dimensions.get('window');
const SCREEN_WIDTH = SCREEN.width;

const createImageSourceKey = (imageSrc: ImageViewSource): string => {
  if (typeof imageSrc === 'number') {
    return `asset:${imageSrc}`;
  }

  return imageSrc.uri ?? JSON.stringify(imageSrc);
};

const getTransformParts = (
  imageDimensions: ReturnType<typeof useImageDimensions>,
  screen: { height: number; width: number },
): [Position, number] => {
  const [translate, scale] = getImageTransform(imageDimensions, screen);

  return [
    translate ?? { x: 0, y: 0 },
    scale ?? 1,
  ];
};

/**
 * Extracts the decoded image size from React Native's load event.
 */
const getImageLoadDimensions = (
  event: ImageLoadEvent,
): ImageViewingDimensions | undefined => {
  const { height, width } = event.nativeEvent.source;

  if (!height || !width) {
    return undefined;
  }

  return { height, width };
};

/**
 * Guards against stale load events from a source that has already been replaced.
 */
const isImageLoadForSource = (
  event: ImageLoadEvent,
  imageSrc: ImageViewSource,
): boolean => {
  if (typeof imageSrc === 'number') {
    return true;
  }

  const loadedUri = event.nativeEvent.source.uri;

  return !imageSrc.uri || !loadedUri || imageSrc.uri === loadedUri;
};

interface SmoothImageStackProps extends ViewProps {
  displaySource: ImageViewSource;
  imageStyle: object;
  onDisplayLoad: (event: ImageLoadEvent) => void;
  onPendingError: () => void;
  onPendingLoad: (event: ImageLoadEvent) => void;
  pendingOpacity: Animated.Value;
  pendingSource?: ImageViewSource;
  responderHandlers?: GestureResponderHandlers;
}

const SmoothImageStack = ({
  displaySource,
  imageStyle,
  onDisplayLoad,
  onPendingError,
  onPendingLoad,
  pendingOpacity,
  pendingSource,
  responderHandlers,
  ...viewProps
}: SmoothImageStackProps) => (
  <Animated.View
    {...viewProps}
    {...responderHandlers}
    style={[imageStyle, styles.smoothImageStack]}
  >
    <Animated.Image
      key={createImageSourceKey(displaySource)}
      onLoad={onDisplayLoad}
      source={displaySource as ImageSource}
      style={styles.smoothImageLayer}
    />
    {pendingSource ? (
      <Animated.Image
        key={createImageSourceKey(pendingSource)}
        onError={onPendingError}
        onLoad={onPendingLoad}
        source={pendingSource as ImageSource}
        style={[styles.smoothImageLayer, { opacity: pendingOpacity }]}
      />
    ) : null}
  </Animated.View>
);

/**
 * Keeps the visible image inside the zoomable item while a higher-quality source loads.
 */
const SmoothImageItem = ({
  delayLongPress,
  doubleTapToZoomEnabled = true,
  imageIndex,
  imageSrc,
  onLongPress,
  onRequestClose,
  onSourceCommit,
  onSourceError,
  onZoom,
  swipeToCloseEnabled = true,
}: {
  delayLongPress: number;
  doubleTapToZoomEnabled?: boolean;
  imageIndex: number;
  imageSrc: ImageViewSource;
  onLongPress: (image: ImageViewSource) => void;
  onRequestClose: () => void;
  onSourceCommit?: (imageIndex: number, imageSrc: ImageViewSource) => void;
  onSourceError?: (imageIndex: number, imageSrc: ImageViewSource) => void;
  onZoom: (isScaled: boolean) => void;
  swipeToCloseEnabled?: boolean;
}) => {
  const iosScrollViewRef = useRef<ScrollView | null>(null);
  const androidScrollViewRef = useRef<ScrollView | null>(null);
  const pendingOpacity = useRef(new Animated.Value(0)).current;
  const pendingDimensionsRef = useRef<ImageViewingDimensions | undefined>(
    undefined,
  );
  const [displayLoaded, setDisplayLoaded] = useState(false);
  const [displaySource, setDisplaySource] = useState(imageSrc);
  const [displayDimensions, setDisplayDimensions] =
    useState<ImageViewingDimensions>();
  const [iosScaled, setIosScaled] = useState(false);
  const [pendingSource, setPendingSource] = useState<ImageViewSource>();
  const displaySourceKeyRef = useRef(createImageSourceKey(imageSrc));
  const pendingSourceKeyRef = useRef<string | undefined>(undefined);
  const committedPendingSourceKeyRef = useRef<string | undefined>(undefined);
  const committedPendingSourceRef = useRef<ImageViewSource | undefined>(
    undefined,
  );
  const measuredDisplayDimensions = useImageDimensions(
    displaySource as ImageSource,
  );
  const imageDimensions = displayDimensions ?? measuredDisplayDimensions;
  const {
    androidScrollValueY,
    iosScaleValue,
    iosScrollValueY,
    iosTranslateValue,
    scale,
    translate,
  } = useMemo(() => {
    const [nextTranslate, nextScale] = getTransformParts(
      imageDimensions,
      Platform.OS === 'android' ? ANDROID_SCREEN : SCREEN,
    );

    return {
      androidScrollValueY: new Animated.Value(0),
      iosScaleValue: new Animated.Value(nextScale),
      iosScrollValueY: new Animated.Value(0),
      iosTranslateValue: new Animated.ValueXY(nextTranslate),
      scale: nextScale,
      translate: nextTranslate,
    };
  }, [imageDimensions?.height, imageDimensions?.width]);
  const iosDoubleTapHandler = useDoubleTapToZoom(
    iosScrollViewRef as RefObject<ScrollView>,
    iosScaled,
    SCREEN,
  );
  const iosImageOpacity = iosScrollValueY.interpolate({
    inputRange: [-SWIPE_CLOSE_OFFSET, 0, SWIPE_CLOSE_OFFSET],
    outputRange: [0.5, 1, 0.5],
  });

  const commitPendingSource = useCallback(
    (source: ImageViewSource, sourceKey: string): void => {
      Animated.timing(pendingOpacity, {
        duration: IMAGE_SOURCE_FADE_DURATION_MS,
        toValue: 1,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || pendingSourceKeyRef.current !== sourceKey) {
          return;
        }

        displaySourceKeyRef.current = sourceKey;
        committedPendingSourceKeyRef.current = sourceKey;
        committedPendingSourceRef.current = source;
        if (pendingDimensionsRef.current) {
          setDisplayDimensions(pendingDimensionsRef.current);
        }
        setDisplayLoaded(true);
        setDisplaySource(source);
        onSourceCommit?.(imageIndex, source);
      });
    },
    [imageIndex, onSourceCommit, pendingOpacity],
  );

  useEffect(() => {
    if (measuredDisplayDimensions) {
      setDisplayDimensions(measuredDisplayDimensions);
    }
  }, [measuredDisplayDimensions]);

  useEffect(() => {
    const nextSourceKey = createImageSourceKey(imageSrc);

    if (
      nextSourceKey === displaySourceKeyRef.current ||
      nextSourceKey === pendingSourceKeyRef.current
    ) {
      return;
    }

    pendingOpacity.stopAnimation();
    pendingOpacity.setValue(0);
    pendingDimensionsRef.current = undefined;
    committedPendingSourceKeyRef.current = undefined;
    committedPendingSourceRef.current = undefined;
    pendingSourceKeyRef.current = nextSourceKey;
    setPendingSource(imageSrc);
  }, [imageSrc, pendingOpacity]);

  const handleDisplayLoad = useCallback((event: ImageLoadEvent): void => {
    if (!isImageLoadForSource(event, displaySource)) {
      return;
    }

    const loadedDimensions = getImageLoadDimensions(event);

    if (loadedDimensions) {
      setDisplayDimensions(loadedDimensions);
    }

    setDisplayLoaded(true);

    const committedSource = committedPendingSourceRef.current;

    if (
      !committedSource ||
      committedPendingSourceKeyRef.current !== displaySourceKeyRef.current
    ) {
      return;
    }

    pendingDimensionsRef.current = undefined;
    pendingSourceKeyRef.current = undefined;
    committedPendingSourceKeyRef.current = undefined;
    committedPendingSourceRef.current = undefined;
    setPendingSource(undefined);
    pendingOpacity.setValue(0);
  }, [displaySource, pendingOpacity]);

  const handlePendingLoad = useCallback((event: ImageLoadEvent): void => {
    if (!pendingSource || !pendingSourceKeyRef.current) {
      return;
    }

    if (!isImageLoadForSource(event, pendingSource)) {
      return;
    }

    pendingDimensionsRef.current = getImageLoadDimensions(event);
    commitPendingSource(pendingSource, pendingSourceKeyRef.current);
  }, [commitPendingSource, pendingSource]);

  const handlePendingError = useCallback((): void => {
    const failedSource = pendingSource;

    pendingSourceKeyRef.current = undefined;
    committedPendingSourceKeyRef.current = undefined;
    committedPendingSourceRef.current = undefined;
    pendingDimensionsRef.current = undefined;
    setPendingSource(undefined);
    pendingOpacity.setValue(0);

    if (failedSource) {
      onSourceError?.(imageIndex, failedSource);
    }
  }, [imageIndex, onSourceError, pendingOpacity, pendingSource]);

  const handleLongPress = useCallback((): void => {
    onLongPress(displaySource);
  }, [displaySource, onLongPress]);

  const iosScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    const scaled = (event.nativeEvent.zoomScale ?? 0) > 1;

    onZoom(scaled);
    setIosScaled(scaled);

    if (!scaled && swipeToCloseEnabled && Math.abs(velocityY) > SWIPE_CLOSE_VELOCITY_IOS) {
      onRequestClose();
    }
  }, [onRequestClose, onZoom, swipeToCloseEnabled]);

  const iosScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0;

    if ((event.nativeEvent.zoomScale ?? 0) > 1) {
      return;
    }

    iosScrollValueY.setValue(offsetY);
  }, [iosScrollValueY]);

  const [androidPanHandlers, androidScaleValue, androidTranslateValue] = usePanResponder({
    delayLongPress,
    doubleTapToZoomEnabled,
    initialScale: scale,
    initialTranslate: translate,
    onLongPress: handleLongPress,
    onZoom,
  });
  const androidImageOpacity = androidScrollValueY.interpolate({
    inputRange: [-SWIPE_CLOSE_OFFSET, 0, SWIPE_CLOSE_OFFSET],
    outputRange: [0.7, 1, 0.7],
  });
  const androidScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const velocityY = event.nativeEvent.velocity?.y ?? 0;
    const offsetY = event.nativeEvent.contentOffset?.y ?? 0;

    if (
      (Math.abs(velocityY) > SWIPE_CLOSE_VELOCITY_ANDROID && offsetY > SWIPE_CLOSE_OFFSET) ||
      offsetY > ANDROID_SCREEN.height / 2
    ) {
      onRequestClose();
    }
  }, [onRequestClose]);
  const androidScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    androidScrollValueY.setValue(event.nativeEvent.contentOffset?.y ?? 0);
  }, [androidScrollValueY]);

  if (Platform.OS === 'android') {
    const androidImageStyle = {
      ...getImageStyles(imageDimensions, androidTranslateValue, androidScaleValue),
      opacity: androidImageOpacity,
    };

    return (
      <ScrollView
        contentContainerStyle={styles.androidImageScrollContainer}
        nestedScrollEnabled
        onScroll={swipeToCloseEnabled ? androidScroll : undefined}
        onScrollEndDrag={swipeToCloseEnabled ? androidScrollEndDrag : undefined}
        pagingEnabled
        ref={androidScrollViewRef}
        scrollEnabled={swipeToCloseEnabled}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.androidListItem}
      >
        <SmoothImageStack
          displaySource={displaySource}
          imageStyle={androidImageStyle}
          onDisplayLoad={handleDisplayLoad}
          onPendingError={handlePendingError}
          onPendingLoad={handlePendingLoad}
          pendingOpacity={pendingOpacity}
          pendingSource={pendingSource}
          responderHandlers={androidPanHandlers}
        />
        {(!displayLoaded || !imageDimensions) && <ImageLoading />}
      </ScrollView>
    );
  }

  const iosImageStyle = {
    ...getImageStyles(imageDimensions, iosTranslateValue, iosScaleValue),
    opacity: iosImageOpacity,
  };

  return (
    <View>
      <ScrollView
        contentContainerStyle={styles.iosImageScrollContainer}
        maximumZoomScale={Math.max(1 / scale, 1)}
        onScroll={swipeToCloseEnabled ? iosScroll : undefined}
        onScrollEndDrag={iosScrollEndDrag}
        pinchGestureEnabled
        ref={iosScrollViewRef}
        scrollEnabled={swipeToCloseEnabled}
        scrollEventThrottle={1}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.iosListItem}
      >
        {(!displayLoaded || !imageDimensions) && <ImageLoading />}
        <TouchableWithoutFeedback
          delayLongPress={delayLongPress}
          onLongPress={handleLongPress}
          onPress={doubleTapToZoomEnabled ? iosDoubleTapHandler : undefined}
        >
          <SmoothImageStack
            displaySource={displaySource}
            imageStyle={iosImageStyle}
            onDisplayLoad={handleDisplayLoad}
            onPendingError={handlePendingError}
            onPendingLoad={handlePendingLoad}
            pendingOpacity={pendingOpacity}
            pendingSource={pendingSource}
          />
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  );
};

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
  onImageSourceCommit,
  onImageSourceError,
  onLongPress = () => undefined,
  onRequestClose,
  onSwipeStart,
  OverlayComponent,
  presentationStyle,
  shouldRenderImageItem,
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
          extraData={images}
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
          onScrollBeginDrag={onSwipeStart}
          pagingEnabled
          ref={imageListRef}
          renderItem={({ item, index }) => {
            const renderImageItem = shouldRenderImageItem?.(index) ?? true;

            return (
              <View style={styles.itemFrame}>
                {renderImageItem ? (
                  <SmoothImageItem
                    delayLongPress={DEFAULT_DELAY_LONG_PRESS}
                    doubleTapToZoomEnabled={doubleTapToZoomEnabled}
                    imageIndex={index}
                    imageSrc={item}
                    onLongPress={onLongPress}
                    onRequestClose={onRequestCloseEnhanced}
                    onSourceCommit={onImageSourceCommit}
                    onSourceError={onImageSourceError}
                    onZoom={handleZoom}
                    swipeToCloseEnabled={swipeToCloseEnabled}
                  />
                ) : null}
                {OverlayComponent ? (
                  <View pointerEvents="box-none" style={styles.itemOverlay}>
                    {OverlayComponent({ imageIndex: index })}
                  </View>
                ) : null}
                {ItemOverlayComponent ? (
                  <View pointerEvents="box-none" style={styles.itemOverlay}>
                    <ItemOverlayComponent imageIndex={index} />
                  </View>
                ) : null}
              </View>
            );
          }}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          windowSize={2}
        />
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
  androidImageScrollContainer: {
    height: ANDROID_SCREEN.height * 2,
  },
  androidListItem: {
    height: ANDROID_SCREEN.height,
    width: ANDROID_SCREEN.width,
  },
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
  iosImageScrollContainer: {
    height: SCREEN.height,
  },
  iosListItem: {
    height: SCREEN.height,
    width: SCREEN_WIDTH,
  },
  smoothImageLayer: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
  },
  smoothImageStack: {
    overflow: 'hidden',
  },
});

export default EnhancedMobileImageView;
