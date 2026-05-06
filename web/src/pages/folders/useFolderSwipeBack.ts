import { useCallback, useRef } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";

const EDGE_START_WIDTH = 58;
const MAX_START_Y = 700;
const MIN_SWIPE_DISTANCE = 72;
const MAX_VERTICAL_DRIFT = 54;
const MIN_HORIZONTAL_RATIO = 1.35;
const MOBILE_QUERY = "(max-width: 860px)";

interface UseFolderSwipeBackOptions {
  enabled?: boolean;
  onBack: () => void;
}

/**
 * Adds an iOS-like left-edge swipe gesture for folder back navigation.
 */
export const useFolderSwipeBack = ({
  enabled = true,
  onBack,
}: UseFolderSwipeBackOptions) => {
  const activeRef = useRef(false);
  const shouldCommitRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);

  const resetSwipe = useCallback((): void => {
    activeRef.current = false;
    shouldCommitRef.current = false;
    startXRef.current = 0;
    startYRef.current = 0;
  }, []);

  const handleTouchStart = useCallback(
    (event: ReactTouchEvent<HTMLElement>): void => {
      if (!enabled || !isMobileSwipeViewport()) {
        resetSwipe();
        return;
      }

      const touch = event.touches[0];
      if (
        !touch ||
        touch.clientX > EDGE_START_WIDTH ||
        touch.clientY > MAX_START_Y
      ) {
        resetSwipe();
        return;
      }

      activeRef.current = true;
      shouldCommitRef.current = false;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
    },
    [enabled, resetSwipe],
  );

  const handleTouchMove = useCallback(
    (event: ReactTouchEvent<HTMLElement>): void => {
      if (!activeRef.current) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        resetSwipe();
        return;
      }

      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);
      const horizontalRatio = deltaX / Math.max(deltaY, 1);

      if (deltaX < 0 || deltaY > MAX_VERTICAL_DRIFT) {
        resetSwipe();
        return;
      }

      if (deltaX < 8 || horizontalRatio < MIN_HORIZONTAL_RATIO) {
        return;
      }

      shouldCommitRef.current = deltaX >= MIN_SWIPE_DISTANCE;
    },
    [resetSwipe],
  );

  const handleTouchEnd = useCallback((): void => {
    if (!activeRef.current) {
      resetSwipe();
      return;
    }

    if (!shouldCommitRef.current) {
      resetSwipe();
      return;
    }

    resetSwipe();
    onBack();
  }, [onBack, resetSwipe]);

  return {
    handlers: {
      onTouchCancel: resetSwipe,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onTouchStart: handleTouchStart,
    },
  };
};

/**
 * Keeps swipe-back limited to the compact mobile workspace.
 */
const isMobileSwipeViewport = (): boolean => {
  return (
    typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );
};
