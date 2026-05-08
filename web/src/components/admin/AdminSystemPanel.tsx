import {
  Activity,
  Clipboard,
  Database,
  FileText,
  Globe2,
  HardDriveDownload,
  KeyRound,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wrench,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import {
  ADMIN_SYSTEM_CONFIG_KEYS,
  bindAdminLicense,
  clearAdminSystemLogs,
  createAdminDatabaseBackup,
  fetchAdminDatabaseReindexInfo,
  fetchAdminLibheifVersions,
  fetchAdminLicenseInfo,
  fetchAdminOfflineId,
  fetchAdminSystemConfigInfo,
  fetchAdminSystemConfigs,
  fetchAdminSystemLogs,
  fetchAdminSystemStatus,
  prepareAdminClipTable,
  prepareAdminFaceRegV2Table,
  rebuildAdminDatabaseIndex,
  rebuildAdminDatabaseTimezoneIndex,
  reloadAdminServer,
  runAdminManualUpgrade,
  switchAdminFaceRegV2,
  updateAdminSystemConfig,
  verifyAdminLicenseOnline,
} from '../../services/admin-service';
import type {
  AdminDatabaseReindexInfo,
  AdminInfoItem,
  AdminLogRecord,
  AdminSystemConfigInfo,
  AdminSystemConfigRecord,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { readLocalCacheStorageInfo } from '../../shared/local-cache';
import type { LocalCacheStorageInfo } from '../../shared/local-cache';
import type { ApiInfo, CurrentUser } from '../../shared/types';
import { Modal } from '../Modal';
import { AdminGalleryScanSettingsDialog } from './AdminGalleryScanSettingsDialog';
import { formatAdminDateTime, getRuntimeLabel } from './admin-utils';

interface AdminSystemPanelProps {
  apiInfo?: ApiInfo;
  apiOptions: ApiClientOptions;
  onShowToast: (message: string) => void;
  serverUrl: string;
  user?: CurrentUser;
}

interface SystemConfigCardDefinition {
  description: string;
  icon: LucideIcon;
  key: string;
  switchable?: boolean;
  title: string;
}

interface SystemConfigGroupDefinition {
  description: string;
  items: SystemConfigCardDefinition[];
  title: string;
}

const SYSTEM_LANGUAGE_OPTIONS = [
  { label: '简体中文', value: 'zh-CN' },
  { label: '繁体中文', value: 'zh-TW' },
  { label: 'English', value: 'en' },
] as const;

const SYSTEM_CONFIG_GROUPS: SystemConfigGroupDefinition[] = [
  {
    description: '为 GPS 坐标反查、地点相册和地图服务准备 API 配置。',
    items: [
      {
        description: '配置腾讯/高德/Mapbox/MapTiler 等位置服务，供 GPS 信息识别使用。',
        icon: Globe2,
        key: ADMIN_SYSTEM_CONFIG_KEYS.gpsApi,
        title: 'GPS信息识别',
      },
    ],
    title: 'GPS信息识别',
  },
  {
    description: '控制人物相册的人脸检测、特征提取和比对数据准备。',
    items: [
      {
        description: '配置人脸识别 API，用于照片中的人物识别。',
        icon: ShieldCheck,
        key: ADMIN_SYSTEM_CONFIG_KEYS.faceApi,
        title: '人脸识别 API',
      },
      {
        description: '人脸识别 V2 特征服务配置，切换前需确认数据库表已准备。',
        icon: Activity,
        key: ADMIN_SYSTEM_CONFIG_KEYS.faceRegApi,
        title: '人脸识别 V2',
      },
    ],
    title: '人脸识别',
  },
  {
    description: '控制文本识别、场景识别、CLIP 搜索和相似照片检测。',
    items: [
      {
        description: '配置 OCR 服务，用于照片文字识别。',
        icon: FileText,
        key: ADMIN_SYSTEM_CONFIG_KEYS.ocrApi,
        title: '文本识别 OCR',
      },
      {
        description: '配置场景分类服务，用于事物/场景自动分类。',
        icon: Sparkles,
        key: ADMIN_SYSTEM_CONFIG_KEYS.classifyApi,
        title: '场景识别',
      },
      {
        description: '配置 CLIP 服务，用于自然语言搜索和向量检索。',
        icon: Sparkles,
        key: ADMIN_SYSTEM_CONFIG_KEYS.similarFiles,
        title: '相似照片识别',
      },
    ],
    title: '智能识别',
  },
  {
    description: '视频和高清预览图相关后台能力。',
    items: [
      {
        description: '控制视频转码任务和播放代理文件生成。',
        icon: UploadCloud,
        key: ADMIN_SYSTEM_CONFIG_KEYS.transcode,
        switchable: true,
        title: '视频转码',
      },
      {
        description: '视频转码文件存放路径配置。',
        icon: Database,
        key: ADMIN_SYSTEM_CONFIG_KEYS.transcodeFolderPath,
        title: '视频转码目录',
      },
      {
        description: '控制照片高清预览图生成能力。',
        icon: HardDriveDownload,
        key: ADMIN_SYSTEM_CONFIG_KEYS.hdThumb,
        switchable: true,
        title: '高清预览图',
      },
      {
        description: '高清预览图文件存放路径配置。',
        icon: Database,
        key: ADMIN_SYSTEM_CONFIG_KEYS.hdThumbFolderPath,
        title: '高清预览图目录',
      },
    ],
    title: '媒体处理',
  },
  {
    description: 'Web 功能开关与用户可见能力。',
    items: [
      {
        description: '控制“那年今日”入口与往年照片能力。',
        icon: Activity,
        key: ADMIN_SYSTEM_CONFIG_KEYS.showMemory,
        switchable: true,
        title: '那年今日',
      },
      {
        description: '多用户模式下，管理员查看全部用户回收站文件。',
        icon: ShieldCheck,
        key: ADMIN_SYSTEM_CONFIG_KEYS.trashShareInUsers,
        switchable: true,
        title: '回收站-多用户模式',
      },
      {
        description: '数据库自动备份配置。',
        icon: Database,
        key: ADMIN_SYSTEM_CONFIG_KEYS.pgAutoBackup,
        switchable: true,
        title: '数据库自动备份',
      },
    ],
    title: '功能开关',
  },
];

/**
 * Shows demo-aligned system configuration, maintenance APIs that belong outside tasks, and diagnostics.
 */
export const AdminSystemPanel = ({
  apiInfo,
  apiOptions,
  onShowToast,
  serverUrl,
  user,
}: AdminSystemPanelProps) => {
  const [backupPath, setBackupPath] = useState('');
  const [configInfo, setConfigInfo] = useState<AdminSystemConfigInfo>();
  const [configs, setConfigs] = useState<AdminSystemConfigRecord[]>([]);
  const [databaseInfo, setDatabaseInfo] = useState<AdminDatabaseReindexInfo>();
  const [editingConfig, setEditingConfig] = useState<SystemConfigCardDefinition>();
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');
  const [libheifItems, setLibheifItems] = useState<AdminInfoItem[]>([]);
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseItems, setLicenseItems] = useState<AdminInfoItem[]>([]);
  const [licenseMode, setLicenseMode] = useState<'offline' | 'online'>('online');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AdminLogRecord[]>([]);
  const [offlineId, setOfflineId] = useState('');
  const [scanSettingsOpen, setScanSettingsOpen] = useState(false);
  const [statusItems, setStatusItems] = useState<AdminInfoItem[]>([]);
  const [storageInfo, setStorageInfo] = useState<LocalCacheStorageInfo>();
  const [submittingAction, setSubmittingAction] = useState('');
  const configMap = useMemo(() => new Map(configs.map((config) => [config.key, config.value])), [configs]);
  const currentLanguage = normalizeLanguageValue(configMap.get(ADMIN_SYSTEM_CONFIG_KEYS.systemLanguage));
  const diagnostics = useMemo(
    () => ({
      apiInfo,
      cacheBackend: storageInfo,
      configInfo,
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
    [apiInfo, configInfo, serverUrl, storageInfo, user],
  );

  const loadSystemInfo = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      const [
        nextStorageInfo,
        statusResult,
        licenseResult,
        configResult,
        configInfoResult,
        logsResult,
        databaseResult,
        libheifResult,
      ] = await Promise.all([
        readLocalCacheStorageInfo(),
        fetchAdminSystemStatus(apiOptions).catch(() => []),
        fetchAdminLicenseInfo(apiOptions).catch(() => []),
        fetchAdminSystemConfigs(apiOptions).catch(() => []),
        fetchAdminSystemConfigInfo(apiOptions).catch(() => undefined),
        fetchAdminSystemLogs(apiOptions).catch(() => []),
        fetchAdminDatabaseReindexInfo(apiOptions).catch(() => undefined),
        fetchAdminLibheifVersions(apiOptions).catch(() => []),
      ]);

      setStorageInfo(nextStorageInfo);
      setStatusItems(statusResult);
      setLicenseItems(licenseResult);
      setConfigs(configResult);
      setConfigInfo(configInfoResult);
      setLogs(logsResult);
      setDatabaseInfo(databaseResult);
      setLibheifItems(libheifResult);
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

  /**
   * Wraps one system action and keeps button loading state scoped.
   */
  const runSystemAction = async (key: string, action: () => Promise<string | undefined>): Promise<void> => {
    setSubmittingAction(key);
    setError('');

    try {
      const message = await action();

      if (message) {
        onShowToast(message);
      }
    } catch (actionError) {
      onShowToast(getApiErrorMessage(actionError));
    } finally {
      setSubmittingAction('');
    }
  };

  /**
   * Persists one system-config value and updates the local list optimistically.
   */
  const handleUpdateConfig = async (key: string, value: string, message: string): Promise<void> => {
    await updateAdminSystemConfig(apiOptions, key, value);
    setConfigs((current) => upsertConfigValue(current, key, value));
    onShowToast(message);
  };

  /**
   * Toggles a switch-like config while preserving JSON values when possible.
   */
  const handleToggleConfig = async (definition: SystemConfigCardDefinition): Promise<void> => {
    const currentValue = configMap.get(definition.key) ?? '';
    const nextValue = createToggledConfigValue(currentValue, !readConfigEnabled(currentValue));

    await handleUpdateConfig(definition.key, nextValue, `${definition.title}已${readConfigEnabled(nextValue) ? '开启' : '关闭'}`);
  };

  /**
   * Opens the raw config editor for API/path/advanced values.
   */
  const handleOpenConfigEditor = (definition: SystemConfigCardDefinition): void => {
    setEditingConfig(definition);
    setEditingValue(configMap.get(definition.key) ?? '');
  };

  /**
   * Saves the raw config editor without changing the server-side value shape.
   */
  const handleSaveEditingConfig = async (): Promise<void> => {
    if (!editingConfig) {
      return;
    }

    await runSystemAction(`config-${editingConfig.key}`, async () => {
      await updateAdminSystemConfig(apiOptions, editingConfig.key, editingValue.trim());
      setConfigs((current) => upsertConfigValue(current, editingConfig.key, editingValue.trim()));
      setEditingConfig(undefined);
      return `${editingConfig.title}已保存`;
    });
  };

  return (
    <div className="admin-panel system-config-panel">
      <div className="section-heading">
        <div>
          <h3>系统配置</h3>
          <p>系统语言、图库扫描设置、识别能力、媒体处理、数据库、授权和系统信息。</p>
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

      <section className="admin-section system-config-hero">
        <div>
          <strong>图库扫描与设置</strong>
          <span>排除规则、RAW/JPG 合并、XMP、视频预览等扫描配置。</span>
        </div>
        <button className="primary-btn" onClick={() => setScanSettingsOpen(true)} type="button">
          <Settings2 size={15} />
          图库扫描与设置
        </button>
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>显示语言</strong>
          <span>当前：{getLanguageLabel(currentLanguage)}</span>
        </div>
        <div className="system-language-row">
          {SYSTEM_LANGUAGE_OPTIONS.map((option) => (
            <button
              className={currentLanguage === option.value ? 'is-active' : ''}
              key={option.value}
              onClick={() => void handleUpdateConfig(ADMIN_SYSTEM_CONFIG_KEYS.systemLanguage, option.value, '显示语言已保存')}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {SYSTEM_CONFIG_GROUPS.map((group) => (
        <section className="admin-section" key={group.title}>
          <div className="admin-section__title">
            <strong>{group.title}</strong>
            <span>{group.description}</span>
          </div>
          <div className="system-config-card-grid">
            {group.items.map((definition) => (
              <SystemConfigCard
                definition={definition}
                key={definition.key}
                value={configMap.get(definition.key) ?? ''}
                onEdit={() => handleOpenConfigEditor(definition)}
                onToggle={definition.switchable ? () => void handleToggleConfig(definition) : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>数据库备份与索引</strong>
          <span>{databaseInfo ? `${databaseInfo.current}/${databaseInfo.total}` : '索引状态未返回'}</span>
        </div>
        <div className="system-action-grid">
          <SystemActionButton
            icon={<Database size={15} />}
            label="生成数据库备份"
            loading={submittingAction === 'db-backup'}
            onClick={() => void runSystemAction('db-backup', async () => {
              const path = await createAdminDatabaseBackup(apiOptions);

              setBackupPath(path ?? '');
              return path ? `数据库备份已生成：${path}` : '数据库备份已生成';
            })}
          />
          <SystemActionButton
            icon={<Wrench size={15} />}
            label="重建数据库索引"
            loading={submittingAction === 'db-index'}
            onClick={() => void runSystemAction('db-index', async () => {
              await rebuildAdminDatabaseIndex(apiOptions);
              setDatabaseInfo(await fetchAdminDatabaseReindexInfo(apiOptions).catch(() => undefined));
              return '数据库索引重建已提交';
            })}
          />
          <SystemActionButton
            icon={<Wrench size={15} />}
            label="重建时区索引"
            loading={submittingAction === 'db-tz'}
            onClick={() => void runSystemAction('db-tz', async () => {
              await rebuildAdminDatabaseTimezoneIndex(apiOptions);
              return '时区相关索引重建已提交';
            })}
          />
          <SystemActionButton
            icon={<Sparkles size={15} />}
            label="准备 CLIP 表"
            loading={submittingAction === 'clip-table'}
            onClick={() => void runSystemAction('clip-table', async () => {
              await prepareAdminClipTable(apiOptions);
              return 'CLIP 数据表已准备';
            })}
          />
          <SystemActionButton
            icon={<ShieldCheck size={15} />}
            label="准备人脸 V2 表"
            loading={submittingAction === 'face-table'}
            onClick={() => void runSystemAction('face-table', async () => {
              await prepareAdminFaceRegV2Table(apiOptions);
              return '人脸识别 V2 数据表已准备';
            })}
          />
          <SystemActionButton
            icon={<ShieldCheck size={15} />}
            label="切换人脸 V2"
            loading={submittingAction === 'face-v2'}
            onClick={() => void runSystemAction('face-v2', async () => {
              await switchAdminFaceRegV2(apiOptions, true);
              return '人脸识别 V2 已切换';
            })}
          />
        </div>
        {backupPath ? <div className="system-config-note">备份文件：{backupPath}</div> : null}
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>系统升级</strong>
          <span>接口文档当前暴露手动升级、重载服务和 libheif 版本信息。</span>
        </div>
        <div className="system-action-grid">
          <SystemActionButton
            icon={<UploadCloud size={15} />}
            label="手动升级"
            loading={submittingAction === 'upgrade'}
            onClick={() => void runSystemAction('upgrade', async () => {
              await runAdminManualUpgrade(apiOptions);
              return '手动升级已触发';
            })}
          />
          <SystemActionButton
            icon={<RefreshCw size={15} />}
            label="重载服务"
            loading={submittingAction === 'reload'}
            onClick={() => void runSystemAction('reload', async () => {
              await reloadAdminServer(apiOptions);
              return '服务重载已触发';
            })}
          />
        </div>
        <InfoList emptyText="当前服务没有返回 libheif 版本信息。" items={libheifItems} />
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>授权信息</strong>
          <span>{licenseItems.length} 项</span>
        </div>
        <div className="system-license-form">
          <select value={licenseMode} onChange={(event) => setLicenseMode(event.target.value as 'offline' | 'online')}>
            <option value="online">在线激活码</option>
            <option value="offline">离线激活码</option>
          </select>
          <input
            onChange={(event) => setLicenseInput(event.target.value)}
            placeholder="输入激活码"
            value={licenseInput}
          />
          <button
            className="primary-btn"
            disabled={!licenseInput.trim() || submittingAction === 'license-bind'}
            onClick={() => void runSystemAction('license-bind', async () => {
              await bindAdminLicense(apiOptions, licenseInput.trim(), licenseMode === 'offline' ? 'offline' : undefined);
              setLicenseInput('');
              setLicenseItems(await fetchAdminLicenseInfo(apiOptions).catch(() => []));
              return '授权信息已提交';
            })}
            type="button"
          >
            <KeyRound size={15} />
            绑定授权
          </button>
        </div>
        <div className="admin-inline-actions">
          <button
            className="secondary-btn"
            disabled={submittingAction === 'offline-id'}
            onClick={() => void runSystemAction('offline-id', async () => {
              const id = await fetchAdminOfflineId(apiOptions);

              setOfflineId(id);
              return id ? '离线 ID 已获取' : '服务端未返回离线 ID';
            })}
            type="button"
          >
            获取离线 ID
          </button>
          <button
            className="secondary-btn"
            disabled={submittingAction === 'license-verify'}
            onClick={() => void runSystemAction('license-verify', async () => {
              await verifyAdminLicenseOnline(apiOptions);
              setLicenseItems(await fetchAdminLicenseInfo(apiOptions).catch(() => []));
              return '联网验证已触发';
            })}
            type="button"
          >
            联网验证授权
          </button>
        </div>
        {offlineId ? <div className="system-config-note">离线 ID：{offlineId}</div> : null}
        <InfoList emptyText="当前服务没有返回授权信息。" items={licenseItems} />
      </section>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>系统日志</strong>
          <span>{logs.length} 条</span>
        </div>
        <div className="admin-inline-actions">
          <button
            className="secondary-btn"
            disabled={submittingAction === 'logs-refresh'}
            onClick={() => void runSystemAction('logs-refresh', async () => {
              setLogs(await fetchAdminSystemLogs(apiOptions));
              return '系统日志已刷新';
            })}
            type="button"
          >
            刷新日志
          </button>
          <button
            className="secondary-btn is-danger-soft"
            disabled={submittingAction === 'logs-clear'}
            onClick={() => void runSystemAction('logs-clear', async () => {
              await clearAdminSystemLogs(apiOptions);
              setLogs([]);
              return '系统日志已清空';
            })}
            type="button"
          >
            清空日志
          </button>
        </div>
        <SystemLogList logs={logs} />
      </section>

      <div className="admin-info-grid">
        <InfoItem label="服务地址" value={serverUrl} />
        <InfoItem label="API 版本" value={`${apiInfo?.version ?? 'unknown'}${apiInfo?.build ? ` #${apiInfo.build}` : ''}`} />
        <InfoItem label="运行环境" value={getRuntimeLabel()} />
        <InfoItem label="在线状态" value={navigator.onLine ? '在线' : '离线'} />
        <InfoItem label="当前用户" value={user?.username ?? '-'} />
        <InfoItem label="缓存后端" value={storageInfo?.label ?? '-'} />
        <InfoItem label="CPU 线程" value={String(configInfo?.cpuThreadNum ?? '-')} />
        <InfoItem label="任务线程" value={String(configInfo?.taskMaxThreadNum ?? '-')} />
        <InfoItem label="数据库时区" value={configInfo?.dbTZ ?? '-'} />
        <InfoItem label="缓存目录" value={storageInfo?.rootPath ?? storageInfo?.description ?? '-'} wide />
        <InfoItem label="索引文件" value={storageInfo?.indexPath ?? '-'} wide />
      </div>

      <section className="admin-section">
        <div className="admin-section__title">
          <strong>服务端状态</strong>
          <span>{loading ? '正在刷新' : `${statusItems.length} 项`}</span>
        </div>
        <InfoList emptyText="当前服务没有返回服务端状态，或接口暂不可用。" items={statusItems} />
      </section>

      <AdminGalleryScanSettingsDialog
        apiOptions={apiOptions}
        open={scanSettingsOpen}
        onClose={() => setScanSettingsOpen(false)}
        onSaved={onShowToast}
      />

      <Modal
        asForm
        onSubmit={() => void handleSaveEditingConfig()}
        className="system-config-dialog"
        footer={(
          <div className="dialog-actions">
            <button className="secondary-btn" onClick={() => setEditingConfig(undefined)} type="button">取消</button>
            <button
              className="primary-btn"
              disabled={Boolean(editingConfig && submittingAction === `config-${editingConfig.key}`)}
              type="submit"
            >
              <Save size={15} />
              保存
            </button>
          </div>
        )}
        open={Boolean(editingConfig)}
        title={editingConfig?.title ?? '编辑系统配置'}
        onClose={() => setEditingConfig(undefined)}
      >
        <label className="system-config-field">
          <span>{editingConfig?.key}</span>
          <textarea
            onChange={(event) => setEditingValue(event.target.value)}
            placeholder="可以填写 JSON、路径、token 或开关值"
            rows={8}
            value={editingValue}
          />
        </label>
        <div className="system-config-note">{editingConfig?.description}</div>
      </Modal>
    </div>
  );
};

const SystemConfigCard = ({
  definition,
  value,
  onEdit,
  onToggle,
}: {
  definition: SystemConfigCardDefinition;
  value: string;
  onEdit: () => void;
  onToggle?: () => void;
}) => {
  const enabled = readConfigEnabled(value);
  const Icon = definition.icon;

  return (
    <article className="system-config-card">
      <div className="system-config-card__icon">
        <Icon size={17} />
      </div>
      <div className="system-config-card__copy">
        <strong>{definition.title}</strong>
        <span>{definition.description}</span>
        <em>{summarizeConfigValue(value)}</em>
      </div>
      <div className="system-config-card__actions">
        <span className={enabled ? 'admin-status-pill is-success' : 'admin-status-pill'}>
          {enabled ? '已配置' : '未配置'}
        </span>
        {onToggle ? (
          <button className="secondary-btn" onClick={onToggle} type="button">
            {enabled ? '关闭' : '开启'}
          </button>
        ) : null}
        <button className="secondary-btn" onClick={onEdit} type="button">
          <Settings2 size={15} />
          {value ? '编辑' : '添加配置'}
        </button>
      </div>
    </article>
  );
};

const SystemActionButton = ({
  icon,
  label,
  loading,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) => (
  <button className="secondary-btn" disabled={loading} onClick={onClick} type="button">
    {icon}
    {loading ? '执行中...' : label}
  </button>
);

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
        <InfoItem key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
      ))}
    </div>
  );
};

const SystemLogList = ({ logs }: { logs: AdminLogRecord[] }) => {
  if (logs.length === 0) {
    return <div className="admin-state compact">当前没有系统日志。</div>;
  }

  return (
    <div className="system-log-list">
      {logs.slice(0, 10).map((log, index) => (
        <article className="system-log-row" key={`${log.timestamp ?? index}-${log.message}`}>
          <strong>{log.level}</strong>
          <span>{log.message}</span>
          <em>{formatAdminDateTime(log.timestamp)}</em>
        </article>
      ))}
    </div>
  );
};

/**
 * Inserts or replaces one config record while preserving metadata already loaded from the server.
 */
const upsertConfigValue = (
  configs: AdminSystemConfigRecord[],
  key: string,
  value: string,
): AdminSystemConfigRecord[] => {
  const exists = configs.some((config) => config.key === key);

  if (!exists) {
    return [...configs, { key, value }];
  }

  return configs.map((config) => (config.key === key ? { ...config, value } : config));
};

/**
 * Reads a demo-style config switch from raw strings or JSON payloads.
 */
const readConfigEnabled = (value?: string): boolean => {
  const rawValue = value?.trim() ?? '';

  if (!rawValue || ['0', 'false', 'off', 'null', 'undefined', '{}', '[]'].includes(rawValue.toLowerCase())) {
    return false;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (typeof parsedValue === 'boolean') {
      return parsedValue;
    }

    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      const record = parsedValue as Record<string, unknown>;

      if (typeof record.enable === 'boolean') {
        return record.enable;
      }

      if (typeof record.enabled === 'boolean') {
        return record.enabled;
      }

      return Object.keys(record).length > 0;
    }

    if (Array.isArray(parsedValue)) {
      return parsedValue.length > 0;
    }
  } catch {
    return true;
  }

  return true;
};

/**
 * Toggles a system-config value without destroying structured JSON settings.
 */
const createToggledConfigValue = (value: string, enabled: boolean): string => {
  const rawValue = value.trim();
  const lowerValue = rawValue.toLowerCase();

  if (['0', '1'].includes(rawValue)) {
    return enabled ? '1' : '0';
  }

  if (['true', 'false'].includes(lowerValue)) {
    return enabled ? 'true' : 'false';
  }

  if (rawValue) {
    try {
      const parsedValue = JSON.parse(rawValue) as unknown;

      if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
        return JSON.stringify({ ...(parsedValue as Record<string, unknown>), enable: enabled });
      }
    } catch {
      return enabled ? rawValue : 'false';
    }
  }

  return enabled ? 'true' : 'false';
};

const summarizeConfigValue = (value: string): string => {
  const rawValue = value.trim();

  if (!rawValue) {
    return '未配置';
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (parsedValue && typeof parsedValue === 'object' && !Array.isArray(parsedValue)) {
      const record = parsedValue as Record<string, unknown>;
      const summaryKeys = ['type', 'apiType', 'model', 'host', 'baseUrl', 'folderPath', 'path', 'key', 'api_key'];
      const parts = summaryKeys
        .filter((key) => record[key] !== undefined && record[key] !== '')
        .slice(0, 3)
        .map((key) => `${key}: ${maskConfigText(String(record[key]))}`);

      return parts.length > 0 ? parts.join(' · ') : 'JSON 配置已填写';
    }

    if (Array.isArray(parsedValue)) {
      return `${parsedValue.length} 项配置`;
    }
  } catch {
    return maskConfigText(rawValue);
  }

  return maskConfigText(rawValue);
};

const maskConfigText = (value: string): string => {
  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const normalizeLanguageValue = (value?: string): string => {
  const rawValue = value?.trim();

  if (!rawValue) {
    return 'zh-CN';
  }

  const normalizedValue = rawValue.replace('_', '-').toLowerCase();

  if (normalizedValue.startsWith('zh-tw') || normalizedValue.startsWith('zh-hk')) {
    return 'zh-TW';
  }

  if (normalizedValue.startsWith('en')) {
    return 'en';
  }

  return 'zh-CN';
};

const getLanguageLabel = (value: string): string => {
  return SYSTEM_LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ?? '简体中文';
};
