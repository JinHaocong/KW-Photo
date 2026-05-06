import { useEffect, useRef } from "react";

import PullToRefresh from "pulltorefreshjs";

const MOBILE_QUERY = "(max-width: 860px)";
const WORKSPACE_SELECTOR = ".workspace";
const FOLDERS_PAGE_SELECTOR = ".folders-page";
const CLASS_PREFIX = "kwphoto-pull--";

interface UseWorkspacePullToRefreshOptions {
  disabled?: boolean;
  loading?: boolean;
  onRefresh: () => Promise<unknown> | void;
}

/**
 * Binds pull-to-refresh to the app workspace instead of the document body.
 *
 * The folder page scrolls inside `.workspace`, so document-level refresh gestures
 * can fight with iOS rubber-band scrolling and the folder swipe-back gesture.
 */
export const useWorkspacePullToRefresh = ({
  disabled = false,
  loading = false,
  onRefresh,
}: UseWorkspacePullToRefreshOptions): void => {
  const disabledRef = useRef(disabled);
  const loadingRef = useRef(loading);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const workspace = document.querySelector<HTMLElement>(WORKSPACE_SELECTOR);
    const foldersPage = document.querySelector<HTMLElement>(FOLDERS_PAGE_SELECTOR);

    if (!workspace || !foldersPage) {
      return undefined;
    }

    PullToRefresh.setPassiveMode(false);
    PullToRefresh.destroyAll();
    document.querySelector(`.${CLASS_PREFIX}ptr`)?.remove();

    PullToRefresh.init({
      classPrefix: CLASS_PREFIX,
      cssProp: "height",
      distIgnore: 8,
      distMax: 82,
      distReload: 46,
      distThreshold: 62,
      getStyles: () => "",
      iconArrow: '<span class="kwphoto-pull-spinner" aria-hidden="true"></span>',
      iconRefreshing: '<span class="kwphoto-pull-spinner is-active" aria-hidden="true"></span>',
      instructionsPullToRefresh: "下拉刷新",
      instructionsRefreshing: "正在刷新",
      instructionsReleaseToRefresh: "松开刷新",
      mainElement: FOLDERS_PAGE_SELECTOR,
      onRefresh: () => onRefreshRef.current(),
      ptrElement: `.${CLASS_PREFIX}ptr`,
      refreshTimeout: 120,
      resistanceFunction: (distance) => Math.min(1, distance / 2.35),
      shouldPullToRefresh: () => {
        return (
          isMobileWorkspace() &&
          !disabledRef.current &&
          !loadingRef.current &&
          workspace.scrollTop <= 1
        );
      },
      triggerElement: WORKSPACE_SELECTOR,
    });

    return () => {
      PullToRefresh.destroyAll();
      document.querySelector(`.${CLASS_PREFIX}ptr`)?.remove();
    };
  }, []);
};

/**
 * Keeps the third-party touch listener active only for compact mobile layouts.
 */
const isMobileWorkspace = (): boolean => {
  return window.matchMedia(MOBILE_QUERY).matches;
};
