import Ionicons from '@expo/vector-icons/Ionicons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { ApiInfo, AuthTokens } from '@kwphoto/core';
import {
  fetchApiInfo,
  fetchCurrentUser,
  getApiErrorMessage,
  loginWithPassword,
  refreshAuthTokens,
} from '@kwphoto/core';

import {
  clearMobileSession,
  DEFAULT_MOBILE_SERVER_URL,
  getMobileRuntimeServerCandidates,
  mergeMobilePreferences,
  normalizeMobileServerAddress,
  readMobilePreferences,
  readMobileSession,
  writeMobileSession,
} from './src/mobile-storage';
import type { MobilePreferences, MobileThemeName } from './src/mobile-storage';
import {
  DEFAULT_MOBILE_THEME,
  MOBILE_SAGE_NEUTRALS,
  MOBILE_SAGE_SHADOWS,
  MOBILE_SAGE_SLATE,
  MOBILE_THEME_TOKENS,
} from './src/mobile-theme';
import type { MobileSession } from './src/mobile-types';
import { MobileWorkspace } from './src/MobileWorkspace';

const DEFAULT_THEME = MOBILE_THEME_TOKENS[DEFAULT_MOBILE_THEME];
const queryClient = new QueryClient();

/**
 * Mobile entry screen for the Expo app.
 * It restores the mobile session and reuses shared MT Photos APIs for native screens.
 */
