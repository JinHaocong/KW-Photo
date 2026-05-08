import { ChevronLeft, Folder, FolderPlus, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchAdminGalleryRootDirs,
  fetchAdminGallerySubDirs,
} from '../../services/admin-service';
import type {
  AdminGallery,
  AdminGalleryMutationPayload,
  AdminGalleryUserLink,
  AdminUserRecord,
} from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import type { CurrentUser } from '../../shared/types';
import { Modal } from '../Modal';

interface AdminGalleryEditorDialogProps {
  apiOptions: ApiClientOptions;
  currentUser?: CurrentUser;
  gallery?: AdminGallery;
  open: boolean;
  submitting: boolean;
  userLinks: AdminGalleryUserLink[];
  users: AdminUserRecord[];
  onClose: () => void;
  onSubmit: (payload: AdminGalleryMutationPayload, gallery?: AdminGallery) => Promise<void>;
}

interface GalleryEditorState {
  adminOnly: boolean;
  folderInput: string;
  folders: string[];
  funcExclude: string[];
  hidden: boolean;
  name: string;
  selectedUserIds: string[];
  weights: string;
}

const RECOGNITION_TASKS = [
  { label: '人脸识别', value: 'face' },
  { label: 'CLIP识别', value: 'CLIP' },
  { label: '文本识别', value: 'ocr' },
  { label: '场景识别', value: 'category' },
  { label: '相似识别', value: 'similar' },
];

/**
 * Edits a gallery using the server's CreateGalleryDto/UpdateGalleryDto fields.
 */
