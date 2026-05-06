import type { ApiInfo, AuthTokens, CurrentUser } from '@kwphoto/core';

export type MobilePage =
  | 'photos'
  | 'recent'
  | 'albums'
  | 'folders'
  | 'people'
  | 'search'
  | 'tags'
  | 'map'
  | 'upload'
  | 'share'
  | 'trash'
  | 'hidden'
  | 'admin'
  | 'settings';

export interface MobileSession {
  apiInfo: ApiInfo;
  serverUrl: string;
  tokens: AuthTokens;
  user: CurrentUser;
}
