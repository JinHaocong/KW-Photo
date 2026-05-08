import { Database, HardDrive, Server, ShieldCheck, UploadCloud, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  formatCacheSize,
  readLocalCacheStats,
  readLocalCacheStorageInfo,
  subscribeLocalCacheChanges,
} from '../../shared/local-cache';
import type { LocalCacheStats, LocalCacheStorageInfo } from '../../shared/local-cache';
import type { ApiInfo, AuthTokens, CurrentUser, UploadTask } from '../../shared/types';
import type { AdminTab } from './admin-types';
import { getJwtExpiryLabel, getRuntimeLabel, getUploadTaskStats } from './admin-utils';

interface AdminOverviewPanelProps {
  apiInfo?: ApiInfo;
  cacheEnabled: boolean;
  onOpenTab: (tab: AdminTab) => void;
  serverUrl: string;
  tokens?: AuthTokens;
  uploadTasks: UploadTask[];
  user?: CurrentUser;
}

const EMPTY_CACHE_STATS: LocalCacheStats = {
  coverCount: 0,
  directoryCount: 0,
  hdThumbnailCount: 0,
  mediaCount: 0,
  originalImageCount: 0,
  originalVideoCount: 0,
  thumbnailCount: 0,
  totalCount: 0,
  totalSize: 0,
  unusedCount: 0,
  unusedSize: 0,
  usefulCount: 0,
  usefulSize: 0,
  videoPosterCount: 0,
};

/**
 * Renders the admin landing dashboard from currently available real app state.
 */
export const AdminOverviewPanel = ({
  apiInfo,
  cacheEnabled,
  onOpenTab,
  serverUrl,
  tokens,
  uploadTasks,
  user,
}: AdminOverviewPanelProps) => {
  const [cacheStats, setCacheStats] = useState<LocalCacheStats>(EMPTY_CACHE_STATS);
  const [storageInfo, setStorageInfo] = useState<LocalCacheStorageInfo>();
  const uploadStats = useMemo(() => getUploadTaskStats(uploadTasks), [uploadTasks]);

  const refreshCacheSummary = useCallback(async (): Promise<void> => {
    setCacheStats(await readLocalCacheStats().catch(() => EMPTY_CACHE_STATS));
    setStorageInfo(await readLocalCacheStorageInfo());
  }, []);

  useEffect(() => {
    void refreshCacheSummary();

    return subscribeLocalCacheChanges(() => {
      void refreshCacheSummary();
    });
  }, [refreshCacheSummary]);

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div>
          <h3>管理总览</h3>
          <p>当前服务、账号、缓存和本机任务的即时状态。</p>
        </div>
        <button className="secondary-btn" onClick={() => void refreshCacheSummary()} type="button">
          刷新总览
        </button>
      </div>

      <div className="admin-card-grid">
        <article className="admin-metric-card">
          <Server size={18} />
          <span>服务端</span>
          <strong title={serverUrl}>{getServerHost(serverUrl)}</strong>
          <em>
            API {apiInfo?.version ?? 'unknown'}
            {apiInfo?.build ? ` #${apiInfo.build}` : ''}
          </em>
        </article>
        <article className="admin-metric-card">
          <Users size={18} />
          <span>当前用户</span>
          <strong>{user?.username ?? '-'}</strong>
          <em>{user?.isAdmin ? '管理员' : '普通用户'}</em>
        </article>
        <article className="admin-metric-card">
          <UploadCloud size={18} />
          <span>本机上传队列</span>
          <strong>{uploadStats.active}</strong>
          <em>{uploadStats.failed} 个失败，{uploadStats.done} 个已完成</em>
        </article>
        <article className="admin-metric-card">
          <Database size={18} />
          <span>已缓存媒体</span>
          <strong>{cacheStats.mediaCount}</strong>
          <em>{cacheStats.usefulCount} 项可用，{formatCacheSize(cacheStats.totalSize)}</em>
        </article>
        <article className="admin-metric-card">
          <HardDrive size={18} />
          <span>缓存后端</span>
          <strong>{storageInfo?.label ?? '-'}</strong>
          <em>{cacheEnabled ? '已开启' : '已关闭'}</em>
        </article>
        <article className="admin-metric-card">
          <ShieldCheck size={18} />
          <span>访问令牌</span>
          <strong>{tokens?.accessToken ? '有效会话' : '无令牌'}</strong>
          <em>过期时间：{getJwtExpiryLabel(tokens?.accessToken)}</em>
        </article>
      </div>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>下一步维护入口</strong>
          <span>{getRuntimeLabel()} · {storageInfo?.description ?? '正在读取缓存后端'}</span>
        </div>
        <div className="admin-action-list">
          <button className="secondary-btn" onClick={() => onOpenTab('gallery')} type="button">
            图库扫描与维护
          </button>
          <button className="secondary-btn" onClick={() => onOpenTab('tasks')} type="button">
            查看后台任务
          </button>
          <button className="secondary-btn" onClick={() => onOpenTab('users')} type="button">
            用户与权限
          </button>
          <button className="secondary-btn" onClick={() => onOpenTab('cache')} type="button">
            管理本地缓存
          </button>
          <button className="secondary-btn" onClick={() => onOpenTab('system')} type="button">
            系统与授权
          </button>
        </div>
      </section>
    </div>
  );
};

const getServerHost = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl || '-';
  }
};
