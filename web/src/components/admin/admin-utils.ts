import type { UploadTask } from '../../shared/types';
import { isElectronRuntime } from '../../platform/desktop-bridge';

export interface UploadTaskStats {
  active: number;
  done: number;
  failed: number;
  total: number;
}

/**
 * Formats timestamps returned by different MT Photos endpoints.
 */
export const formatAdminDateTime = (value?: number | string): string => {
  if (value === undefined || value === '') {
    return '-';
  }

  const timestamp = typeof value === 'number' ? value : Number(value);
  const date = Number.isFinite(timestamp)
    ? new Date(timestamp > 10_000_000_000 ? timestamp : timestamp * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Counts upload queue states for the management-center task overview.
 */
export const getUploadTaskStats = (tasks: UploadTask[]): UploadTaskStats => {
  return tasks.reduce<UploadTaskStats>(
    (stats, task) => {
      stats.total += 1;

      if (task.state === 'failed') {
        stats.failed += 1;
      } else if (task.state === 'done' || task.state === 'skipped') {
        stats.done += 1;
      } else {
        stats.active += 1;
      }

      return stats;
    },
    { active: 0, done: 0, failed: 0, total: 0 },
  );
};

/**
 * Returns a compact label for the current runtime shell.
 */
export const getRuntimeLabel = (): string => {
  if (isElectronRuntime()) {
    return 'Electron App';
  }

  return 'Web 浏览器';
};

/**
 * Decodes JWT expiry without trusting it for security decisions.
 */
export const getJwtExpiryLabel = (accessToken?: string): string => {
  if (!accessToken) {
    return '-';
  }

  try {
    const payloadSegment = accessToken.split('.')[1] ?? '';
    const normalizedSegment = payloadSegment
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payloadSegment.length / 4) * 4, '=');
    const payload = JSON.parse(window.atob(normalizedSegment)) as { exp?: number };

    return payload.exp ? formatAdminDateTime(payload.exp) : '-';
  } catch {
    return '-';
  }
};