export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_MOBILE_SERVER_URL);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [apiInfo, setApiInfo] = useState<ApiInfo>();
  const [hydrating, setHydrating] = useState(true);
  const [session, setSession] = useState<MobileSession>();
  const [loadingAction, setLoadingAction] = useState<'connect' | 'login'>();
  const [message, setMessage] = useState('');
  const [activeTheme, setActiveTheme] = useState<MobileThemeName>(DEFAULT_MOBILE_THEME);
  const normalizedServerUrl = useMemo(() => normalizeServerUrl(serverUrl), [serverUrl]);
  const activeThemeToken = useMemo(
    () => MOBILE_THEME_TOKENS[activeTheme] ?? DEFAULT_THEME,
    [activeTheme],
  );
  const busy = Boolean(loadingAction);

  useEffect(() => {
    let mounted = true;

    /**
     * Restores local session data first, then validates network session in the background.
     */
    const hydrateMobileState = async (): Promise<void> => {
      try {
        const [storedSession, preferences] = await Promise.all([
          readMobileSession(),
          readMobilePreferences(),
        ]);

        if (!mounted) {
          return;
        }

        if (preferences.lastUsername) {
          setUsername(preferences.lastUsername);
        }

        setActiveTheme(preferences.activeTheme ?? DEFAULT_MOBILE_THEME);

        if (storedSession?.tokens.refreshToken) {
          setApiInfo(storedSession.apiInfo);
          setSession(storedSession);
          setServerUrl(storedSession.serverUrl);
          setHydrating(false);

          void validateStoredSessionInBackground(storedSession, preferences, () => mounted);
          return;
        }

        setServerUrl(getInitialMobileServerUrl(preferences));
      } finally {
        if (mounted) {
          setHydrating(false);
        }
      }
    };

    /**
     * Keeps Web-style server fallback without blocking the native first screen.
     */
    const validateStoredSessionInBackground = async (
      storedSession: MobileSession,
      preferences: MobilePreferences,
      isMounted: () => boolean,
    ): Promise<void> => {
      try {
        const nextSession = await hydrateAuthenticatedMobileSession(storedSession, preferences);

        if (!isMounted()) {
          return;
        }

        setApiInfo(nextSession.apiInfo);
        setSession(nextSession);
        setServerUrl(nextSession.serverUrl);
        void writeMobileSession(nextSession);
        void mergeMobilePreferences({ serverUrl: nextSession.serverUrl });
      } catch (error) {
        await clearMobileSession();

        if (!isMounted()) {
          return;
        }

        setApiInfo(undefined);
        setSession(undefined);
        setServerUrl(getInitialMobileServerUrl(preferences, storedSession.serverUrl));
        setMessage(getApiErrorMessage(error));
      }
    };

    void hydrateMobileState();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Validates the MT Photos server before login.
   */
  const handleConnect = async (): Promise<void> => {
    setLoadingAction('connect');
    setMessage('');

    try {
      const info = await fetchApiInfo(normalizedServerUrl);

      setApiInfo(info);
      setServerUrl(normalizedServerUrl);
      void mergeMobilePreferences({ serverUrl: normalizedServerUrl });
      setMessage(`已连接 ${normalizedServerUrl}`);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoadingAction(undefined);
    }
  };

  /**
   * Creates a mobile session with the shared core auth service.
   */
  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password) {
      setMessage('请输入账号和密码。');
      return;
    }

    setLoadingAction('login');
    setMessage('');

    try {
      const result = await loginWithPassword({
        otp: otp.trim() || undefined,
        password,
        serverUrl: normalizedServerUrl,
        username: username.trim(),
      });

      setApiInfo(result.apiInfo);
      setPassword('');
      const nextSession: MobileSession = {
        apiInfo: result.apiInfo,
        serverUrl: normalizedServerUrl,
        tokens: result.tokens,
        user: result.user,
      };

      setSession(nextSession);
      void writeMobileSession(nextSession);
      void mergeMobilePreferences({
        lastUsername: username.trim(),
        serverUrl: normalizedServerUrl,
      });
      setMessage('登录成功');
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoadingAction(undefined);
    }
  };

  /**
   * Clears only in-memory mobile state for the current MVP shell.
   */
  const handleLogout = (): void => {
    setSession(undefined);
    setMessage('');
    void clearMobileSession();
  };

  /**
   * Keeps refreshed auth tokens available for folder requests.
   */
  const handleChangeTokens = useCallback((tokens: AuthTokens): void => {
    setSession((current) => {
      if (!current) {
        return current;
      }

      const nextSession = { ...current, tokens };

      void writeMobileSession(nextSession);
      return nextSession;
    });
  }, []);

  /**
   * Switches the authenticated mobile workspace to a reachable configured server.
   */
  const handleApplyServerUrl = useCallback(async (nextServerUrl: string): Promise<void> => {
    if (!session) {
      return;
    }

    const normalizedUrl = normalizeServerUrl(nextServerUrl);
    const nextSession = await createMobileSessionForServer(session, normalizedUrl);

    setApiInfo(nextSession.apiInfo);
    setServerUrl(normalizedUrl);
    setSession(nextSession);
    await writeMobileSession(nextSession);
    await mergeMobilePreferences({ serverUrl: normalizedUrl });
  }, [session]);

  if (hydrating) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.bootPanel}>
            <View style={[styles.bootMark, { backgroundColor: activeThemeToken.selection, borderColor: activeThemeToken.light }]}>
              <ActivityIndicator color={activeThemeToken.hex} />
            </View>
            <Text style={[styles.bootText, { color: activeThemeToken.hex }]}>正在读取本地状态</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  const safeAreaEdges = session ? (['top', 'left', 'right'] as const) : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <SafeAreaView edges={safeAreaEdges} style={styles.safeArea}>
          <StatusBar style="dark" />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboard}
          >
            {session ? (
              <View style={styles.sessionContent}>
                <MobileWorkspace
                  initialActiveTheme={activeTheme}
                  onApplyServerUrl={handleApplyServerUrl}
                  onChangeRootTheme={setActiveTheme}
                  onChangeTokens={handleChangeTokens}
                  onLogout={handleLogout}
                  session={session}
                />
              </View>
            ) : (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
            <View style={styles.hero}>
              <View style={styles.brandRow}>
                <View
                  style={[
                    styles.brandMark,
                    { backgroundColor: activeThemeToken.selection, borderColor: activeThemeToken.light },
                  ]}
                >
                  <Text style={[styles.brandMarkText, { color: activeThemeToken.hex }]}>KW</Text>
                </View>
                <View style={styles.brandCopy}>
                  <Text style={styles.brand}>KW Photo</Text>
                  <Text style={[styles.eyebrow, { color: activeThemeToken.hex }]}>Mobile workspace</Text>
                </View>
              </View>
              <Text style={styles.title}>移动端工作区</Text>
              <Text style={styles.subtitle}>
                当前先复用共享 API 完成连接和登录，后续移动端会独立实现时间线、预览和上传体验。
              </Text>
            </View>

            <View style={styles.panel}>
              <Field
                autoCapitalize="none"
                editable={!busy}
                keyboardType="url"
                label="服务地址"
                onChangeText={setServerUrl}
                value={serverUrl}
              />
              <Pressable
                disabled={busy}
                onPress={handleConnect}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  { backgroundColor: activeThemeToken.selection, borderColor: activeThemeToken.light },
                  pressed && !busy ? styles.pressedButton : null,
                  busy ? styles.disabledButton : null,
                ]}
              >
                {loadingAction === 'connect' ? <ActivityIndicator color={activeThemeToken.hex} /> : null}
                <Text style={[styles.secondaryButtonText, { color: activeThemeToken.hex }]}>测试连接</Text>
              </Pressable>

              <View style={styles.divider} />

              <Field
                autoCapitalize="none"
                editable={!busy}
                label="账号"
                onChangeText={setUsername}
                textContentType="username"
                value={username}
              />
              <Field
                autoCapitalize="none"
                editable={!busy}
                label="密码"
                onChangeText={setPassword}
                rightAccessory={
                  <Pressable
                    accessibilityLabel={passwordVisible ? '隐藏密码' : '显示密码'}
                    disabled={busy}
                    hitSlop={8}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                    style={styles.passwordVisibilityButton}
                  >
                    <Ionicons
                      color={activeThemeToken.hex}
                      name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                    />
                  </Pressable>
                }
                secureTextEntry={!passwordVisible}
                textContentType={passwordVisible ? 'none' : 'password'}
                value={password}
              />
              <Field
                editable={!busy}
                keyboardType="number-pad"
                label="两步验证码"
                onChangeText={setOtp}
                placeholder="未开启可留空"
                value={otp}
              />
              <Pressable
                disabled={busy}
                onPress={handleLogin}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: activeThemeToken.hex },
                  pressed && !busy ? styles.pressedButton : null,
                  busy ? styles.disabledButton : null,
                ]}
              >
                {loadingAction === 'login' ? <ActivityIndicator color="#fff" /> : null}
                <Text style={styles.primaryButtonText}>登录</Text>
              </Pressable>
            </View>

            {apiInfo ? <ApiInfoCard apiInfo={apiInfo} theme={activeThemeToken} /> : null}
            {message ? (
              <Text
                style={[
                  styles.message,
                  {
                    backgroundColor: activeThemeToken.selection,
                    borderColor: activeThemeToken.light,
                    color: activeThemeToken.hex,
                  },
                ]}
              >
                {message}
              </Text>
            ) : null}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

