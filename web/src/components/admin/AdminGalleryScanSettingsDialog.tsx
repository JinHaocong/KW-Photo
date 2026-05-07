import { FileType, Save, Settings2, Tags, ToggleLeft, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  fetchAdminGalleryScanSettings,
  updateAdminGalleryScanSettings,
} from '../../services/admin-service';
import type { AdminGalleryScanSettings } from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import { Modal } from '../Modal';

interface AdminGalleryScanSettingsDialogProps {
  apiOptions: ApiClientOptions;
  open: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

type ScanSettingSwitchKey = keyof Pick<
  AdminGalleryScanSettings,
  'mergeJpgRaw' | 'rawGenThumbSolo' | 'readXmp' | 'useXmp' | 'videoPreview'
>;

const EMPTY_SCAN_SETTINGS: AdminGalleryScanSettings = {
  excludeFileNamePrefixes: [],
  excludeFileTypes: [],
  mergeJpgRaw: true,
  rawGenThumbSolo: false,
  readXmp: true,
  useXmp: true,
  videoPreview: true,
};

const SCAN_SETTING_SWITCHES: Array<{
  description: string;
  key: ScanSettingSwitchKey;
  label: string;
}> = [
  {
    description: '保存 EXIF 信息时同步写入同名 .xmp 文件，降低直接写入原文件失败的风险。',
    key: 'useXmp',
    label: '保存 xmp 文件',
  },
  {
    description: '扫描文件时读取同名 .xmp 中的拍摄日期、备注、评分、标签和位置信息。',
    key: 'readXmp',
    label: '读取 xmp 文件',
  },
  {
    description: '同一文件夹下同名 JPG 与 RAW 文件合并显示，修改后需重新扫描图库。',
    key: 'mergeJpgRaw',
    label: '合并显示 jpg 和 raw 文件',
  },
  {
    description: '合并显示后仍为 RAW 文件单独生成缩略图；关闭时 RAW 与 JPG 共用缩略图。',
    key: 'rawGenThumbSolo',
    label: 'raw 文件单独生成缩略图',
  },
  {
    description: '为视频生成前 5 秒预览，便于列表悬停或移动端预览播放。',
    key: 'videoPreview',
    label: '生成视频预览图',
  },
];

/**
 * Edits global gallery scan settings exposed by MT Photos system-config APIs.
 */
export const AdminGalleryScanSettingsDialog = ({
  apiOptions,
  open,
  onClose,
  onSaved,
}: AdminGalleryScanSettingsDialogProps) => {
  const [error, setError] = useState('');
  const [fileTypeInput, setFileTypeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefixInput, setPrefixInput] = useState('');
  const [settings, setSettings] = useState<AdminGalleryScanSettings>(EMPTY_SCAN_SETTINGS);
  const [submitting, setSubmitting] = useState(false);
  const disabled = loading || submitting;
  const settingCount = useMemo(() => (
    settings.excludeFileTypes.length
    + settings.excludeFileNamePrefixes.length
    + SCAN_SETTING_SWITCHES.filter((item) => settings[item.key]).length
  ), [settings]);

  const loadSettings = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      setSettings(await fetchAdminGalleryScanSettings(apiOptions));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [loadSettings, open]);

  /**
   * Adds one list item while keeping saved settings deterministic and duplicate-free.
   */
  const addListValue = (
    field: 'excludeFileNamePrefixes' | 'excludeFileTypes',
    value: string,
  ): void => {
    const normalizedValue = field === 'excludeFileTypes' ? normalizeFileType(value) : value.trim();

    if (!normalizedValue) {
      return;
    }

    setSettings((current) => ({
      ...current,
      [field]: current[field].includes(normalizedValue) ? current[field] : [...current[field], normalizedValue],
    }));
  };