export const AdminGalleryEditorDialog = ({
  apiOptions,
  currentUser,
  gallery,
  open,
  submitting,
  userLinks,
  users,
  onClose,
  onSubmit,
}: AdminGalleryEditorDialogProps) => {
  const [availableDirs, setAvailableDirs] = useState<string[]>([]);
  const [dirError, setDirError] = useState('');
  const [dirLoading, setDirLoading] = useState(false);
  const [dirPath, setDirPath] = useState('');
  const [formError, setFormError] = useState('');
  const [state, setState] = useState<GalleryEditorState>(() => createInitialState(gallery, users, userLinks, currentUser));
  const editorTitle = gallery ? '管理图库' : '添加图库';
  const visibleUsers = useMemo(
    () => mergeCurrentUser(users, currentUser),
    [currentUser, users],
  );

  const loadDirectories = useCallback(async (path?: string): Promise<void> => {
    setDirError('');
    setDirLoading(true);

    try {
      const dirs = path
        ? await fetchAdminGallerySubDirs(apiOptions, path)
        : await fetchAdminGalleryRootDirs(apiOptions);

      setAvailableDirs(dirs);
      setDirPath(path ?? '');
    } catch (requestError) {
      setAvailableDirs([]);
      setDirError(getApiErrorMessage(requestError));
    } finally {
      setDirLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError('');
    setState(createInitialState(gallery, users, userLinks, currentUser));
    void loadDirectories();
  }, [currentUser, gallery, loadDirectories, open, userLinks, users]);

  /**
   * Appends one path once, keeping the dialog resilient to repeated taps on mobile.
   */
  const addFolder = (folderPath: string): void => {
    const nextPath = folderPath.trim();

    if (!nextPath) {
      return;
    }

    setState((current) => ({
      ...current,
      folderInput: '',
      folders: current.folders.includes(nextPath) ? current.folders : [...current.folders, nextPath],
    }));
  };

  /**
   * Validates user input and submits exactly the gallery DTO shape expected by the API.
   */
  const handleSubmit = async (): Promise<void> => {
    const name = state.name.trim();
    const folders = state.folders.map((folder) => folder.trim()).filter(Boolean);
    const weights = state.weights.trim() ? Number(state.weights) : undefined;
    const selectedUserIds = state.selectedUserIds
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (!name) {
      setFormError('请填写图库显示名称。');
      return;
    }

    if (folders.length === 0) {
      setFormError('请至少添加一个图库文件夹。');
      return;
    }

    if (weights !== undefined && !Number.isFinite(weights)) {
      setFormError('排序权重必须是数字。');
      return;
    }

    setFormError('');
    await onSubmit({
      fileDeleteOnlyAdmin: state.adminOnly,
      folders,
      func_exclude: state.funcExclude,
      hide: state.hidden,
      name,
      userIds: selectedUserIds.length === 1 ? selectedUserIds[0] : selectedUserIds,
      weights,
    }, gallery);
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      className="gallery-editor-dialog"
      footer={
        <div className="dialog-actions">
          <button className="secondary-btn" disabled={submitting} onClick={onClose} type="button">
            取消
          </button>
          <button className="primary-btn" disabled={submitting} onClick={() => void handleSubmit()} type="button">
            {submitting ? '保存中...' : '确定'}
          </button>
        </div>
      }
      onClose={onClose}
      open={true}
      title={editorTitle}
    >
      <p>{gallery ? `${gallery.name} · 调整文件夹、用户和识别任务` : '创建一个新的图库入口并绑定文件夹。'}</p>

      <div className="gallery-editor-grid">
          <label className="settings-field">
            <span>显示名称</span>
            <input
              autoFocus
              onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))}
              placeholder="例如 Luolcy-2604"
              value={state.name}
            />
          </label>

          <label className="settings-field">
            <span>排序权重</span>
            <input
              inputMode="numeric"
              onChange={(event) => setState((current) => ({ ...current, weights: event.target.value }))}
              placeholder="数字越大越靠前"
              value={state.weights}
            />
          </label>
        </div>

        <div className="gallery-editor-checks">
          <label>
            <input
              checked={state.adminOnly}
              onChange={(event) => setState((current) => ({ ...current, adminOnly: event.target.checked }))}
              type="checkbox"
            />
            仅管理员有权限修改或删除该图库的照片
          </label>
          <label>
            <input
              checked={state.hidden}
              onChange={(event) => setState((current) => ({ ...current, hidden: event.target.checked }))}
              type="checkbox"
            />
            在普通图库列表中隐藏
          </label>
        </div>

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>图库包含的文件夹</strong>
            <span>{state.folders.length} 个目录</span>
          </div>

          <div className="gallery-folder-input">
            <input
              onChange={(event) => setState((current) => ({ ...current, folderInput: event.target.value }))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addFolder(state.folderInput);
                }
              }}
              placeholder="/photos/2604"
              value={state.folderInput}
            />
            <button className="secondary-btn" onClick={() => addFolder(state.folderInput)} type="button">
              <Plus size={15} />
              添加
            </button>
          </div>

          <div className="gallery-folder-selected">
            {state.folders.length === 0 ? <span>还没有添加文件夹。</span> : null}
            {state.folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setState((current) => ({
                  ...current,
                  folders: current.folders.filter((item) => item !== folder),
                }))}
                title="移除该目录"
                type="button"
              >
                <Folder size={14} />
                <span>{folder}</span>
                <Trash2 size={13} />
              </button>
            ))}
          </div>

          <div className="gallery-dir-browser">
            <div className="gallery-dir-browser__bar">
              <button
                className="secondary-btn"
                disabled={!dirPath || dirLoading}
                onClick={() => void loadDirectories(getParentPath(dirPath))}
                type="button"
              >
                <ChevronLeft size={15} />
                上级
              </button>
              <span title={dirPath || '根目录'}>{dirPath || '根目录'}</span>
            </div>
            {dirError ? <div className="admin-error compact">{dirError}</div> : null}
            <div className="gallery-dir-list">
              {dirLoading ? <div className="admin-state compact">正在读取目录...</div> : null}
              {!dirLoading && availableDirs.length === 0 ? <div className="admin-state compact">暂无可选目录。</div> : null}
              {availableDirs.map((folderPath) => (
                <div className="gallery-dir-row" key={folderPath}>
                  <button onClick={() => void loadDirectories(folderPath)} title={folderPath} type="button">
                    <Folder size={16} />
                    <span>{getFolderName(folderPath)}</span>
                  </button>
                  <button
                    aria-label={`添加 ${folderPath}`}
                    className="icon-btn"
                    onClick={() => addFolder(folderPath)}
                    type="button"
                  >
                    <FolderPlus size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>可使用该图库的用户</strong>
            <span>{state.selectedUserIds.length}/{visibleUsers.length}</span>
          </div>
          <div className="gallery-editor-user-grid">
            {visibleUsers.map((user) => {
              const userKey = String(user.id ?? user.username);
              const disabled = !Number.isFinite(Number(user.id));

              return (
                <label key={userKey}>
                  <input
                    checked={state.selectedUserIds.includes(userKey)}
                    disabled={disabled}
                    onChange={() => setState((current) => ({
                      ...current,
                      selectedUserIds: toggleListValue(current.selectedUserIds, userKey),
                    }))}
                    type="checkbox"
                  />
                  <span>{user.username}</span>
                  <small>{user.roleLabel}</small>
                </label>
              );
            })}
          </div>
        </section>

        <section className="gallery-editor-section">
          <div className="gallery-editor-section__title">
            <strong>设置该图库需要排除的识别任务</strong>
            <span>处理对应任务时会跳过该图库</span>
          </div>
          <div className="gallery-editor-task-grid">
            {RECOGNITION_TASKS.map((task) => (
              <label key={task.value}>
                <input
                  checked={state.funcExclude.includes(task.value)}
                  onChange={() => setState((current) => ({
                    ...current,
                    funcExclude: toggleListValue(current.funcExclude, task.value),
                  }))}
                  type="checkbox"
                />
                {task.label}
              </label>
            ))}
          </div>
        </section>

        {formError ? <div className="form-error">{formError}</div> : null}
    </Modal>
  );
};

const createInitialState = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): GalleryEditorState => {
  const selectedUserIds = getSelectedUserIds(gallery, users, userLinks, currentUser);

  return {
    adminOnly: gallery?.adminOnly ?? false,
    folderInput: '',
    folders: gallery?.folders.map((folder) => folder.path).filter(Boolean) ?? [],
    funcExclude: gallery?.funcExclude ?? [],
    hidden: gallery?.hidden ?? false,
    name: gallery?.name ?? '',
    selectedUserIds,
    weights: gallery?.weights === undefined ? '' : String(gallery.weights),
  };
};

