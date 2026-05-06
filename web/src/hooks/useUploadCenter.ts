import type { MutableRefObject } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { fetchFolderDirectory, fetchRootFolders } from '../services/folders-service';
import { scanAfterUpload, uploadFileToFolder } from '../services/upload-service';
import type { FolderDirectory, UploadTarget, UploadTask } from '../shared/types';
import { useSessionStore } from '../stores/session-store';

interface UseUploadCenterOptions {
  onShowToast: (message: string) => void;
  refresh: () => Promise<string | undefined>;
  serverUrl: string;
}

/**
 * Owns upload-center queue state, target picking and post-upload refresh signals.
 */
export const useUploadCenter = ({ onShowToast, refresh, serverUrl }: UseUploadCenterOptions) => {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [target, setTarget] = useState<UploadTarget>();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [targetPickerDirectory, setTargetPickerDirectory] = useState<FolderDirectory>(() => createEmptyDirectory());
  const [targetPickerError, setTargetPickerError] = useState('');
  const [targetPickerLoading, setTargetPickerLoading] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const taskIdRef = useRef(0);

  /**
   * Builds auth-aware request options from the latest session token.
   */
  const getApiOptions = useCallback(
    () => ({
      baseUrl: serverUrl,
      getAccessToken: () => useSessionStore.getState().tokens?.accessToken,
      onUnauthorized: refresh,
    }),
    [refresh, serverUrl],
  );

  /**
   * Applies a partial status update to one upload task.
   */
  const updateTask = useCallback((taskId: number, patch: Partial<UploadTask>): void => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  }, []);

  /**
   * Runs queued upload tasks one by one, then asks the server to scan the target folder.
   */
  const runBatch = useCallback(
    async (nextTasks: UploadTask[], batchTarget?: UploadTarget): Promise<void> => {
      let hasUploadedFile = false;
      let scanTarget = batchTarget;

      for (const task of nextTasks) {
        try {
          updateTask(task.id, { progress: 1, state: 'checking', status: '检查重复' });
          const result = await uploadFileToFolder(getApiOptions(), {
            file: task.file,
            onProgress: ({ progress, status }) => {
              updateTask(task.id, {
                progress,
                state: getUploadTaskStateFromStatus(status),
                status,
              });
            },
            target: scanTarget,
          });

          hasUploadedFile = true;
          scanTarget = result.target ?? scanTarget;
          updateTask(task.id, {
            fileId: result.fileId,
            progress: 100,
            state: result.skipped ? 'skipped' : 'done',
            status: result.skipped ? '已跳过' : '上传完成',
            target: result.target ?? task.target,
            targetPath: result.target?.path ?? task.targetPath,
          });
        } catch (error) {
          updateTask(task.id, {
            error: getErrorMessage(error),
            progress: 100,
            state: 'failed',
            status: '失败',
          });
        }
      }

      if (!hasUploadedFile) {
        return;
      }

      try {
        setTasks((current) =>
          current.map((task) =>
            nextTasks.some((item) => item.id === task.id) && !['failed', 'skipped'].includes(task.state)
              ? { ...task, state: 'scanning', status: '扫描中' }
              : task,
          ),
        );
        await scanAfterUpload(getApiOptions(), scanTarget);
        setTasks((current) =>
          current.map((task) =>
            nextTasks.some((item) => item.id === task.id) && task.state === 'scanning'
              ? { ...task, state: 'done', status: '扫描完成' }
              : task,
          ),
        );
        setRefreshKey((current) => current + 1);
        onShowToast('上传完成，已触发扫描');
      } catch (error) {
        onShowToast(`上传完成，但扫描触发失败：${getErrorMessage(error)}`);
      }
    },
    [getApiOptions, onShowToast, updateTask],
  );

  /**
   * Opens upload center and optionally binds it to one folder.
   */
  const openUpload = useCallback((nextTarget?: UploadTarget): void => {
    setTarget(nextTarget);
    setOpen(true);
  }, []);

  /**
   * Closes the upload center and its nested target picker.
   */
  const closeUpload = useCallback((): void => {
    setOpen(false);
    setTargetPickerOpen(false);
  }, []);

  /**
   * Loads one folder level for manual upload target selection.
   */
  const loadTargetPickerDirectory = useCallback(
    async (folderId?: number): Promise<void> => {
      setTargetPickerError('');
      setTargetPickerLoading(true);

      try {
        const directory = folderId
          ? await fetchFolderDirectory(getApiOptions(), folderId)
          : await fetchRootFolders(getApiOptions());

        setTargetPickerDirectory(directory);
      } catch (error) {
        setTargetPickerError(getErrorMessage(error));
      } finally {
        setTargetPickerLoading(false);
      }
    },
    [getApiOptions],
  );

  /**
   * Opens the manual upload target picker from the active target when possible.
   */
  const openTargetPicker = useCallback((): void => {
    setTargetPickerOpen(true);
    void loadTargetPickerDirectory(target?.folderId);
  }, [loadTargetPickerDirectory, target?.folderId]);

  /**
   * Applies a manually selected upload target to future queued files.
   */
  const selectTarget = useCallback((nextTarget?: UploadTarget): void => {
    setTarget(nextTarget);
    setTargetPickerOpen(false);
  }, []);

  /**
   * Adds selected files to the upload queue and starts a batch immediately.
   */
  const queueFiles = useCallback(
    (files: File[]): void => {
      if (files.length === 0) {
        return;
      }

      const nextTasks = files.map((file) => createUploadTask(file, target, taskIdRef));

      setTasks((current) => [...nextTasks, ...current]);
      void runBatch(nextTasks, target);
    },
    [runBatch, target],
  );

  /**
   * Retries one failed upload task with its original target.
   */
  const retryTask = useCallback(
    (task: UploadTask): void => {
      const retryUploadTask: UploadTask = {
        ...task,
        error: undefined,
        progress: 0,
        state: 'queued',
        status: '等待上传',
      };

      setTasks((current) => current.map((item) => (item.id === task.id ? retryUploadTask : item)));
      void runBatch([retryUploadTask], retryUploadTask.target);
    },
    [runBatch],
  );

  /**
   * Removes successful or skipped tasks from the upload center.
   */
  const clearFinished = useCallback((): void => {
    setTasks((current) => current.filter((task) => !['done', 'skipped'].includes(task.state)));
  }, []);

  const drawerProps = useMemo(
    () => ({
      onClearFinished: clearFinished,
      onClose: closeUpload,
      onCloseTargetPicker: () => setTargetPickerOpen(false),
      onOpenTargetFolder: (folderId: number) => void loadTargetPickerDirectory(folderId),
      onOpenTargetPicker: openTargetPicker,
      onOpenTargetRoot: () => void loadTargetPickerDirectory(),
      onQueueFiles: queueFiles,
      onRetryTask: retryTask,
      onSelectTarget: selectTarget,
      open,
      target,
      targetPickerDirectory,
      targetPickerError,
      targetPickerLoading,
      targetPickerOpen,
      tasks,
    }),
    [
      clearFinished,
      closeUpload,
      loadTargetPickerDirectory,
      open,
      openTargetPicker,
      queueFiles,
      retryTask,
      selectTarget,
      target,
      targetPickerDirectory,
      targetPickerError,
      targetPickerLoading,
      targetPickerOpen,
      tasks,
    ],
  );

  return {
    closeUpload,
    drawerProps,
    openUpload,
    refreshKey,
  };
};