interface FieldProps {
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable: boolean;
  keyboardType?: 'default' | 'number-pad' | 'url';
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  rightAccessory?: ReactNode;
  secureTextEntry?: boolean;
  textContentType?: 'none' | 'username' | 'password';
  value: string;
}

/**
 * Renders a mobile form field with consistent spacing and touch-friendly height.
 */
const Field = ({
  autoCapitalize,
  editable,
  keyboardType,
  label,
  onChangeText,
  placeholder,
  rightAccessory,
  secureTextEntry,
  textContentType,
  value,
}: FieldProps) => {
  const input = (
    <TextInput
      autoCapitalize={autoCapitalize}
      editable={editable}
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={MOBILE_SAGE_SLATE.subtle}
      secureTextEntry={secureTextEntry}
      style={rightAccessory ? styles.inputWithAccessoryText : styles.input}
      textContentType={textContentType}
      value={value}
    />
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {rightAccessory ? (
        <View style={styles.inputWithAccessory}>
          {input}
          {rightAccessory}
        </View>
      ) : input}
    </View>
  );
};

/**
 * Shows server metadata returned by the shared API client.
 */
const ApiInfoCard = ({ apiInfo, theme }: { apiInfo: ApiInfo; theme: typeof DEFAULT_THEME }) => {
  return (
    <View style={[styles.infoCard, { borderColor: theme.light }]}>
      <Text style={[styles.infoTitle, { color: theme.hex }]}>服务信息</Text>
      <Text style={styles.infoText}>版本：{apiInfo.version || 'unknown'}</Text>
      <Text style={styles.infoText}>构建：{apiInfo.build || '-'}</Text>
      <Text style={styles.infoText}>平台：{apiInfo.platform || '-'}</Text>
    </View>
  );
};

/**
 * Restores an authenticated session against the first reachable and token-valid server.
 */
