declare module "pulltorefreshjs" {
  interface PullToRefreshHandler {
    destroy: () => void;
    mainElement?: HTMLElement;
    ptrElement?: HTMLElement | null;
    triggerElement?: HTMLElement;
  }

  interface PullToRefreshOptions {
    classPrefix?: string;
    cssProp?: string;
    distIgnore?: number;
    distMax?: number;
    distReload?: number;
    distThreshold?: number;
    getMarkup?: () => string;
    getStyles?: () => string;
    iconArrow?: string;
    iconRefreshing?: string;
    instructionsPullToRefresh?: string;
    instructionsRefreshing?: string;
    instructionsReleaseToRefresh?: string;
    mainElement?: string | HTMLElement;
    onInit?: (handler: PullToRefreshHandler) => void;
    onRefresh?: (done?: () => void) => void | Promise<unknown>;
    ptrElement?: string | HTMLElement;
    refreshTimeout?: number;
    resistanceFunction?: (distance: number) => number;
    shouldPullToRefresh?: () => boolean;
    triggerElement?: string | HTMLElement;
  }

  interface PullToRefreshApi {
    destroyAll: () => void;
    init: (options?: PullToRefreshOptions) => PullToRefreshHandler;
    setPassiveMode: (isPassive: boolean) => void;
    setPointerEventsMode?: (isEnabled: boolean) => void;
  }

  const PullToRefresh: PullToRefreshApi;

  export default PullToRefresh;
}
