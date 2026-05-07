import type {
  AdminGallery,
  AdminGalleryUserLink,
  AdminUserRecord,
  CurrentUser,
} from '@kwphoto/core';

import type { GalleryEditorState } from './adminTypes';

export const createInitialEditorState = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): GalleryEditorState => {
  return {
    adminOnly: gallery?.adminOnly ?? false,
    folderInput: '',
    folders: gallery?.folders.map((folder) => folder.path).filter(Boolean) ?? [],
    funcExclude: gallery?.funcExclude ?? [],
    hidden: gallery?.hidden ?? false,
    name: gallery?.name ?? '',
    selectedUserIds: getSelectedUserIds(gallery, users, userLinks, currentUser),
    weights: gallery?.weights === undefined ? '' : String(gallery.weights),
  };
};

const getSelectedUserIds = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): string[] => {
  if (gallery?.id !== undefined) {
    const linkedIds = userLinks
      .filter((link) => String(link.galleryId) === String(gallery.id))
      .map((link) => String(link.userId));

    if (linkedIds.length > 0) {
      return linkedIds;
    }
  }

  if (currentUser?.id) {
    return [String(currentUser.id)];
  }

  return users[0]?.id === undefined ? [] : [String(users[0].id)];
};

export const mergeCurrentUser = (
  users: AdminUserRecord[],
  currentUser?: CurrentUser,
): AdminUserRecord[] => {
  if (!currentUser) {
    return users;
  }

  const hasCurrentUser = users.some((user) => String(user.id) === String(currentUser.id));

  if (hasCurrentUser) {
    return users;
  }

  return [
    {
      id: currentUser.id,
      roleLabel: currentUser.isSuperAdmin ? '超级管理员' : currentUser.isAdmin ? '管理员' : '普通用户',
      securityLabel: currentUser.otpEnable ? '已开启 2FA' : '未开启 2FA',
      username: currentUser.username,
    },
    ...users,
  ];
};