  /**
   * Persists all scan switches and exclusion lists in one backend batch.
   */
  const handleSave = async (): Promise<void> => {
    setError('');
    setSubmitting(true);

    try {
      await updateAdminGalleryScanSettings(apiOptions, settings);
      onSaved('图库扫描设置已保存');
      onClose();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      className="gallery-editor-dialog gallery-scan-settings-dialog"
      footer={
        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-btn" disabled={disabled} onClick={() => void handleSave()} type="button">
            <Save size={15} />
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      }
      onClose={onClose}
      open={true}
      title={
        <div className="gallery-editor-dialog__header">
          <div>
            <h3>图库扫描与设置</h3>
            <p>对齐 MT Photos 的全局扫描规则，保存后会影响后续图库扫描和缩略图生成任务。</p>
          </div>
          <button aria-label="关闭图库扫描设置" className="icon-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
      }
    >

        <div className="gallery-scan-settings-summary">
          <span>
            <Settings2 size={15} />
            {loading ? '正在读取服务端设置' : `${settingCount} 项扫描配置`}
          </span>
          <button className="secondary-btn" disabled={disabled} onClick={() => void loadSettings()} type="button">
            刷新
          </button>
        </div>

        {error ? <div className="admin-error compact">{error}</div> : null}

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>扫描时需要排除的文件类型</strong>
            <span>{settings.excludeFileTypes.length} 个扩展名</span>
          </div>
          <ListEditor
            icon={<FileType size={15} />}
            inputValue={fileTypeInput}
            items={settings.excludeFileTypes}
            placeholder=".IIQ"
            onAdd={(value) => {
              addListValue('excludeFileTypes', value);
              setFileTypeInput('');
            }}
            onChangeInput={setFileTypeInput}
            onRemove={(value) => setSettings((current) => ({
              ...current,
              excludeFileTypes: current.excludeFileTypes.filter((item) => item !== value),
            }))}
          />
        </section>

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>扫描时排除包含特定字符的文件</strong>
            <span>{settings.excludeFileNamePrefixes.length} 个规则</span>
          </div>
          <ListEditor
            icon={<Tags size={15} />}
            inputValue={prefixInput}
            items={settings.excludeFileNamePrefixes}
            placeholder="@ 或 ."
            renderItem={(value) => `${value} 开头的文件名`}
            onAdd={(value) => {
              addListValue('excludeFileNamePrefixes', value);
              setPrefixInput('');
            }}
            onChangeInput={setPrefixInput}
            onRemove={(value) => setSettings((current) => ({
              ...current,
              excludeFileNamePrefixes: current.excludeFileNamePrefixes.filter((item) => item !== value),
            }))}
          />
        </section>

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>xmp、raw 与视频预览</strong>
            <span>全局开关</span>
          </div>
          <div className="gallery-scan-switch-grid">
            {SCAN_SETTING_SWITCHES.map((item) => (
              <button
                className={settings[item.key] ? 'is-active' : ''}
                key={item.key}
                onClick={() => setSettings((current) => ({ ...current, [item.key]: !current[item.key] }))}
                type="button"
              >
                <ToggleLeft size={16} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <em>{settings[item.key] ? '已启用' : '未启用'}</em>
              </button>
            ))}
          </div>
        </section>

    </Modal>
  );
};

const ListEditor = ({
  icon,
  inputValue,
  items,
  placeholder,
  renderItem = (value: string) => value,
  onAdd,
  onChangeInput,
  onRemove,
}: {
  icon: ReactNode;
  inputValue: string;
  items: string[];
  placeholder: string;
  renderItem?: (value: string) => string;
  onAdd: (value: string) => void;
  onChangeInput: (value: string) => void;
  onRemove: (value: string) => void;
}) => (
  <div className="gallery-scan-list-editor">
    <div className="gallery-folder-input">
      <input
        onChange={(event) => onChangeInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onAdd(inputValue);
          }
        }}
        placeholder={placeholder}
        value={inputValue}
      />
      <button className="secondary-btn" onClick={() => onAdd(inputValue)} type="button">
        添加
      </button>
    </div>
    <div className="gallery-folder-selected">
      {items.length === 0 ? <span>未配置排除项。</span> : null}
      {items.map((item) => (
        <button key={item} onClick={() => onRemove(item)} title="移除该规则" type="button">
          {icon}
          <span>{renderItem(item)}</span>
          <X size={13} />
        </button>
      ))}
    </div>
  </div>
);

const normalizeFileType = (value: string): string => {
  const fileType = value.trim();

  if (!fileType) {
    return '';
  }

  return fileType.startsWith('.') ? fileType.toUpperCase() : `.${fileType.toUpperCase()}`;
};
