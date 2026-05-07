import { BarChart3, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAdminGalleryStatsOverview,
  updateAdminGalleryAutoScanSkipIds,
} from '../../services/admin-service';
import type {
  AdminGallery,
  AdminGalleryStat,
  AdminGalleryStatsOverview,
  AdminGalleryStatRow,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { Modal } from '../Modal';

interface AdminGalleryStatsDialogProps {
  apiOptions: ApiClientOptions;
  galleries: AdminGallery[];
  open: boolean;
  onClose: () => void;
  onShowToast: (message: string) => void;
  onStatsLoaded: (stat: AdminGalleryStat) => void;
}

/**
 * Shows gallery statistics and the same automatic-scan toggles used by MT Photos.
 */
export const AdminGalleryStatsDialog = ({
  apiOptions,
  galleries,
  open,
  onClose,
  onShowToast,
  onStatsLoaded,
}: AdminGalleryStatsDialogProps) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<AdminGalleryStatsOverview>();
  const [updatingGalleryId, setUpdatingGalleryId] = useState<number>();
  const disabledAutoScanCount = useMemo(() => {
    return overview?.rows.filter((row) => !row.autoScan).length ?? 0;
  }, [overview]);

  const loadStats = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const nextOverview = await fetchAdminGalleryStatsOverview(apiOptions, galleries);

      setOverview(nextOverview);
      onStatsLoaded(nextOverview.all);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions, galleries, onStatsLoaded]);

  useEffect(() => {
    if (open) {
      void loadStats();
    }
  }, [loadStats, open]);

  /**
   * Updates the skip-auto-scan system config immediately, matching the demo behavior.
   */
  const handleToggleAutoScan = async (row: AdminGalleryStatRow): Promise<void> => {
    if (!overview) {
      return;
    }

    const galleryId = Number(row.galleryId);

    if (!Number.isFinite(galleryId)) {
      onShowToast('当前图库没有可用 ID，无法设置自动扫描');
      return;
    }

    const previousOverview = overview;
    const nextAutoScan = !row.autoScan;
    const nextSkipIds = nextAutoScan
      ? overview.autoScanSkipIds.filter((id) => id !== galleryId)
      : Array.from(new Set([...overview.autoScanSkipIds, galleryId]));

    setUpdatingGalleryId(galleryId);
    setOverview({
      ...overview,
      autoScanSkipIds: nextSkipIds,
      rows: overview.rows.map((item) => (
        Number(item.galleryId) === galleryId ? { ...item, autoScan: nextAutoScan } : item
      )),
    });

    try {
      await updateAdminGalleryAutoScanSkipIds(apiOptions, nextSkipIds);
      onShowToast(`${row.name} 已${nextAutoScan ? '开启' : '关闭'}自动扫描`);
    } catch (requestError) {
      setOverview(previousOverview);
      setError(getApiErrorMessage(requestError));
    } finally {
      setUpdatingGalleryId(undefined);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      className="gallery-editor-dialog gallery-stats-dialog"
      onClose={onClose}
      open={true}
      title={
        <div className="gallery-editor-dialog__header">
          <div>
            <h3>图库信息统计&自动扫描</h3>
            <p>全部图库统计会去重同一文件夹；自动扫描开关保存到服务端系统配置。</p>
          </div>
          <button aria-label="关闭图库信息统计" className="icon-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
      }
    >

        <div className="gallery-stats-toolbar">
          <div>
            <BarChart3 size={16} />
            <span>{loading ? '正在读取图库统计' : `${overview?.rows.length ?? galleries.length} 个图库`}</span>
          </div>
          <button className="secondary-btn" disabled={loading} onClick={() => void loadStats()} type="button">
            <RefreshCw size={15} />
            刷新
          </button>
        </div>

        {error ? <div className="admin-error compact">{error}</div> : null}

        <section className="gallery-stats-hero">
          <div className="gallery-stats-hero__copy">
            <span>全部图库</span>
            <strong>{overview ? formatBytes(overview.all.totalSize) : '-'}</strong>
            <small>同一文件夹只计入一次，视频数量不含动态照片视频部分。</small>
          </div>
          <div className="gallery-stats-total">
            <StatPill label="照片数量" value={overview?.all.photo ?? 0} />
            <StatPill label="视频数量" value={overview?.all.video ?? 0} />
            <StatPill label="跳过自动扫描" value={disabledAutoScanCount} />
          </div>
        </section>

        <div className="gallery-stats-table">
          <div className="gallery-stats-head">
            <div className="gallery-stats-row is-head">
              <span>图库</span>
              <span>照片</span>
              <span>视频</span>
              <span>占用空间</span>
              <span>自动扫描</span>
            </div>
          </div>

          {loading ? <div className="admin-state compact">正在读取每个图库的统计...</div> : null}
          {!loading && overview?.rows.length === 0 ? <div className="admin-state compact">暂无图库统计。</div> : null}

          {overview?.rows.map((row) => (
            <div className="gallery-stats-row" key={String(row.galleryId)}>
              <div className="gallery-stats-name">
                <strong>{row.name}</strong>
                <small title={row.path}>
                  {row.gallery.hidden ? '隐藏图库 · ' : ''}
                  {row.path}
                </small>
                {row.statError ? <em>{row.statError}</em> : null}
              </div>
              <StatCell label="照片" value={formatCount(row.photo)} />
              <StatCell label="视频" value={formatCount(row.video)} />
              <StatCell label="空间" value={formatBytes(row.totalSize)} />
              <label
                aria-label={`${row.name} 自动扫描${row.autoScan ? '已开启' : '已跳过'}`}
                className={row.autoScan ? 'gallery-auto-scan-toggle is-on' : 'gallery-auto-scan-toggle'}
              >
                <input
                  checked={row.autoScan}
                  disabled={updatingGalleryId === Number(row.galleryId)}
                  onChange={() => void handleToggleAutoScan(row)}
                  type="checkbox"
                />
                <i aria-hidden="true" />
                <span>{row.autoScan ? '开启' : '跳过'}</span>
              </label>
            </div>
          ))}
        </div>
    </Modal>
  );
};

/**
 * Renders a compact total metric in the statistics hero.
 */
const StatPill = ({ label, value }: { label: string; value: number }) => (
  <div>
    <span>{label}</span>
    <strong>{formatCount(value)}</strong>
  </div>
);

/**
 * Renders one per-gallery metric with an inline label so each row is self-explanatory.
 */
const StatCell = ({ label, value }: { label: string; value: string }) => (
  <span className="gallery-stats-cell" data-label={label}>
    <small>{label}</small>
    <strong>{value}</strong>
  </span>
);

/**
 * Formats integer counts for large gallery totals without changing the underlying value.
 */
const formatCount = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat('zh-CN').format(value);
};

/**
 * Formats byte counts with a compact unit for gallery statistics.
 */
const formatBytes = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};
