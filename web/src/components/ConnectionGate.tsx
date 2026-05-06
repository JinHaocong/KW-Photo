import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DatabaseZap, Eye, EyeOff, MonitorCog, Server, ShieldCheck } from 'lucide-react';

import { getPlatformLabel, readDesktopRuntimeInfo } from '../platform/runtime';
import type { DesktopRuntimeInfo } from '../platform/desktop-bridge';
import type { ApiInfo, SessionStatus } from '../shared/types';
import { readLoginPreferences, writeLoginPreferences } from '../shared/workspace-preferences';

interface ConnectionGateProps {
  apiInfo?: ApiInfo;
  defaultServerUrl: string;
  error?: string;
  status: SessionStatus;
  onConnect: (serverUrl: string) => Promise<void>;
  onLogin: (params: { serverUrl: string; username: string; password: string; otp?: string }) => Promise<void>;
}

/**
 * Renders the pre-auth connection and login experience.
 */
export const ConnectionGate = ({
  apiInfo,
  defaultServerUrl,
  error,
  status,
  onConnect,
  onLogin,
}: ConnectionGateProps) => {
  const initialLoginPreferences = useMemo(() => readLoginPreferences(), []);
  const [serverUrl, setServerUrl] = useState(initialLoginPreferences.serverUrl || defaultServerUrl);
  const [username, setUsername] = useState(initialLoginPreferences.username);
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otp, setOtp] = useState('');
  const [desktopRuntimeInfo, setDesktopRuntimeInfo] = useState<DesktopRuntimeInfo>();
  const checking = status === 'checking';
  const canLogin = Boolean(apiInfo && username && password && !checking);
  const runtimeLabel = useMemo(() => getPlatformLabel(), []);

  useEffect(() => {
    if (!serverUrl || serverUrl === 'https://demo.mtmt.tech') {
      setServerUrl(defaultServerUrl);
    }
  }, [defaultServerUrl, serverUrl]);

  useEffect(() => {
    writeLoginPreferences({ serverUrl, username });
  }, [serverUrl, username]);

  useEffect(() => {
    let mounted = true;

    void readDesktopRuntimeInfo().then((info) => {
      if (mounted) {
        setDesktopRuntimeInfo(info);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Submits the login form after a server capability check.
   */
  const handleLogin = async (): Promise<void> => {
    if (!canLogin) {
      return;
    }

    writeLoginPreferences({ serverUrl, username });
    await onLogin({ serverUrl, username, password, otp: otp || undefined });
  };

  return (
    <main className="connection-page">
      <section className="connection-hero">
        <div className="brand-mark connection-brand">KW</div>
        <span className="connection-eyebrow">KW Photo · {runtimeLabel}</span>
        <h1>连接工作区</h1>
        <p>服务端验证通过后进入图库，Web 和桌面端共用同一套工作台。</p>
        <div className="connection-runtime-grid">
          <RuntimeChip icon={<MonitorCog size={16} />} label={runtimeLabel} value={formatRuntimeVersion(desktopRuntimeInfo)} />
          <RuntimeChip icon={<DatabaseZap size={16} />} label="缓存后端" value={desktopRuntimeInfo ? 'App Data' : 'IndexedDB'} />
          <RuntimeChip icon={<ShieldCheck size={16} />} label="Bridge" value={desktopRuntimeInfo ? 'Preload' : 'Browser'} />
        </div>
      </section>

      <section className="connection-card" aria-label="服务端连接">
        <div className="connection-card__header">
          <span className="connection-card__icon">
            <Server size={18} />
          </span>
          <div>
            <h2>服务端</h2>
            <p>{apiInfo ? '服务端可用' : '等待连接检测'}</p>
          </div>
        </div>

        <label>
          服务端地址
          <input
            autoComplete="url"
            onChange={(event) => setServerUrl(event.target.value)}
            placeholder="https://d.mtmt.tech"
            value={serverUrl}
          />
        </label>

        <div className="connection-actions">
          <button className="secondary-btn" disabled={checking} onClick={() => onConnect(serverUrl)} type="button">
            {checking ? '检测中' : '检测服务端'}
          </button>
        </div>

        {apiInfo ? (
          <div className="connection-result">
            <strong>已检测到 MT Photos API</strong>
            <span>
              {apiInfo.version}
              {apiInfo.build ? ` #${apiInfo.build}` : ''} · {apiInfo.platform ?? 'unknown'}
            </span>
          </div>
        ) : null}

        <div className="form-grid">
          <label>
            用户名
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="输入 MT Photos 用户名"
              value={username}
            />
          </label>
          <label>
            密码
            <div className="password-input">
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="输入密码"
                type={passwordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={passwordVisible ? '隐藏密码' : '显示密码'}
                onClick={() => setPasswordVisible((current) => !current)}
                type="button"
              >
                {passwordVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label>
            两步验证码，可选
            <input
              inputMode="numeric"
              onChange={(event) => setOtp(event.target.value)}
              placeholder="启用 2FA 时填写"
              value={otp}
            />
          </label>
        </div>

        {error ? <div className="connection-error">{error}</div> : null}

        <button className="primary-btn connection-submit" disabled={!canLogin} onClick={handleLogin} type="button">
          {checking ? '登录中' : '登录并进入工作台'}
        </button>
      </section>
    </main>
  );
};

interface RuntimeChipProps {
  icon: ReactNode;
  label: string;
  value: string;
}

/**
 * Renders one compact runtime fact in the login hero.
 */
const RuntimeChip = ({ icon, label, value }: RuntimeChipProps) => {
  return (
    <div className="connection-runtime-chip">
      <span>{icon}</span>
      <div>
        <strong>{label}</strong>
        <em>{value}</em>
      </div>
    </div>
  );
};

/**
 * Formats detailed Electron version when the app is hosted by the desktop shell.
 */
const formatRuntimeVersion = (info?: DesktopRuntimeInfo): string => {
  if (!info?.versions.electron) {
    return 'Browser';
  }

  return `Electron ${info.versions.electron}`;
};
