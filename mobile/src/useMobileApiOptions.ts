import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';

import type { ApiClientOptions, AuthTokens } from '@kwphoto/core';
import { refreshAuthTokens } from '@kwphoto/core';

interface UseMobileApiOptionsParams {
  onChangeTokens: (tokens: AuthTokens) => void;
  serverUrl: string;
  tokens: AuthTokens;
}

/**
 * Creates authenticated API options for mobile screens with one-shot token refresh.
 */
export const useMobileApiOptions = ({
  onChangeTokens,
  serverUrl,
  tokens,
}: UseMobileApiOptionsParams): ApiClientOptions & { tokensRef: MutableRefObject<AuthTokens> } => {
  const tokensRef = useRef(tokens);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const apiOptions = useMemo<ApiClientOptions>(
    () => ({
      baseUrl: serverUrl,
      getAccessToken: () => tokensRef.current.accessToken,
      onUnauthorized: async () => {
        const nextTokens = await refreshAuthTokens(serverUrl, tokensRef.current);

        tokensRef.current = nextTokens;
        onChangeTokens(nextTokens);
        return nextTokens.accessToken;
      },
    }),
    [onChangeTokens, serverUrl],
  );

  return useMemo(() => ({ ...apiOptions, tokensRef }), [apiOptions]);
};