const hydrateAuthenticatedMobileSession = async (
  storedSession: MobileSession,
  preferences: MobilePreferences,
): Promise<MobileSession> => {
  let lastError: unknown;

  for (const candidate of getMobileRuntimeServerCandidates(preferences, storedSession.serverUrl)) {
    try {
      return await createMobileSessionForServer(storedSession, candidate, { refreshFirst: true });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('无法恢复登录状态');
};

/**
 * Validates the current mobile user on another server and refreshes tokens when required.
 */
const createMobileSessionForServer = async (
  sourceSession: MobileSession,
  serverUrl: string,
  options: { refreshFirst?: boolean } = {},
): Promise<MobileSession> => {
  const normalizedServerUrl = normalizeMobileServerAddress(serverUrl);
  const apiInfo = await fetchApiInfo(normalizedServerUrl);
  const tokensRef = { current: sourceSession.tokens };

  if (options.refreshFirst) {
    tokensRef.current = await refreshAuthTokens(normalizedServerUrl, tokensRef.current);
  }

  const user = await fetchCurrentUser({
    baseUrl: normalizedServerUrl,
    getAccessToken: () => tokensRef.current.accessToken,
    onUnauthorized: async () => {
      const nextTokens = await refreshAuthTokens(normalizedServerUrl, tokensRef.current);

      tokensRef.current = nextTokens;
      return nextTokens.accessToken;
    },
  });

  return {
    ...sourceSession,
    apiInfo,
    serverUrl: normalizedServerUrl,
    tokens: tokensRef.current,
    user,
  };
};

/**
 * Picks the first saved server address without touching the network during startup.
 */
const getInitialMobileServerUrl = (preferences: MobilePreferences, fallbackUrl?: string): string => {
  return getMobileRuntimeServerCandidates(preferences, fallbackUrl)[0] ?? DEFAULT_MOBILE_SERVER_URL;
};

/**
 * Normalizes server input into an absolute URL accepted by the API client.
 */
const normalizeServerUrl = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return DEFAULT_MOBILE_SERVER_URL;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, '');
  }

  return `https://${trimmed.replace(/\/+$/, '')}`;
};

const styles = StyleSheet.create({
  apiInfoRow: {
    color: MOBILE_SAGE_SLATE.muted,
  },
  bootPanel: {
    alignItems: 'center',
    flex: 1,
    gap: 11,
    justifyContent: 'center',
  },
  bootMark: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  bootText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  brand: {
    color: MOBILE_SAGE_SLATE.title,
    fontSize: 15,
    fontWeight: '900',
  },
  brandCopy: {
    gap: 2,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: DEFAULT_THEME.selection,
    borderColor: DEFAULT_THEME.light,
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  brandMarkText: {
    color: DEFAULT_THEME.hex,
    fontSize: 13,
    fontWeight: '900',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  disabledButton: {
    opacity: 0.5,
  },
  divider: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.borderSoft,
    height: 1,
    marginVertical: 4,
  },
  eyebrow: {
    color: DEFAULT_THEME.hex,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  field: {
    gap: 7,
  },
  hero: {
    gap: 12,
    paddingTop: 10,
  },
  infoCard: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    padding: 13,
  },
  infoText: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  infoTitle: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  inputWithAccessory: {
    alignItems: 'center',
    backgroundColor: MOBILE_SAGE_NEUTRALS.panelAlt,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  inputWithAccessoryText: {
    color: MOBILE_SAGE_SLATE.strong,
    flex: 1,
    fontSize: 16,
    minHeight: 44,
    paddingVertical: 0,
  },
  keyboard: {
    flex: 1,
  },
  label: {
    color: MOBILE_SAGE_SLATE.body,
    fontSize: 12,
    fontWeight: '900',
  },
  message: {
    color: DEFAULT_THEME.hex,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    textAlign: 'center',
  },
  panel: {
    ...MOBILE_SAGE_SHADOWS.panel,
    backgroundColor: MOBILE_SAGE_NEUTRALS.panel,
    borderColor: MOBILE_SAGE_NEUTRALS.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  passwordVisibilityButton: {
    alignItems: 'center',
    borderRadius: 17,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  pressedButton: {
    transform: [{ translateY: 1 }],
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: DEFAULT_THEME.hex,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  safeArea: {
    backgroundColor: MOBILE_SAGE_NEUTRALS.pageBg,
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  sessionContent: {
    flex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: DEFAULT_THEME.selection,
    borderColor: DEFAULT_THEME.light,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: DEFAULT_THEME.hex,
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    color: MOBILE_SAGE_SLATE.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  title: {
    color: MOBILE_SAGE_SLATE.strong,
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 37,
  },
});
