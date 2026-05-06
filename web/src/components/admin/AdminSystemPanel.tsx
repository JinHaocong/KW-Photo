import { Clipboard, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAdminLicenseInfo,
  fetchAdminSystemStatus,
} from '../../services/admin-service';
import type { AdminInfoItem } from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { readLocalCacheStorageInfo } from '../../shared/local-cache';
import type { LocalCacheStorageInfo } from '../../shared/local-cache';
import type { ApiInfo, CurrentUser } from '../../shared/types';
import { getRuntimeLabel } from './admin-utils';

interface AdminSystemPanelProps {
  apiInfo?: ApiInfo;
  apiOptions: ApiClientOptions;
  onShowToast: (message: string) => void;
  serverUrl: string;
  user?: CurrentUser;
}

/**
 * Shows runtime diagnostics, server status and license information.
 */
export const AdminSystemPanel = ({
  apiInfo,
  apiOptions,
  onShowToast,
  serverUrl,
  user,
}: AdminSystemPanelProps) => {
  const [error, setError] = useState('');
  const [licenseItems, setLicenseItems] = useState<AdminInfoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusItems, setStatusItems] = useState<AdminInfoItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<LocalCacheStorageInfo>();
  const diagnostics = useMemo(
    () => ({
      apiInfo,
      cacheBackend: storageInfo,
      language: navigator.language,
      online: navigator.onLine,
      platform: navigator.platform,
      runtime: getRuntimeLabel(),
      serverUrl,
      user: user
        ? {
            id: user.id,
            isAdmin: user.isAdmin,
            username: user.username,
          }
        : undefined,
      userAgent: navigator.userAgent,
    }),
    [apiInfo, serverUrl, storageInfo, user],
  );

  const loadSystemInfo = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const [nextStorageInfo, nextStatusItems, nextLicenseItems] = await Promise.all([
        readLocalCacheStorageInfo(),
        fetchAdminSystemStatus(apiOptions).catch(() => []),
        fetchAdminLicenseInfo(apiOptions).catch(() => []),
      ]);

      setStorageInfo(nextStorageInfo);
      setStatusItems(nextStatusItems);
      setLicenseItems(nextLicenseItems);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    void loadSystemInfo();
  }, [loadSystemInfo]);

  /**
   * Copies compact diagnostics to the clipboard for troubleshooting.
   */
  const handleCopyDiagnostics = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
      onShowToast('诊断信息已复制');
    } catch {
      onShowToast('复制失败，当前环境不允许访问剪贴板');
    }
  };

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div>
          <h3>系统状态</h3>
          <p>服务版本、运行环境、授权状态和本地缓存落点。</p>
        </div>
        <div className="admin-inline-actions">
          <button className="secondary-btn" onClick={() => void handleCopyDiagnostics()} type="button">
            <Clipboard size={15} />
            复制诊断
          </button>
          <button className="secondary-btn" disabled={loading} onClick={() => void loadSystemInfo()} type="button">
            <RefreshCw size={15} />
            刷新
          </button>
        </div>
      </div>

      {error ? <div className="admin-error">{error}</div> : null}

      <div className="admin-info-grid">
        <InfoItem label="服务地址" value={serverUrl} />
        <InfoItem label="API 版本" value={`${apiInfo?.version ?? 'unknown'}${apiInfo?.build ? ` #${apiInfo.build}` : ''}`} />
        <InfoItem label="运行环境" value={getRuntimeLabel()} />
        <InfoItem label="在线状态" value={navigator.onLine ? '在线' : '离线'} />
        <InfoItem label="当前用户" value={user?.username ?? '-'} />
        <InfoItem label="缓存后端" value={storageInfo?.label ?? '-'} />
        <InfoItem label="缓存目录" value={storageInfo?.rootPath ?? storageInfo?.description ?? '-'} wide />
        <InfoItem label="索引文件" value={storageInfo?.indexPath ?? '-'} wide />
      </div>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>服务端状态</strong>
          <span>{loading ? '正在刷新' : `${statusItems.length} 项`}</span>
        </div>
        <InfoList emptyText="当前服务没有返回系统状态，或接口暂不可用。" items={statusItems} />
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>授权信息</strong>
          <span>{licenseItems.length} 项</span>
        </div>
        <InfoList emptyText="当前服务没有返回授权信息。" items={licenseItems} />
      </section>
    </div>
  );
};

const InfoItem = ({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) => (
  <article className={wide ? 'admin-info-item is-wide' : 'admin-info-item'}>
    <span>{label}</span>
    <strong title={value}>{value}</strong>
  </article>
);

const InfoList = ({ emptyText, items }: { emptyText: string; items: AdminInfoItem[] }) => {
  if (items.length === 0) {
    return <div className="admin-state compact">{emptyText}</div>;
  }

  return (
    <div className="admin-info-list">
      {items.map((item) => (
        <InfoItem key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
};
