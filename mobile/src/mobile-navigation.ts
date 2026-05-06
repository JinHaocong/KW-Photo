import type { MobilePage } from './mobile-types';

export interface MobileNavItem {
  adminOnly?: boolean;
  icon: string;
  key: MobilePage;
  label: string;
  symbol: string;
}

export const MOBILE_MENU_MAX_COUNT = 6;
export const MOBILE_MENU_MIN_COUNT = 3;
export const REQUIRED_MOBILE_MENU_PAGE: MobilePage = 'settings';
export const DEFAULT_MOBILE_MENU_PAGES: MobilePage[] = ['photos', 'folders', 'search', 'upload', 'admin', 'settings'];

export const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { icon: 'calendar-outline', key: 'photos', label: '时间线', symbol: 'P' },
  { icon: 'time-outline', key: 'recent', label: '最近', symbol: 'R' },
  { icon: 'images-outline', key: 'albums', label: '相册', symbol: 'L' },
  { icon: 'folder-open-outline', key: 'folders', label: '文件夹', symbol: 'F' },
  { icon: 'people-outline', key: 'people', label: '人物', symbol: 'U' },
  { icon: 'map-outline', key: 'map', label: '地图', symbol: 'M' },
  { icon: 'search-outline', key: 'search', label: '搜索', symbol: 'S' },
  { icon: 'pricetag-outline', key: 'tags', label: '标签', symbol: 'T' },
  { icon: 'cloud-upload-outline', key: 'upload', label: '上传', symbol: 'U' },
  { icon: 'share-social-outline', key: 'share', label: '分享', symbol: 'H' },
  { icon: 'trash-outline', key: 'trash', label: '回收站', symbol: 'D' },
  { icon: 'eye-off-outline', key: 'hidden', label: '隐私', symbol: 'N' },
  { adminOnly: true, icon: 'shield-checkmark-outline', key: 'admin', label: '管理', symbol: 'A' },
  { icon: 'settings-outline', key: 'settings', label: '设置', symbol: 'C' },
];

/**
 * Returns navigation items available to the current mobile user.
 */
export const getAllowedMobileNavItems = (isAdmin: boolean): MobileNavItem[] => {
  return MOBILE_NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
};

/**
 * Keeps mobile bottom-menu preferences inside product limits.
 */
export const normalizeMobileMenuPages = (pages: MobilePage[] | undefined, isAdmin: boolean): MobilePage[] => {
  const allowedPages = getAllowedMobileNavItems(isAdmin).map((item) => item.key);
  const fallbackPages = DEFAULT_MOBILE_MENU_PAGES.filter((page) => allowedPages.includes(page));
  const selectedPages = pages && pages.length > 0 ? pages : fallbackPages;
  const configurablePages = Array.from(new Set(selectedPages))
    .filter((page) => allowedPages.includes(page) && page !== REQUIRED_MOBILE_MENU_PAGE);
  const nextPages = configurablePages.slice(0, MOBILE_MENU_MAX_COUNT - 1);

  fallbackPages.forEach((page) => {
    if (page === REQUIRED_MOBILE_MENU_PAGE || nextPages.length >= getMobileMenuMinCount(isAdmin) - 1) {
      return;
    }

    if (!nextPages.includes(page)) {
      nextPages.push(page);
    }
  });

  return [...nextPages.slice(0, MOBILE_MENU_MAX_COUNT - 1), REQUIRED_MOBILE_MENU_PAGE];
};

/**
 * Returns the minimum number of entries required by the configurable bottom tabbar.
 */
export const getMobileMenuMinCount = (isAdmin: boolean): number => {
  return Math.min(MOBILE_MENU_MIN_COUNT, getAllowedMobileNavItems(isAdmin).length);
};
