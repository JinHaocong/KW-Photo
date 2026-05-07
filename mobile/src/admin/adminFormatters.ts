/**
 * Converts admin diagnostics values into React Native text-safe strings.
 */
export const formatAdminInfoValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(formatAdminInfoValue).join(' · ') : '-';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined && item !== null && item !== '');

    return entries.length > 0
      ? entries.map(([key, item]) => `${formatAdminInfoKey(key)}: ${formatAdminInfoValue(item)}`).join(' · ')
      : '-';
  }

  return String(value);
};

export const formatAdminInfoKey = (key: string): string => {
  return key.replace(/[_-]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
};

export const getServerHost = (serverUrl: string): string => {
  try {
    return new URL(serverUrl).host;
  } catch {
    return serverUrl || '-';
  }
};

export const formatAdminDateTime = (value?: number | string): string => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

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
 * Formats gallery counters so dense mobile cards stay readable with large totals.
 */
export const formatAdminCount = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return new Intl.NumberFormat('zh-CN').format(value);
};

export const formatFileSize = (size: number): string => {
  if (!Number.isFinite(size) || size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

export const normalizeFileType = (value: string): string => {
  const fileType = value.trim();

  if (!fileType) {
    return '';
  }

  return fileType.startsWith('.') ? fileType.toUpperCase() : `.${fileType.toUpperCase()}`;
};

export const getParentPath = (path: string): string => {
  const parentPath = path.split(/[\\/]/).filter(Boolean).slice(0, -1).join('/');

  return path.startsWith('/') && parentPath ? `/${parentPath}` : parentPath;
};

export const getFolderName = (path: string): string => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
};

export const toggleListValue = (values: string[], value: string): string[] => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};