const getSelectedUserIds = (
  gallery: AdminGallery | undefined,
  users: AdminUserRecord[],
  userLinks: AdminGalleryUserLink[],
  currentUser?: CurrentUser,
): string[] => {
  if (gallery?.id !== undefined) {
    const linkedIds = userLinks
      .filter((link) => String(link.galleryId) === String(gallery.id))
      .map((link) => String(link.userId));

    if (linkedIds.length > 0) {
      return linkedIds;
    }
  }

  if (currentUser?.id) {
    return [String(currentUser.id)];
  }

  return users[0]?.id === undefined ? [] : [String(users[0].id)];
};

const mergeCurrentUser = (
  users: AdminUserRecord[],
  currentUser?: CurrentUser,
): AdminUserRecord[] => {
  if (!currentUser) {
    return users;
  }

  const hasCurrentUser = users.some((user) => String(user.id) === String(currentUser.id));

  if (hasCurrentUser) {
    return users;
  }

  return [
    {
      id: currentUser.id,
      roleLabel: currentUser.isSuperAdmin ? '超级管理员' : currentUser.isAdmin ? '管理员' : '普通用户',
      securityLabel: currentUser.otpEnable ? '已开启 2FA' : '未开启 2FA',
      username: currentUser.username,
    },
    ...users,
  ];
};

const toggleListValue = (values: string[], value: string): string[] => {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
};

const getParentPath = (path: string): string => {
  const parentPath = path.split(/[\\/]/).filter(Boolean).slice(0, -1).join('/');

  return path.startsWith('/') && parentPath ? `/${parentPath}` : parentPath;
};

const getFolderName = (path: string): string => {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
};