/**
 * Creates a stable empty directory model for folder-picker initial state.
 */
const createEmptyDirectory = (): FolderDirectory => {
  return {
    breadcrumbs: [],
    files: [],
    folders: [],
    path: '',
    trashCount: 0,
  };
};

/**
 * Creates a UI queue item from a browser File object.
 */
const createUploadTask = (file: File, target: UploadTarget | undefined, taskIdRef: MutableRefObject<number>): UploadTask => {
  taskIdRef.current += 1;

  return {
    file,
    id: taskIdRef.current,
    name: file.name,
    progress: 0,
    sizeLabel: formatUploadFileSize(file.size),
    state: 'queued',
    status: '等待上传',
    target,
    targetPath: target?.path,
  };
};

/**
 * Converts service progress copy into a queue state for visual styling.
 */
const getUploadTaskStateFromStatus = (status: string): UploadTask['state'] => {
  if (status.includes('检查')) {
    return 'checking';
  }

  if (status.includes('扫描') || status.includes('等待扫描')) {
    return 'scanning';
  }

  return 'uploading';
};

/**
 * Formats bytes for upload queue rows.
 */
const formatUploadFileSize = (size: number): string => {
  if (size <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** unitIndex;

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
};

/**
 * Returns a safe message for upload and scan failures.
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return '操作失败，请稍后重试。';
};
